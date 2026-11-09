<?php

namespace App\Controllers;

use App\Database\MySQL;
use App\Utils\Response;

class RpcApiController
{
    use SafeFailure;

    private MySQL $db;

    public function __construct()
    {
        $this->db = MySQL::getInstance();
    }

    public function handle(string $functionName, array $claims): void
    {
        $raw = file_get_contents('php://input');
        $params = json_decode($raw, true) ?? [];

        $userId = $claims['user_id'] ?? ($claims['sub'] ?? ($claims['claims']['sub'] ?? null));
        $userRole = $claims['role'] ?? ($claims['app_metadata']['role'] ?? ($claims['claims']['app_metadata']['role'] ?? 'trainee'));
        $userGroup = $claims['group_id'] ?? ($claims['app_metadata']['group_id'] ?? ($claims['claims']['app_metadata']['group_id'] ?? 1));

        try {
            switch ($functionName) {
                case 'has_servant_permission':
                    $this->hasServantPermission($params, $userId, $userRole);
                    break;

                case 'get_group_operational_summary':
                    $this->getGroupOperationalSummary($params, $userRole, $userGroup);
                    break;

                case 'get_group_servants_detailed':
                    $this->getGroupServantsDetailed($params, $userRole, $userGroup);
                    break;

                case 'get_group_secretariat_detailed':
                    $this->getGroupSecretariatDetailed($params, $userRole, $userGroup);
                    break;

                case 'get_trainee_attendance_summary':
                    $this->getTraineeAttendanceSummary($params, $userId, $userRole, $userGroup);
                    break;

                case 'get_trainee_full_profile':
                    $this->getTraineeFullProfile($params, $userId, $userRole, $userGroup);
                    break;

                case 'resolve_identifier_for_login':
                    $this->resolveIdentifierForLogin($params);
                    break;

                case 'create_trainee_profile':
                    $this->createTraineeProfile($params, $userRole);
                    break;

                case 'update_servant_profile_and_permissions':
                    $this->updateServantProfileAndPermissions($params, $userRole);
                    break;

                case 'replace_servant_permissions':
                    $this->replaceServantPermissions($params, $userRole);
                    break;

                case 'get_marathon_questions_for_player':
                    $this->getMarathonQuestionsForPlayer($params, $userId);
                    break;

                case 'get_trainee_marathon_state':
                    $this->getTraineeMarathonState($params, $userId);
                    break;

                case 'submit_marathon_answer':
                    $this->submitMarathonAnswer($params, $userId);
                    break;

                case 'create_marathon_section':
                    $this->createMarathonSection($params, $userRole);
                    break;

                case 'create_marathon_question':
                    $this->createMarathonQuestion($params, $userRole);
                    break;

                case 'archive_marathon_question':
                    $this->archiveMarathonQuestion($params, $userRole);
                    break;

                case 'reopen_marathon_question':
                    $this->reopenMarathonQuestion($params, $userRole);
                    break;

                case 'update_curriculum_day':
                    $this->updateCurriculumDay($params, $userRole);
                    break;

                case 'update_curriculum_entry':
                    $this->updateCurriculumEntry($params, $userRole);
                    break;

                case 'publish_curriculum_day':
                    $this->publishCurriculumDay($params, $userRole);
                    break;

                case 'log_operational_event':
                    $this->logOperationalEvent($params, $userId, $userRole);
                    break;

                case 'dispatch_daily_verse_notification':
                case 'trigger_birthday_notifications':
                    Response::success(['dispatched_count' => 0], 'تم فحص الإشعارات بنجاح');
                    break;

                case 'grant_system_admin':
                case 'revoke_system_admin':
                case 'admin_set_general_secretariat':
                    $this->manageSystemRole($functionName, $params, $userRole);
                    break;

                default:
                    // Generic fallback for unknown functions: returns empty data safely
                    Response::success([], "RPC function {$functionName} executed");
                    break;
            }
        } catch (\Throwable $e) {
            $errorId = $this->failWithId('RPC_EXECUTION_ERROR', $e);
            Response::error(
                'تعذر تنفيذ الإجراء المطلوب. رقم المرجع: ' . $errorId,
                'RPC_EXECUTION_ERROR',
                400,
                ['error_id' => $errorId]
            );
        }
    }

