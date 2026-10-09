<?php
// backend-api/src/Services/BibleEncyclopediaService.php
// Full-featured service for Bible Encyclopedia v5.0 with SQLite FTS5

declare(strict_types=1);

namespace App\Services;

use App\Utils\AppRoot;
use PDO;
use Throwable;

class BibleEncyclopediaService
{
    private ?PDO $pdo = null;
    private string $dbPath;

    public function __construct()
    {
        // Local storage path (Hostinger)
        $this->dbPath = AppRoot::path('storage/bible/database/bible_encyclopedia.sqlite');
        $this->initPdo();
    }

    private function initPdo(): void
    {
        if (!file_exists($this->dbPath)) {
            return;
        }

        try {
            $this->pdo = new PDO('sqlite:' . $this->dbPath, null, null, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
            $this->pdo->exec('PRAGMA journal_mode = WAL;');
            $this->pdo->exec('PRAGMA synchronous = NORMAL;');
            $this->pdo->exec('PRAGMA cache_size = -64000;'); // 64MB Cache
        } catch (Throwable $e) {
            error_log('[BibleEncyclopediaService] SQLite PDO Init error: ' . $e->getMessage());
            $this->pdo = null;
        }
    }

    public function isAvailable(): bool
    {
        return $this->pdo !== null;
    }

    /**
     * Get all categories and their sections.
     */
    public function getCategoriesAndSections(): array
    {
        if (!$this->pdo) {
            return $this->getSectionsFromJson();
        }

        try {
            $stmtCat = $this->pdo->query("SELECT id, code, title, subtitle, icon, display_order FROM categories ORDER BY display_order ASC");
            $categories = $stmtCat->fetchAll();

            $stmtSec = $this->pdo->query("SELECT id, category_id, code, title, icon, doc_count, description, display_order FROM sections ORDER BY display_order ASC");
            $sections = $stmtSec->fetchAll();

            $secByCat = [];
            foreach ($sections as $s) {
                $secByCat[$s['category_id']][] = $s;
            }

            foreach ($categories as &$c) {
                $c['sections'] = $secByCat[$c['id']] ?? [];
            }

            return $categories;
        } catch (Throwable $e) {
            error_log('[BibleEncyclopediaService] getCategoriesAndSections error: ' . $e->getMessage());
            return $this->getSectionsFromJson();
        }
    }

    /**
     * Get all sections with optional category code filter.
     */
    public function getSections(?string $categoryCode = null): array
    {
        if (!$this->pdo) {
            return $this->getSectionsFromJson($categoryCode);
        }

        try {
            $sql = "SELECT s.*, c.title as category_title, c.code as category_code 
                    FROM sections s 
                    LEFT JOIN categories c ON s.category_id = c.id";
            $params = [];
            if ($categoryCode) {
                $sql .= " WHERE c.code = ?";
                $params[] = $categoryCode;
            }
            $sql .= " ORDER BY s.display_order ASC";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll();
        } catch (Throwable $e) {
            error_log('[BibleEncyclopediaService] getSections error: ' . $e->getMessage());
            return $this->getSectionsFromJson($categoryCode);
        }
    }

    /**
     * Fallback to sections.json if DB query fails.
     */
    private function getSectionsFromJson(?string $categoryCode = null): array
    {
        $jsonPath = AppRoot::path('storage/bible/data/sections.json');
        if (!file_exists($jsonPath)) return [];
        $raw = file_get_contents($jsonPath);
        $data = json_decode($raw, true) ?: [];
        if ($categoryCode && isset($data[$categoryCode])) {
            return $data[$categoryCode];
        }
        return $data;
    }

    /**
     * Get Tree Structure for Sidebar Navigation.
     */
    public function getTree(?string $searchQuery = null): array
    {
        $treePath = AppRoot::path('storage/bible/data/tree_data.json');
        if (!file_exists($treePath)) {
            $treePath = AppRoot::path('storage/bible/data/tree.json');
        }

        if (!file_exists($treePath)) return [];

        $raw = file_get_contents($treePath);
        $tree = json_decode($raw, true) ?: [];

        if (!empty($searchQuery)) {
            $q = mb_strtolower(trim($searchQuery), 'UTF-8');
            return $this->filterTreeNodes($tree, $q);
        }

        return $tree;
    }

    private function filterTreeNodes(array $nodes, string $query): array
    {
        $filtered = [];
        foreach ($nodes as $node) {
            $name = mb_strtolower($node['n'] ?? $node['title'] ?? '', 'UTF-8');
            $hasChildren = isset($node['c']) && is_array($node['c']);
            $matchingChildren = $hasChildren ? $this->filterTreeNodes($node['c'], $query) : [];

            if (strpos($name, $query) !== false || !empty($matchingChildren)) {
                $copy = $node;
                if ($hasChildren) {
                    $copy['c'] = $matchingChildren;
                }
                $filtered[] = $copy;
            }
        }
        return $filtered;
    }

    /**
     * Get Article / Chapter content by ID, Slug, or Book+Chapter.
     */
    public function getArticle(int $id = 0, string $slug = '', string $path = '', string $book = '', int $chapter = 1): ?array
    {
        if (!$this->pdo) return null;

        try {
            $sql = "SELECT a.*, s.title as section_title, s.code as section_code, c.title as category_title, c.code as category_code
                    FROM articles a
                    LEFT JOIN sections s ON a.section_id = s.id
                    LEFT JOIN categories c ON s.category_id = c.id
                    WHERE ";
            $params = [];

            if ($id > 0) {
                $sql .= "a.id = ?";
                $params[] = $id;
            } elseif (!empty($slug)) {
                $sql .= "a.slug = ? OR a.file_path = ?";
                $params[] = $slug;
                $params[] = $slug;
            } elseif (!empty($path)) {
                $sql .= "a.file_path = ? OR a.slug = ?";
                $params[] = $path;
                $params[] = $path;
            } elseif (!empty($book)) {
                $sql .= "a.book_name = ? AND a.chapter_num = ?";
                $params[] = $book;
                $params[] = $chapter;
            } else {
                return null;
            }

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $article = $stmt->fetch();

            if (!$article) return null;

            // Increment views count asynchronously
            try {
                $upd = $this->pdo->prepare("UPDATE articles SET views_count = views_count + 1 WHERE id = ?");
                $upd->execute([$article['id']]);
            } catch (Throwable) {}

            // Format body content
            $rawContent = $article['content'] ?? '';
            $article['formatted_html'] = $this->formatVersesHtml($rawContent);

            // Fetch adjacent navigation (previous and next articles in same section / book)
            $article['prev_article'] = $this->getAdjacentArticle((int)$article['id'], (int)$article['section_id'], -1);
            $article['next_article'] = $this->getAdjacentArticle((int)$article['id'], (int)$article['section_id'], 1);

            return $article;
        } catch (Throwable $e) {
            error_log('[BibleEncyclopediaService] getArticle error: ' . $e->getMessage());
            return null;
        }
    }

    private function getAdjacentArticle(int $currentId, int $sectionId, int $direction): ?array
    {
        try {
            if ($direction > 0) {
                $stmt = $this->pdo->prepare("SELECT id, title, slug, book_name, chapter_num FROM articles WHERE section_id = ? AND id > ? ORDER BY id ASC LIMIT 1");
            } else {
                $stmt = $this->pdo->prepare("SELECT id, title, slug, book_name, chapter_num FROM articles WHERE section_id = ? AND id < ? ORDER BY id DESC LIMIT 1");
            }
            $stmt->execute([$sectionId, $currentId]);
            $res = $stmt->fetch();
            return $res ?: null;
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * High-speed Full Text Search (FTS5).
     */
    public function search(string $query, string $scope = 'all', int $sectionId = 0, int $limit = 20, int $offset = 0): array
    {
        $query = trim($query);
        if (empty($query)) {
            return [
                'query' => '',
                'scope' => $scope,
                'total' => 0,
                'limit' => $limit,
                'offset' => $offset,
                'results' => [],
            ];
        }

        if (!$this->pdo) {
            return [
                'query' => $query,
                'scope' => $scope,
                'total' => 0,
                'limit' => $limit,
                'offset' => $offset,
                'results' => [],
                'error' => 'Database connection unavailable',
            ];
        }

        try {
            $normalizedQuery = $this->normArabic($query);
            $ftsTokens = preg_split('/\s+/u', $normalizedQuery, -1, PREG_SPLIT_NO_EMPTY);
            $safeTokens = [];
            foreach ($ftsTokens as $token) {
                $clean = preg_replace('/[^\p{L}\p{N}]/u', '', $token);
                if (!empty($clean)) {
                    $safeTokens[] = '"' . $clean . '"*';
                }
            }

            if (empty($safeTokens)) {
                $matchExpression = '"' . str_replace('"', '""', $query) . '"';
            } else {
                $matchExpression = implode(' AND ', $safeTokens);
            }

            // Count total matches in FTS5
            $countSql = "SELECT COUNT(*) as total FROM fts_articles WHERE fts_articles MATCH ?";
            $countStmt = $this->pdo->prepare($countSql);
            $countStmt->execute([$matchExpression]);
            $totalCount = (int)$countStmt->fetchColumn();

            // Fetch Paginated Results with Snippet & Highlight
            $searchSql = "
                SELECT 
                    a.id,
                    a.section_id,
                    a.slug,
                    a.title,
                    a.subtitle,
                    a.book_name,
                    a.chapter_num,
                    s.title as section_title,
                    s.icon as section_icon,
                    c.title as category_title,
                    snippet(fts_articles, 2, '<mark class=\"bg-[#c29938]/30 text-amber-200 font-bold px-1 rounded\">', '</mark>', '...', 32) as snippet
                FROM fts_articles f
                JOIN articles a ON f.rowid = a.id
                LEFT JOIN sections s ON a.section_id = s.id
                LEFT JOIN categories c ON s.category_id = c.id
                WHERE fts_articles MATCH ?
            ";

            $params = [$matchExpression];
            if ($sectionId > 0) {
                $searchSql .= " AND a.section_id = ?";
                $params[] = $sectionId;
            }

            $searchSql .= " ORDER BY bm25(fts_articles) ASC LIMIT ? OFFSET ?";
            $params[] = $limit;
            $params[] = $offset;

            $stmt = $this->pdo->prepare($searchSql);
            $stmt->execute($params);
            $results = $stmt->fetchAll();

            return [
                'query' => $query,
                'normalized_query' => $normalizedQuery,
                'scope' => $scope,
                'total' => $totalCount,
                'limit' => $limit,
                'offset' => $offset,
                'results' => $results,
            ];
        } catch (Throwable $e) {
            error_log('[BibleEncyclopediaService] search error: ' . $e->getMessage());
            // Fallback LIKE search if FTS syntax edge case happens
            return $this->fallbackLikeSearch($query, $sectionId, $limit, $offset);
        }
    }

    private function fallbackLikeSearch(string $query, int $sectionId, int $limit, int $offset): array
    {
        try {
            $likeParam = '%' . $query . '%';
            $sql = "SELECT a.id, a.section_id, a.slug, a.title, a.subtitle, a.book_name, a.chapter_num,
                           s.title as section_title, s.icon as section_icon, c.title as category_title,
                           substr(a.content, 1, 200) as snippet
                    FROM articles a
                    LEFT JOIN sections s ON a.section_id = s.id
                    LEFT JOIN categories c ON s.category_id = c.id
                    WHERE (a.title LIKE ? OR a.content LIKE ?)";
            $params = [$likeParam, $likeParam];
            if ($sectionId > 0) {
                $sql .= " AND a.section_id = ?";
                $params[] = $sectionId;
            }
            $sql .= " LIMIT ? OFFSET ?";
            $params[] = $limit;
            $params[] = $offset;

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();

            return [
                'query' => $query,
                'scope' => 'fallback_like',
                'total' => count($rows),
                'limit' => $limit,
                'offset' => $offset,
                'results' => $rows,
            ];
        } catch (Throwable $e) {
            return [
                'query' => $query,
                'total' => 0,
                'results' => [],
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Statistics and Daily Verses.
     */
    public function getStats(): array
    {
        $totalDocs = 49249;
        $totalSections = 37;
        $totalCategories = 4;

        if ($this->pdo) {
            try {
                $stmtDocs = $this->pdo->query("SELECT COUNT(*) FROM articles");
                if ($stmtDocs) $totalDocs = (int)$stmtDocs->fetchColumn();
                $stmtSecs = $this->pdo->query("SELECT COUNT(*) FROM sections");
                if ($stmtSecs) $totalSections = (int)$stmtSecs->fetchColumn();
            } catch (Throwable) {}
        }

        $dailyVerses = [
            ['text' => 'سِرَاجٌ لِرِجْلِي كَلاَمُكَ وَنُورٌ لِسَبِيلِي', 'ref' => 'مزمور 119 : 105', 'theme' => 'إرشاد ونور'],
            ['text' => 'فِي الْبَدْءِ كَانَ الْكَلِمَةُ، وَالْكَلِمَةُ كَانَ عِنْدَ اللهِ، وَكَانَ الْكَلِمَةُ اللهَ', 'ref' => 'يوحنا 1 : 1', 'theme' => 'لاهوت الكلمة'],
            ['text' => 'اَلرَّبُّ رَاعِيَّ فَلاَ يُعْوِزُنِي شَيْءٌ', 'ref' => 'مزمور 23 : 1', 'theme' => 'رعاية وسلام'],
            ['text' => 'كُلُّ شَيْءٍ بِهِ كَانَ، وَبِغَيْرِهِ لَمْ يَكُنْ شَيْءٌ مِمَّا كَانَ', 'ref' => 'يوحنا 1 : 3', 'theme' => 'الخلق والحياة'],
            ['text' => 'أَسْتَطِيعُ كُلَّ شَيْءٍ فِي الْمَسِيحِ الَّذِي يُقَوِّينِي', 'ref' => 'فيلبي 4 : 13', 'theme' => 'قوة ورجاء'],
            ['text' => 'تَعَالَوْا إِلَيَّ يَا جَمِيعَ الْمُتْعَبِينَ وَالثَّقِيلِي الأَحْمَالِ، وَأَنَا أُرِيحُكُمْ', 'ref' => 'متى 11 : 28', 'theme' => 'راحة وفداء'],
            ['text' => 'هكَذَا أَحَبَّ اللهُ الْعَالَمَ حَتَّى بَذَلَ ابْنَهُ الْوَحِيدَ', 'ref' => 'يوحنا 3 : 16', 'theme' => 'محبة الله'],
        ];

        // Seed daily verse by day of year
        $dayOfYear = (int)date('z');
        $todayVerse = $dailyVerses[$dayOfYear % count($dailyVerses)];

        return [
            'total_articles' => $totalDocs,
            'total_sections' => $totalSections,
            'total_categories' => $totalCategories,
            'daily_verse' => $todayVerse,
            'all_daily_verses' => $dailyVerses,
        ];
    }

    /**
     * Helper to format plain text / html body into beautiful biblical verses.
     */
    public function formatVersesHtml(string $body): string
    {
        $body = trim($body);
        if (empty($body)) return '';

        // Unescape entities
        $body = html_entity_decode($body, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $body = str_replace(["\xc2\xa0", '&nbsp;'], ' ', $body);
        $body = preg_replace('/[ \t]+/u', ' ', $body);

        // If body is already HTML (commentaries, theology, agpeya)
        if (strpos($body, '<p') !== false || strpos($body, '<div') !== false || strpos($body, '<table') !== false) {
            $body = preg_replace('/class=MsoNormal/i', 'class="verse-p leading-relaxed mb-4"', $body);
            $body = preg_replace('/style=[\'"][^\'"]*font-family:[^\'"]*[\'"]/i', '', $body);
            $body = preg_replace('/style=[\'"][^\'"]*font-size:[^\'"]*[\'"]/i', '', $body);
            // Replace HTTP takla image links with local fallback or secure images
            $body = preg_replace('/src=[\'"]http:\/\/st-takla\.org\/([^\'"]+)[\'"]/i', 'src="/bible-images/$1"', $body);
            return $body;
        }

        // Parse numbered biblical verses: (1) ... (2) ... or 1: ... 2: ...
        $lines = preg_split('/\r\n|\r|\n/', $body);
        $html = '<div class="biblical-chapter-content space-y-3">';

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) continue;

            // Match verse number at the start: "1 في البدء..." or "(1) في البدء..." or "1: في البدء..."
            if (preg_match('/^(\(?(\d+)\)?[:\.\-\s]+)(.+)$/u', $line, $m)) {
                $vNum = $m[2];
                $vText = trim($m[3]);
                $html .= '<div class="verse-item flex items-start gap-3 p-3 rounded-2xl bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/60 hover:border-[#c29938]/40 transition-all duration-200 group" id="v-' . $vNum . '">';
                $html .= '<span class="verse-number shrink-0 px-2 py-0.5 rounded-lg bg-[#c29938]/15 border border-[#c29938]/30 text-[#c29938] font-bold text-xs font-mono select-none group-hover:bg-[#c29938] group-hover:text-slate-950 transition-all">' . $vNum . '</span>';
                $html .= '<p class="verse-text text-base sm:text-lg leading-relaxed text-slate-100 font-serif flex-1">' . htmlspecialchars($vText, ENT_QUOTES, 'UTF-8') . '</p>';
                $html .= '</div>';
            } else {
                $html .= '<p class="text-base sm:text-lg leading-relaxed text-slate-200 my-2">' . htmlspecialchars($line, ENT_QUOTES, 'UTF-8') . '</p>';
            }
        }

        $html .= '</div>';
        return $html;
    }

    /**
     * Normalize Arabic text for precise FTS search matching.
     */
    private function normArabic(string $s): string
    {
        $s = mb_strtolower($s, 'UTF-8');
        // Remove Tashkeel (diacritics)
        $s = preg_replace('/[\x{064B}-\x{065F}\x{0670}\x{06D6}-\x{06ED}]/u', '', $s);
        // Normalize Alefs
        $s = preg_replace('/[أإآٱ]/u', 'ا', $s);
        // Normalize Yaa / Alef Maqsura
        $s = preg_replace('/[ىي]/u', 'ي', $s);
        // Normalize Taa Marbuta
        $s = preg_replace('/ة/u', 'ه', $s);
        return trim($s);
    }
}
