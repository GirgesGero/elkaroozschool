<?php

namespace App\Controllers;

use App\Database\MySQL;
use App\Utils\Response;
use InvalidArgumentException;

class DataApiController
{
    use SafeFailure;

    private MySQL $db;

    // Table Allowlist matching the database entities
    private const ALLOWED_TABLES = [
        'profiles', 'groups', 'roles', 'permissions', 'servant_permissions',
        'group_secretariat', 'general_secretariat_members', 'general_secretariat_permissions',
        'terms', 'lecturers', 'lectures', 'curriculums', 'curriculum_days', 'curriculum_entries',
        'curriculum_revisions', 'attendance_sessions', 'attendance_records', 'exams', 'exam_grades',
        'marathons', 'marathon_sections', 'marathon_questions', 'marathon_answers',
        'marathon_question_revisions', 'marathon_trainee_submissions', 'marathon_trainee_answers',
        'feed_posts', 'post_images', 'post_comments', 'reactions', 'categories',
        'gallery_albums', 'gallery_items', 'books', 'researches', 'mp3_tracks',
        'user_favorites', 'bible_testaments', 'bible_books', 'bible_chapters', 'bible_verses',
        'bible_verse_words', 'bible_sources', 'bible_commentaries', 'bible_word_commentaries',
        'bible_dictionary_entries', 'word_dictionary_mappings', 'bible_content_versions',
        'notifications', 'notification_templates', 'push_subscriptions', 'daily_verses',
        'daily_verse_dispatch_state', 'audit_logs', 'backup_records', 'import_history', 'media_assets'
    ];

    // Tables that only system administrators may mutate directly
    private const ADMIN_ONLY_WRITE_TABLES = [
        'groups', 'roles', 'permissions', 'servant_permissions',
        'group_secretariat', 'general_secretariat_members', 'general_secretariat_permissions',
        'terms', 'lecturers', 'categories', 'bible_testaments', 'bible_books', 'bible_chapters',
        'bible_verses', 'bible_verse_words', 'bible_sources', 'bible_commentaries',
        'bible_word_commentaries', 'bible_dictionary_entries', 'word_dictionary_mappings',
        'bible_content_versions', 'notification_templates', 'daily_verses',
        'daily_verse_dispatch_state', 'audit_logs', 'backup_records', 'import_history'
    ];

    // Profile columns a user may self-update without privilege escalation
    private const SELF_EDITABLE_PROFILE_COLUMNS = [
        'full_name', 'phone', 'address', 'birth_date', 'confession_father', 'avatar_url', 'church'
    ];

    public function __construct(?MySQL $db = null)
    {
        $this->db = $db ?? MySQL::getInstance();
    }

    private function extractAuthContext(array $claims): array
    {
        $userId = (string)($claims['user_id'] ?? $claims['sub'] ?? ($claims['claims']['sub'] ?? ''));
        $role = (string)($claims['role'] ?? ($claims['claims']['app_metadata']['role'] ?? 'trainee'));
        $rawGroup = $claims['group_id']
            ?? ($claims['claims']['app_metadata']['group_id'] ?? null)
            ?? ($claims['user_metadata']['group_id'] ?? null)
            ?? ($claims['claims']['user_metadata']['group_id'] ?? null);
        $userGroupId = ($rawGroup !== null && $rawGroup !== '') ? (int)$rawGroup : null;

        return [$userId, $role, $userGroupId];
    }

    public function handle(string $table, string $method, array $claims, ?string $id = null): void
    {
        $table = strtolower(trim($table));
        if (!in_array($table, self::ALLOWED_TABLES, true)) {
            Response::error("الجدول المطلوب '{$table}' غير مصرح به أو غير موجود", 'TABLE_NOT_ALLOWED', 403);
            return;
        }

        try {
            match ($method) {
                'GET' => $id !== null ? $this->getOne($table, $id, $claims) : $this->getList($table, $claims),
                'POST' => $this->create($table, $claims),
                'PATCH', 'PUT' => $this->update($table, $id, $claims),
                'DELETE' => $this->delete($table, $id, $claims),
                default => Response::error('طريقة HTTP غير مدعومة', 'METHOD_NOT_ALLOWED', 405),
            };
        } catch (InvalidArgumentException $e) {
            Response::error($e->getMessage(), 'VALIDATION_ERROR', 400);
        } catch (\Throwable $e) {
            $errorId = $this->failWithId('DATABASE_ERROR', $e);
            Response::error(
                'تعذر تنفيذ عملية قاعدة البيانات المطلوبة. رقم المرجع: ' . $errorId,
                'DATABASE_ERROR',
                500,
                ['error_id' => $errorId]
            );
        }
    }