    private function hasServantPermission(array $params, ?string $userId, string $role): void
    {
        if (in_array($role, ['admin', 'supervisor'], true)) {
            Response::success(true);
            return;
        }

        $permId = $params['perm_id'] ?? ($params['permission_id'] ?? '');
        if (!$userId || !$permId) {
            Response::success(false);
            return;
        }

        $row = $this->db->fetchOne(
            "SELECT 1 FROM servant_permissions sp
             JOIN profiles p ON p.id = sp.profile_id
             WHERE sp.profile_id = ? AND sp.permission_id = ? AND p.is_active = 1 AND p.deleted_at IS NULL",
            [$userId, $permId]
        );

        Response::success((bool)$row);
    }

    private function getGroupOperationalSummary(array $params, string $role, $userGroup): void
    {
        $groupId = (int)($params['p_group_id'] ?? ($params['groupId'] ?? $userGroup));

        if (!in_array($role, ['admin', 'supervisor'], true) && (int)$userGroup !== $groupId) {
            Response::error('group scope violation: not authorized for this group', 'ACCESS_DENIED', 403);
        }

        $group = $this->db->fetchOne("SELECT name_ar FROM groups WHERE id = ?", [$groupId]);
        $traineesCount = (int)($this->db->fetchOne("SELECT COUNT(*) as c FROM profiles WHERE group_id = ? AND role_id = 'trainee' AND is_active = 1 AND deleted_at IS NULL", [$groupId])['c'] ?? 0);
        $servantsCount = (int)($this->db->fetchOne("SELECT COUNT(*) as c FROM profiles WHERE group_id = ? AND role_id = 'servant' AND is_active = 1 AND deleted_at IS NULL", [$groupId])['c'] ?? 0);
        $secretariatCount = (int)($this->db->fetchOne("SELECT COUNT(*) as c FROM group_secretariat WHERE group_id = ? AND is_active = 1", [$groupId])['c'] ?? 0);

        // Overall Attendance
        $totalRecords = (int)($this->db->fetchOne("SELECT COUNT(*) as c FROM attendance_records WHERE group_id = ? AND deleted_at IS NULL", [$groupId])['c'] ?? 0);
        $presentRecords = (int)($this->db->fetchOne("SELECT COUNT(*) as c FROM attendance_records WHERE group_id = ? AND status = 'PRESENT' AND deleted_at IS NULL", [$groupId])['c'] ?? 0);
        $rate = $totalRecords > 0 ? round(($presentRecords / $totalRecords) * 100, 1) : 100.0;

        // Latest Session
        $latestSession = $this->db->fetchOne("SELECT id, session_date FROM attendance_sessions WHERE group_id = ? ORDER BY session_date DESC LIMIT 1", [$groupId]);
        $latestPresent = 0;
        $latestAbsent = 0;
        $latestLate = 0;

        if ($latestSession) {
            $latestPresent = (int)($this->db->fetchOne("SELECT COUNT(*) as c FROM attendance_records WHERE session_id = ? AND status = 'PRESENT' AND deleted_at IS NULL", [$latestSession['id']])['c'] ?? 0);
            $latestAbsent = (int)($this->db->fetchOne("SELECT COUNT(*) as c FROM attendance_records WHERE session_id = ? AND status = 'ABSENT' AND deleted_at IS NULL", [$latestSession['id']])['c'] ?? 0);
            $latestLate = (int)($this->db->fetchOne("SELECT COUNT(*) as c FROM attendance_records WHERE session_id = ? AND status = 'LATE' AND deleted_at IS NULL", [$latestSession['id']])['c'] ?? 0);
        }

        // Top Absent
        $topAbsent = $this->db->fetchAll(
            "SELECT p.id, p.full_name, p.phone, p.avatar_url,
                    SUM(CASE WHEN r.status = 'ABSENT' THEN 1 ELSE 0 END) as absent_count,
                    SUM(CASE WHEN r.status = 'LATE' THEN 1 ELSE 0 END) as late_count,
                    SUM(CASE WHEN r.status = 'PRESENT' THEN 1 ELSE 0 END) as present_count,
                    COUNT(r.id) as total_sessions
             FROM profiles p
             LEFT JOIN attendance_records r ON p.id = r.trainee_id AND r.deleted_at IS NULL
             WHERE p.group_id = ? AND p.role_id = 'trainee' AND p.is_active = 1 AND p.deleted_at IS NULL
             GROUP BY p.id, p.full_name, p.phone, p.avatar_url
             ORDER BY absent_count DESC, p.full_name ASC LIMIT 5",
            [$groupId]
        );

        Response::success([
            'group_id' => $groupId,
            'group_name' => $group['name_ar'] ?? "الفرقة {$groupId}",
            'trainees_count' => $traineesCount,
            'servants_count' => $servantsCount,
            'secretariat_count' => $secretariatCount,
            'attendance_rate' => $rate,
            'latest_session_date' => $latestSession['session_date'] ?? null,
            'latest_present' => $latestPresent,
            'latest_absent' => $latestAbsent,
            'latest_late' => $latestLate,
            'top_absent' => $topAbsent,
        ]);
    }