    private function getList(string $table, array $claims): void
    {
        [$userId, $role, $userGroupId] = $this->extractAuthContext($claims);

        if (in_array($table, ['audit_logs', 'backup_records', 'import_history'], true) && $role !== 'admin') {
            Response::error('غير مصرح لك بالاطلاع على هذا الجدول', 'FORBIDDEN', 403);
            return;
        }

        $limit = min(200, max(1, (int)($_GET['limit'] ?? 50)));
        $offset = max(0, (int)($_GET['offset'] ?? 0));
        $orderBy = $this->sanitizeOrder($_GET['order'] ?? 'created_at.desc', $table);

        $where = ['1=1'];
        $params = [];

        // Application-Level RLS Enforcement
        if ($role !== 'admin' && $role !== 'supervisor') {
            if ($this->tableHasColumn($table, 'deleted_at')) {
                $where[] = 'deleted_at IS NULL';
            }

            if ($this->tableHasColumn($table, 'group_id') && $this->isGroupIsolatedTable($table)) {
                if ($userGroupId !== null) {
                    $where[] = '(group_id = :user_gid OR group_id IS NULL)';
                    $params['user_gid'] = $userGroupId;
                } else {
                    $where[] = 'group_id IS NULL';
                }
            }

            if ($role === 'trainee' && $this->tableHasColumn($table, 'trainee_id')) {
                $where[] = 'trainee_id = :curr_user_id';
                $params['curr_user_id'] = $userId;
            }

            if ($table === 'notifications' && $this->tableHasColumn($table, 'recipient_id')) {
                $where[] = 'recipient_id = :curr_recipient_id';
                $params['curr_recipient_id'] = $userId;
            }
        }

        // Apply URL query filters
        foreach ($_GET as $key => $val) {
            if (in_array($key, ['limit', 'offset', 'order', 'select'], true)) {
                continue;
            }
            if (preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', (string)$key) && $this->tableHasColumn($table, (string)$key)) {
                $where[] = sprintf('`%s` = :filter_%s', $key, $key);
                $params['filter_' . $key] = $val;
            }
        }

        $whereClause = implode(' AND ', $where);
        $sql = sprintf(
            'SELECT * FROM `%s` WHERE %s ORDER BY %s LIMIT %d OFFSET %d',
            $table,
            $whereClause,
            $orderBy,
            $limit,
            $offset
        );

        $countSql = sprintf('SELECT COUNT(*) as total FROM `%s` WHERE %s', $table, $whereClause);
        $total = (int)($this->db->fetchOne($countSql, $params)['total'] ?? 0);

        $rows = $this->db->fetchAll($sql, $params);

        Response::success([
            'data' => $rows,
            'count' => count($rows),
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
        ], 'تم جلب البيانات بنجاح');
    }

    private function getOne(string $table, string $id, array $claims): void
    {
        [$userId, $role, $userGroupId] = $this->extractAuthContext($claims);

        if (in_array($table, ['audit_logs', 'backup_records', 'import_history'], true) && $role !== 'admin') {
            Response::error('غير مصرح لك بالاطلاع على هذا السجل', 'FORBIDDEN', 403);
            return;
        }

        $where = ['id = :id'];
        $params = ['id' => $id];

        if ($role !== 'admin' && $role !== 'supervisor') {
            if ($this->tableHasColumn($table, 'deleted_at')) {
                $where[] = 'deleted_at IS NULL';
            }
            if ($this->tableHasColumn($table, 'group_id') && $this->isGroupIsolatedTable($table)) {
                if ($userGroupId !== null) {
                    $where[] = '(group_id = :user_gid OR group_id IS NULL)';
                    $params['user_gid'] = $userGroupId;
                } else {
                    $where[] = 'group_id IS NULL';
                }
            }
            if ($role === 'trainee' && $this->tableHasColumn($table, 'trainee_id')) {
                $where[] = 'trainee_id = :curr_user_id';
                $params['curr_user_id'] = $userId;
            }
        }

        $sql = sprintf('SELECT * FROM `%s` WHERE %s LIMIT 1', $table, implode(' AND ', $where));
        $row = $this->db->fetchOne($sql, $params);

        if (!$row) {
            Response::error('العنصر غير موجود أو لا تملك صلاحية الوصول إليه', 'NOT_FOUND', 404);
            return;
        }

        Response::success(['data' => $row], 'تم جلب العنصر بنجاح');
    }