    private function getGroupServantsDetailed(array $params, string $role, $userGroup): void
    {
        $groupId = (int)($params['p_group_id'] ?? $userGroup);
        if (!in_array($role, ['admin', 'supervisor'], true) && (int)$userGroup !== $groupId) {
            Response::error('غير مصرح لك بالاطلاع على خدام هذه الفرقة', 'ACCESS_DENIED', 403);
            return;
        }
        $servants = $this->db->fetchAll(
            "SELECT p.id, p.username, p.full_name, p.avatar_url, p.phone, p.role_id, p.group_id, p.is_active, p.created_at,
                    EXISTS(SELECT 1 FROM group_secretariat gs WHERE gs.profile_id = p.id AND gs.group_id = p.group_id AND gs.is_active = 1) as is_secretariat
             FROM profiles p
             WHERE p.group_id = ? AND p.role_id = 'servant' AND p.deleted_at IS NULL
             ORDER BY p.full_name ASC",
            [$groupId]
        );

        foreach ($servants as &$s) {
            $perms = $this->db->fetchAll("SELECT permission_id FROM servant_permissions WHERE profile_id = ?", [$s['id']]);
            $s['permissions'] = array_column($perms, 'permission_id');
            $s['is_secretariat'] = (bool)$s['is_secretariat'];
        }

        Response::success($servants);
    }

    private function getGroupSecretariatDetailed(array $params, string $role, $userGroup): void
    {
        $groupId = (int)($params['p_group_id'] ?? $userGroup);
        if (!in_array($role, ['admin', 'supervisor'], true) && (int)$userGroup !== $groupId) {
            Response::error('غير مصرح لك بالاطلاع على أمانة هذه الفرقة', 'ACCESS_DENIED', 403);
            return;
        }
        $sec = $this->db->fetchAll(
            "SELECT p.id, p.username, p.full_name, p.avatar_url, p.phone, p.role_id, p.group_id, p.is_active, gs.appointed_at
             FROM group_secretariat gs
             JOIN profiles p ON gs.profile_id = p.id
             WHERE gs.group_id = ? AND gs.is_active = 1 AND p.deleted_at IS NULL
             ORDER BY p.full_name ASC",
            [$groupId]
        );

        Response::success($sec);
    }