    private function filterKnownColumns(string $table, array $input): array
    {
        $filtered = [];
        foreach ($input as $col => $val) {
            if (is_string($col)
                && preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $col)
                && $this->tableHasColumn($table, $col)
            ) {
                $filtered[$col] = is_array($val) ? json_encode($val, JSON_UNESCAPED_UNICODE) : $val;
            }
        }
        return $filtered;
    }

    private function create(string $table, array $claims): void
    {
        [$userId, $role, $userGroupId] = $this->extractAuthContext($claims);

        if (in_array($table, self::ADMIN_ONLY_WRITE_TABLES, true) && $role !== 'admin') {
            Response::error('هذا الجدول يتطلب صلاحيات مدير النظام للإضافة', 'FORBIDDEN', 403);
            return;
        }
        if ($table === 'profiles' && $role !== 'admin') {
            Response::error('إنشاء الحسابات يتم عبر بوابة الإدارة فقط', 'FORBIDDEN', 403);
            return;
        }

        $rawInput = json_decode(file_get_contents('php://input'), true) ?? [];
        if (empty($rawInput) || !is_array($rawInput)) {
            Response::error('لا توجد بيانات مدخلة للحفظ', 'EMPTY_PAYLOAD', 400);
            return;
        }

        if (!isset($rawInput['id'])) {
            $rawInput['id'] = \App\Auth\MySQLAuthService::generateUuid();
        }

        if ($this->tableHasColumn($table, 'author_id')) {
            $rawInput['author_id'] = $userId;
        }
        if ($this->tableHasColumn($table, 'created_by')) {
            $rawInput['created_by'] = $userId;
        }
        if ($this->tableHasColumn($table, 'user_id') && $role !== 'admin') {
            $rawInput['user_id'] = $userId;
        }

        if ($role !== 'admin' && $this->tableHasColumn($table, 'group_id')) {
            $rawInput['group_id'] = $userGroupId;
        }

        $input = $this->filterKnownColumns($table, $rawInput);
        if (empty($input)) {
            Response::error('لا توجد حقول صالحة للحفظ', 'VALIDATION_ERROR', 400);
            return;
        }

        $this->db->insert($table, $input);
        $inserted = $this->db->fetchOne(sprintf('SELECT * FROM `%s` WHERE id = :id', $table), ['id' => $input['id']]);

        Response::success(['data' => $inserted], 'تم إنشاء السجل بنجاح', 201);
    }

    private function update(string $table, ?string $id, array $claims): void
    {
        if (!$id) {
            Response::error('معرف السجل مطلوب للتحديث', 'MISSING_ID', 400);
            return;
        }

        [$userId, $role, $userGroupId] = $this->extractAuthContext($claims);

        if (in_array($table, self::ADMIN_ONLY_WRITE_TABLES, true) && $role !== 'admin') {
            Response::error('هذا الجدول يتطلب صلاحيات مدير النظام للتعديل', 'FORBIDDEN', 403);
            return;
        }

        $rawInput = json_decode(file_get_contents('php://input'), true) ?? [];
        if (!is_array($rawInput) || empty($rawInput)) {
            Response::error('لا توجد بيانات للتحديث', 'EMPTY_PAYLOAD', 400);
            return;
        }

        unset($rawInput['id'], $rawInput['created_at'], $rawInput['created_by'], $rawInput['author_id']);

        if ($table === 'profiles' && $role !== 'admin') {
            if ($id !== $userId) {
                Response::error('لا يمكنك تعديل ملف شخصي لمستخدم آخر', 'FORBIDDEN', 403);
                return;
            }
            $rawInput = array_intersect_key($rawInput, array_flip(self::SELF_EDITABLE_PROFILE_COLUMNS));
        } elseif ($role !== 'admin') {
            unset($rawInput['role_id'], $rawInput['group_id'], $rawInput['is_active'], $rawInput['account_status'], $rawInput['deleted_at'], $rawInput['deleted_by']);
        }

        if ($this->tableHasColumn($table, 'updated_at')) {
            $rawInput['updated_at'] = date('Y-m-d H:i:s');
        }

        $input = $this->filterKnownColumns($table, $rawInput);
        if (empty($input)) {
            Response::error('لا توجد حقول مسموح بتحديثها', 'VALIDATION_ERROR', 400);
            return;
        }

        $where = 'id = :where_id';
        $whereParams = ['where_id' => $id];

        if ($role !== 'admin') {
            if ($table === 'profiles') {
                $where .= ' AND id = :where_self';
                $whereParams['where_self'] = $userId;
            } elseif ($this->tableHasColumn($table, 'author_id')) {
                $where .= ' AND author_id = :where_author';
                $whereParams['where_author'] = $userId;
            } elseif ($this->tableHasColumn($table, 'created_by')) {
                $where .= ' AND created_by = :where_creator';
                $whereParams['where_creator'] = $userId;
            } elseif ($this->tableHasColumn($table, 'user_id')) {
                $where .= ' AND user_id = :where_user';
                $whereParams['where_user'] = $userId;
            } elseif ($this->tableHasColumn($table, 'recipient_id')) {
                $where .= ' AND recipient_id = :where_recipient';
                $whereParams['where_recipient'] = $userId;
            } elseif (in_array($role, ['supervisor', 'servant'], true) && $this->tableHasColumn($table, 'group_id') && $userGroupId !== null) {
                $where .= ' AND group_id = :where_gid';
                $whereParams['where_gid'] = $userGroupId;
            } else {
                Response::error('غير مصرح لك بتعديل هذا السجل', 'FORBIDDEN', 403);
                return;
            }
        }

        $affected = $this->db->update($table, $input, $where, $whereParams);
        if ($affected === 0 && $role !== 'admin') {
            Response::error('السجل غير موجود أو لا تملك صلاحية تعديله', 'FORBIDDEN', 403);
            return;
        }
        $updated = $this->db->fetchOne(sprintf('SELECT * FROM `%s` WHERE id = :id', $table), ['id' => $id]);

        Response::success(['data' => $updated, 'affected' => $affected], 'تم تحديث السجل بنجاح');
    }

    private function delete(string $table, ?string $id, array $claims): void
    {
        if (!$id) {
            Response::error('معرف السجل مطلوب للحذف', 'MISSING_ID', 400);
            return;
        }

        [$userId, $role, $userGroupId] = $this->extractAuthContext($claims);

        if ((in_array($table, self::ADMIN_ONLY_WRITE_TABLES, true) || $table === 'profiles') && $role !== 'admin') {
            Response::error('هذا الجدول يتطلب صلاحيات مدير النظام للحذف', 'FORBIDDEN', 403);
            return;
        }

        $where = 'id = :id';
        $whereParams = ['id' => $id];

        if ($role !== 'admin') {
            if ($this->tableHasColumn($table, 'author_id')) {
                $where .= ' AND author_id = :where_author';
                $whereParams['where_author'] = $userId;
            } elseif ($this->tableHasColumn($table, 'created_by')) {
                $where .= ' AND created_by = :where_creator';
                $whereParams['where_creator'] = $userId;
            } elseif ($this->tableHasColumn($table, 'user_id')) {
                $where .= ' AND user_id = :where_user';
                $whereParams['where_user'] = $userId;
            } elseif (in_array($role, ['supervisor', 'servant'], true) && $this->tableHasColumn($table, 'group_id') && $userGroupId !== null) {
                $where .= ' AND group_id = :where_gid';
                $whereParams['where_gid'] = $userGroupId;
            } else {
                Response::error('الحذف يتطلب صلاحيات مدير النظام أو ملكية السجل', 'FORBIDDEN', 403);
                return;
            }
        }

        if ($this->tableHasColumn($table, 'deleted_at')) {
            $updateData = ['deleted_at' => date('Y-m-d H:i:s')];
            if ($this->tableHasColumn($table, 'deleted_by')) {
                $updateData['deleted_by'] = $userId;
            }
            $this->db->update($table, $updateData, $where, $whereParams);
        } else {
            if ($role !== 'admin' && !$this->tableHasColumn($table, 'user_id')) {
                Response::error('الحذف المباشر يتطلب صلاحيات مدير النظام', 'FORBIDDEN', 403);
                return;
            }
            $this->db->delete($table, $where, $whereParams);
        }

        Response::success(null, 'تم حذف السجل بنجاح');
    }

    private function sanitizeOrder(string $raw, string $table): string
    {
        $parts = explode('.', $raw);
        $col = preg_replace('/[^a-zA-Z0-9_]/', '', $parts[0] ?? 'created_at');
        if (!$col || !$this->tableHasColumn($table, $col)) {
            $col = $this->tableHasColumn($table, 'created_at') ? 'created_at' : 'id';
        }
        $dir = strtoupper($parts[1] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
        return sprintf('`%s` %s', $col, $dir);
    }

    private function tableHasColumn(string $table, string $column): bool
    {
        static $cache = [];
        $key = "{$table}.{$column}";
        if (isset($cache[$key])) {
            return $cache[$key];
        }

        if (!preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $table) || !preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $column)) {
            return false;
        }

        if ($this->db->getDriver() === 'sqlite') {
            $cols = $this->db->fetchAll(sprintf('PRAGMA table_info(`%s`)', $table));
            foreach ($cols as $colInfo) {
                $colName = $colInfo['name'] ?? '';
                if ($colName !== '') {
                    $cache["{$table}.{$colName}"] = true;
                }
            }
            if (!isset($cache[$key])) {
                $cache[$key] = false;
            }
            return $cache[$key];
        }

        $res = $this->db->fetchOne(
            'SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = :t AND column_name = :c LIMIT 1',
            ['t' => $table, 'c' => $column]
        );
        $cache[$key] = (bool)$res;
        return $cache[$key];
    }

    private function isGroupIsolatedTable(string $table): bool
    {
        return in_array($table, [
            'attendance_sessions', 'attendance_records', 'exams', 'exam_grades',
            'marathons', 'marathon_trainee_submissions', 'gallery_albums', 'gallery_items',
            'mp3_tracks', 'curriculums', 'curriculum_days', 'lectures'
        ], true);
    }
}