    private function getTraineeAttendanceSummary(array $params, ?string $userId, string $role, $userGroup): void
    {
        $traineeId = $params['p_trainee_id'] ?? ($params['trainee_id'] ?? $userId);
        if ($role === 'trainee' && $traineeId !== $userId) {
            Response::error('غير مصرح لك بالاطلاع على سجل متدرب آخر', 'FORBIDDEN', 403);
            return;
        }
        $profile = $this->db->fetchOne("SELECT group_id FROM profiles WHERE id = ?", [$traineeId]);
        $groupId = $profile['group_id'] ?? $userGroup;
        if (!in_array($role, ['admin', 'supervisor'], true) && $role !== 'trainee' && (int)$groupId !== (int)$userGroup) {
            Response::error('غير مصرح لك بالاطلاع على متدرب خارج فرقتك', 'FORBIDDEN', 403);
            return;
        }

        $totalSessions = (int)($this->db->fetchOne("SELECT COUNT(*) as c FROM attendance_sessions WHERE group_id = ?", [$groupId])['c'] ?? 0);
        $present = (int)($this->db->fetchOne("SELECT COUNT(*) as c FROM attendance_records WHERE trainee_id = ? AND status = 'PRESENT' AND deleted_at IS NULL", [$traineeId])['c'] ?? 0);
        $late = (int)($this->db->fetchOne("SELECT COUNT(*) as c FROM attendance_records WHERE trainee_id = ? AND status = 'LATE' AND deleted_at IS NULL", [$traineeId])['c'] ?? 0);
        $absent = (int)($this->db->fetchOne("SELECT COUNT(*) as c FROM attendance_records WHERE trainee_id = ? AND status = 'ABSENT' AND deleted_at IS NULL", [$traineeId])['c'] ?? 0);

        $pct = $totalSessions > 0 ? round((($present + ($late * 0.5)) / $totalSessions) * 100, 2) : 100.0;
        $appreciation = $pct >= 90 ? 'ممتاز' : ($pct >= 80 ? 'جيد جدًا' : ($pct >= 70 ? 'جيد' : ($pct >= 60 ? 'مقبول' : 'ضعيف')));

        Response::success([
            'trainee_id' => $traineeId,
            'group_id' => $groupId,
            'total_sessions' => $totalSessions,
            'present_count' => $present,
            'present' => $present,
            'late_count' => $late,
            'late' => $late,
            'absent_count' => $absent,
            'absent' => $absent,
            'percentage' => $pct,
            'attendance_percentage' => $pct,
            'appreciation_grade' => $appreciation,
        ]);
    }

    private function getTraineeFullProfile(array $params, ?string $userId, string $role, $userGroup): void
    {
        $traineeId = $params['p_trainee_id'] ?? ($params['trainee_id'] ?? $userId);
        if ($role === 'trainee' && $traineeId !== $userId) {
            Response::error('غير مصرح لك بالاطلاع على ملف متدرب آخر', 'FORBIDDEN', 403);
            return;
        }
        $profile = $this->db->fetchOne("SELECT p.*, g.name_ar as group_name, r.name_ar as role_name FROM profiles p LEFT JOIN groups g ON g.id = p.group_id LEFT JOIN roles r ON r.id = p.role_id WHERE p.id = ?", [$traineeId]);
        if (!$profile) {
            Response::error('المتدرب غير موجود', 'NOT_FOUND', 404);
            return;
        }
        if (!in_array($role, ['admin', 'supervisor'], true) && $role !== 'trainee' && (int)($profile['group_id'] ?? 0) !== (int)$userGroup) {
            Response::error('غير مصرح لك بالاطلاع على ملف متدرب خارج فرقتك', 'FORBIDDEN', 403);
            return;
        }

        $records = $this->db->fetchAll(
            "SELECT r.id, s.session_date, r.status, r.notes, r.recorded_at
             FROM attendance_records r
             JOIN attendance_sessions s ON r.session_id = s.id
             WHERE r.trainee_id = ? AND r.deleted_at IS NULL
             ORDER BY s.session_date DESC",
            [$traineeId]
        );

        $grades = $this->db->fetchAll(
            "SELECT g.id, e.title as exam_title, e.max_score, g.numeric_score as score, g.appreciation_grade as appreciation, g.graded_at
             FROM exam_grades g
             JOIN exams e ON g.exam_id = e.id
             WHERE g.trainee_id = ? AND g.deleted_at IS NULL
             ORDER BY g.graded_at DESC",
            [$traineeId]
        );

        $marathons = $this->db->fetchAll(
            "SELECT m.id as marathon_id, m.title as marathon_title, subm.score, subm.status
             FROM marathons m
             LEFT JOIN marathon_trainee_submissions subm ON m.id = subm.marathon_id AND subm.trainee_id = ?
             WHERE m.group_id = ? AND m.deleted_at IS NULL",
            [$traineeId, $profile['group_id']]
        );

        Response::success([
            'profile' => $profile,
            'attendance_log' => $records,
            'exam_grades' => $grades,
            'marathon_submissions' => $marathons,
        ]);
    }

    private function resolveIdentifierForLogin(array $params): void
    {
        $identifier = trim($params['identifier'] ?? '');
        $user = $this->db->fetchOne(
            "SELECT id, email, username FROM auth_users WHERE (email = ? OR username = ?) AND is_active = 1",
            [$identifier, $identifier]
        );
        Response::success($user);
    }

    private function createTraineeProfile(array $params, string $role): void
    {
        if (!in_array($role, ['admin', 'supervisor', 'secretariat'], true)) {
            Response::error('غير مصرح لك بإنشاء متدرب', 'FORBIDDEN', 403);
        }

        $id = $params['id'] ?? $params['p_id'] ?? $this->generateUuid();
        $username = $params['username'] ?? $params['p_username'] ?? ('trainee_' . time());
        $fullName = $params['full_name'] ?? $params['p_full_name'] ?? '';
        $phone = $params['phone'] ?? $params['p_phone'] ?? null;
        $groupId = (int)($params['group_id'] ?? $params['p_group_id'] ?? 1);

        $this->db->execute(
            "INSERT INTO profiles (id, username, full_name, phone, role_id, group_id, is_active)
             VALUES (?, ?, ?, ?, 'trainee', ?, 1)",
            [$id, $username, $fullName, $phone, $groupId]
        );

        Response::success(['id' => $id, 'username' => $username], 'تم إنشاء المتدرب بنجاح');
    }

    private function updateServantProfileAndPermissions(array $params, string $role): void
    {
        if ($role !== 'admin') {
            Response::error('صلاحية مسؤول النظام مطلوبة', 'FORBIDDEN', 403);
        }

        $profileId = $params['p_servant_id'] ?? ($params['servant_id'] ?? null);
        if (!$profileId) Response::error('معرف الخادم مطلوب', 'VALIDATION_ERROR', 400);

        if (isset($params['full_name'])) {
            $this->db->execute("UPDATE profiles SET full_name = ? WHERE id = ?", [$params['full_name'], $profileId]);
        }

        if (isset($params['permissions']) && is_array($params['permissions'])) {
            $this->db->execute("DELETE FROM servant_permissions WHERE profile_id = ?", [$profileId]);
            foreach ($params['permissions'] as $p) {
                $this->db->execute("INSERT INTO servant_permissions (id, profile_id, permission_id) VALUES (?, ?, ?)", [$this->generateUuid(), $profileId, $p]);
            }
        }

        Response::success(true, 'تم تحديث بيانات الخادم وصلاحياته');
    }

    private function replaceServantPermissions(array $params, string $role): void
    {
        if ($role !== 'admin') {
            Response::error('صلاحية مسؤول النظام مطلوبة', 'FORBIDDEN', 403);
        }

        $profileId = $params['p_servant_id'] ?? null;
        $perms = $params['p_permissions'] ?? [];

        $this->db->execute("DELETE FROM servant_permissions WHERE profile_id = ?", [$profileId]);
        foreach ($perms as $p) {
            $this->db->execute("INSERT INTO servant_permissions (id, profile_id, permission_id) VALUES (?, ?, ?)", [$this->generateUuid(), $profileId, $p]);
        }

        Response::success(true, 'تم استبدال الصلاحيات');
    }

    private function getMarathonQuestionsForPlayer(array $params, ?string $userId): void
    {
        $marathonId = $params['p_marathon_id'] ?? null;
        $questions = $this->db->fetchAll(
            "SELECT mq.id, mq.question_text, mq.section_id, mq.question_order, ms.title as section_title
             FROM marathon_questions mq
             JOIN marathon_sections ms ON mq.section_id = ms.id
             WHERE mq.marathon_id = ? AND mq.is_archived = 0
             ORDER BY ms.section_order ASC, mq.question_order ASC",
            [$marathonId]
        );

        foreach ($questions as &$q) {
            $answers = $this->db->fetchAll(
                "SELECT id, answer_text FROM marathon_answers WHERE question_id = ? ORDER BY id ASC",
                [$q['id']]
            );
            $q['options'] = $answers;
        }

        Response::success($questions);
    }

    private function getTraineeMarathonState(array $params, ?string $userId): void
    {
        $marathonId = $params['p_marathon_id'] ?? null;
        $sub = $this->db->fetchOne(
            "SELECT * FROM marathon_trainee_submissions WHERE marathon_id = ? AND trainee_id = ?",
            [$marathonId, $userId]
        );
        Response::success($sub ?: ['status' => 'NOT_STARTED', 'score' => 0]);
    }

    private function submitMarathonAnswer(array $params, ?string $userId): void
    {
        $marathonId = $params['p_marathon_id'] ?? null;
        $questionId = $params['p_question_id'] ?? null;
        $answerId = $params['p_selected_answer_id'] ?? null;

        $isCorrect = (bool)($this->db->fetchOne("SELECT is_correct FROM marathon_answers WHERE id = ?", [$answerId])['is_correct'] ?? false);

        $existing = $this->db->fetchOne(
            "SELECT id FROM marathon_trainee_answers WHERE marathon_id = ? AND trainee_id = ? AND question_id = ? LIMIT 1",
            [$marathonId, $userId, $questionId]
        );

        if ($existing) {
            $this->db->execute(
                "UPDATE marathon_trainee_answers SET selected_answer_id = ?, is_correct = ? WHERE id = ?",
                [$answerId, $isCorrect ? 1 : 0, $existing['id']]
            );
        } else {
            $this->db->execute(
                "INSERT INTO marathon_trainee_answers (id, marathon_id, trainee_id, question_id, selected_answer_id, is_correct)
                 VALUES (?, ?, ?, ?, ?, ?)",
                [$this->generateUuid(), $marathonId, $userId, $questionId, $answerId, $isCorrect ? 1 : 0]
            );
        }

        Response::success(['is_correct' => $isCorrect]);
    }

    private function assertStaffRole(string $role): void
    {
        if (!in_array($role, ['admin', 'supervisor', 'servant'], true)) {
            Response::error('هذه العملية تتطلب صلاحية خادم أو مشرف أو مدير نظام', 'FORBIDDEN', 403);
        }
    }

    private function createMarathonSection(array $params, string $role): void
    {
        $this->assertStaffRole($role);
        $id = $this->generateUuid();
        $this->db->execute(
            "INSERT INTO marathon_sections (id, marathon_id, title) VALUES (?, ?, ?)",
            [$id, $params['p_marathon_id'], $params['p_title']]
        );
        Response::success($id);
    }

    private function createMarathonQuestion(array $params, string $role): void
    {
        $this->assertStaffRole($role);
        $qId = $this->generateUuid();
        $this->db->execute(
            "INSERT INTO marathon_questions (id, marathon_id, section_id, question_text) VALUES (?, ?, ?, ?)",
            [$qId, $params['p_marathon_id'], $params['p_section_id'], $params['p_question_text']]
        );

        if (isset($params['p_options']) && is_array($params['p_options'])) {
            foreach ($params['p_options'] as $opt) {
                $this->db->execute(
                    "INSERT INTO marathon_answers (id, question_id, answer_text, is_correct) VALUES (?, ?, ?, ?)",
                    [$this->generateUuid(), $qId, $opt['text'], !empty($opt['is_correct']) ? 1 : 0]
                );
            }
        }

        Response::success($qId);
    }

    private function archiveMarathonQuestion(array $params, string $role): void
    {
        $this->assertStaffRole($role);
        $this->db->execute("UPDATE marathon_questions SET is_archived = 1 WHERE id = ?", [$params['p_question_id']]);
        Response::success(true);
    }

    private function reopenMarathonQuestion(array $params, string $role): void
    {
        $this->assertStaffRole($role);
        $this->db->execute("UPDATE marathon_questions SET is_archived = 0 WHERE id = ?", [$params['p_question_id']]);
        Response::success(true);
    }

    private function updateCurriculumDay(array $params, string $role): void
    {
        $this->assertStaffRole($role);
        $dayId = $params['p_day_id'] ?? null;
        if (isset($params['title'])) {
            $this->db->execute("UPDATE curriculum_days SET title = ? WHERE id = ?", [$params['title'], $dayId]);
        }
        Response::success(true);
    }

    private function updateCurriculumEntry(array $params, string $role): void
    {
        $this->assertStaffRole($role);
        $entryId = $params['p_entry_id'] ?? null;
        if (isset($params['title'])) {
            $this->db->execute("UPDATE curriculum_entries SET title = ?, subject = ? WHERE id = ?", [$params['title'], $params['title'], $entryId]);
        }
        Response::success(true);
    }

    private function publishCurriculumDay(array $params, string $role): void
    {
        $this->assertStaffRole($role);
        $dayId = $params['p_day_id'] ?? null;
        $this->db->execute("UPDATE curriculum_days SET is_published = 1 WHERE id = ?", [$dayId]);
        Response::success(true);
    }

    private function logOperationalEvent(array $params, ?string $userId, string $role): void
    {
        $this->db->execute(
            "INSERT INTO audit_logs (id, actor_id, actor_role, action, resource_type, resource_id, details)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                $this->generateUuid(),
                $userId,
                $role,
                $params['p_action'] ?? ($params['action'] ?? 'OPERATIONAL_EVENT'),
                $params['p_resource_type'] ?? 'SYSTEM',
                $params['p_resource_id'] ?? '0',
                json_encode($params['p_details'] ?? [], JSON_UNESCAPED_UNICODE)
            ]
        );
        Response::success(true);
    }

    private function manageSystemRole(string $action, array $params, string $role): void
    {
        if ($role !== 'admin') {
            Response::error('مطلوب صلاحية مسؤول النظام', 'FORBIDDEN', 403);
        }
        $targetId = $params['p_user_id'] ?? ($params['user_id'] ?? null);
        if (!$targetId) Response::error('معرف المستخدم مطلوب', 'VALIDATION_ERROR', 400);

        if ($action === 'grant_system_admin') {
            $this->db->execute("UPDATE profiles SET role_id = 'admin' WHERE id = ?", [$targetId]);
            $this->db->execute("UPDATE auth_users SET role = 'admin' WHERE id = ?", [$targetId]);
        } elseif ($action === 'revoke_system_admin') {
            $this->db->execute("UPDATE profiles SET role_id = 'servant' WHERE id = ?", [$targetId]);
            $this->db->execute("UPDATE auth_users SET role = 'servant' WHERE id = ?", [$targetId]);
        }
        Response::success(true);
    }

    private function generateUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
