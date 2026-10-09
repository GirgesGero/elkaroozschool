<?php
// backend-api/src/Services/BibleDataService.php
// Production-Ready Ultra-Memory-Efficient Distributed Data Service for Bible Encyclopedia v1.0
// Supports: Local Memory LRU -> Hostinger Disk Cache -> Google Apps Script Bridge -> Google Drive

declare(strict_types=1);

namespace App\Services;

use App\Utils\AppRoot;
use Throwable;

class BibleDataService
{
    private string $datasetPath;
    private string $cachePath;
    private string $version = 'v1';
    private ?GoogleAppsScriptBridgeService $gasBridge = null;
    private ?GoogleDriveService $driveService = null;
    
    // In-memory cache for the current request
    private ?array $manifest = null;
    private ?array $categories = null;
    private ?array $sections = null;
    private ?array $articleMap = null;
    private ?array $slugMap = null;
    private ?array $titleIndex = null;
    private array $loadedShards = [];
    private array $loadedChunks = [];
    private array $loadedSectionArticles = [];

    public function __construct(?string $version = null)
    {
        $this->version = $version ?: (getenv('GOOGLE_DRIVE_DATASET_VERSION') ?: 'v1');
        $this->datasetPath = AppRoot::path("storage/bible-dataset/{$this->version}");
        $this->cachePath = AppRoot::path("storage/cache/bible/{$this->version}");
        
        if (!is_dir($this->cachePath)) {
            @mkdir($this->cachePath, 0755, true);
        }
    }

    /**
     * Get or initialize Google Apps Script Bridge Service
     */
    private function getGasBridge(): GoogleAppsScriptBridgeService
    {
        if ($this->gasBridge === null) {
            $this->gasBridge = new GoogleAppsScriptBridgeService();
        }
        return $this->gasBridge;
    }

    /**
     * Get or initialize GoogleDriveService instance if credentials exist
     */
    private function getDriveService(): ?GoogleDriveService
    {
        if ($this->driveService === null) {
            $keyPath = getenv('GOOGLE_SERVICE_ACCOUNT_JSON_PATH');
            if (!$keyPath) {
                $candidate1 = dirname(AppRoot::path('')) . '/config/service-account.json';
                $candidate2 = AppRoot::path('config/service-account.json');
                if (is_file($candidate1)) {
                    $keyPath = $candidate1;
                } elseif (is_file($candidate2)) {
                    $keyPath = $candidate2;
                }
            }

            if ($keyPath && is_file($keyPath)) {
                try {
                    $this->driveService = new GoogleDriveService($keyPath);
                } catch (Throwable $e) {
                    $this->driveService = null;
                }
            }
        }
        return $this->driveService;
    }

    /**
     * Retrieve file content using Multi-Tier Strategy:
     * Tier 1: Local Disk Cache (.gz or uncompressed)
     * Tier 2: Local Dataset Directory (.gz or uncompressed)
     * Tier 3: Google Apps Script Secure Bridge -> Google Drive v1 (saves to local cache)
     * Tier 4: Direct Google Drive Service Account Fallback (if key is provided)
     */
    public function getFileContent(string $relPath): ?string
    {
        $relPath = ltrim(str_replace(['..', '\\'], ['', '/'], $relPath), '/');

        // Tier 1: Check local cache
        $cachedGz = "{$this->cachePath}/{$relPath}.gz";
        if (is_file($cachedGz)) {
            $raw = @file_get_contents($cachedGz);
            if ($raw !== false) {
                $decoded = @gzdecode($raw);
                if ($decoded !== false) return $decoded;
            }
        }

        $cachedJson = "{$this->cachePath}/{$relPath}";
        if (is_file($cachedJson)) {
            $content = @file_get_contents($cachedJson);
            if ($content !== false) return $content;
        }

        // Tier 2: Check local dataset directory
        $datasetGz = "{$this->datasetPath}/{$relPath}.gz";
        if (is_file($datasetGz)) {
            $raw = @file_get_contents($datasetGz);
            if ($raw !== false) {
                $decoded = @gzdecode($raw);
                if ($decoded !== false) return $decoded;
            }
        }

        $datasetJson = "{$this->datasetPath}/{$relPath}";
        if (is_file($datasetJson)) {
            $content = @file_get_contents($datasetJson);
            if ($content !== false) return $content;
        }

        // Tier 3: Google Apps Script Bridge (On-Demand Cloud Fetch)
        $bridge = $this->getGasBridge();
        if ($bridge->isConfigured()) {
            try {
                $content = $bridge->fetchFileByPath($relPath);
                if ($content !== null && $content !== '') {
                    // Save into cache for instant subsequent requests
                    $targetCache = "{$this->cachePath}/{$relPath}";
                    $cacheDir = dirname($targetCache);
                    if (!is_dir($cacheDir)) {
                        @mkdir($cacheDir, 0755, true);
                    }
                    @file_put_contents($targetCache, $content);
                    return $content;
                }
            } catch (Throwable $e) {
                error_log('[BibleDataService] Apps Script bridge fetch error: ' . $e->getMessage());
            }
        }

        // Tier 4: Service Account fallback (if configured)
        $drive = $this->getDriveService();
        if ($drive !== null) {
            try {
                $bibleFolderId = getenv('GOOGLE_DRIVE_BIBLE_ID') ?: '1hi5NoKnzdLW6UQ96SsRgYWerGle5iT_e';
                $dirName = dirname($relPath);
                $fileName = basename($relPath);

                $folderId = $dirName === '.' || $dirName === '' ? $bibleFolderId : $drive->findSubfolderId($dirName, $bibleFolderId);
                if ($folderId) {
                    $fileMeta = $drive->findFileInFolder($fileName, $folderId);
                    if ($fileMeta && !empty($fileMeta['id'])) {
                        $targetCache = "{$this->cachePath}/{$relPath}";
                        $cacheDir = dirname($targetCache);
                        if (!is_dir($cacheDir)) {
                            @mkdir($cacheDir, 0755, true);
                        }
                        if ($drive->downloadFile((string)$fileMeta['id'], $targetCache)) {
                            $content = @file_get_contents($targetCache);
                            if ($content !== false) return $content;
                        }
                    }
                }
            } catch (Throwable $e) {
                error_log('[BibleDataService] Service Account fetch error: ' . $e->getMessage());
            }
        }

        return null;
    }

    /**
     * Get Dataset Manifest
     */
    public function getManifest(): array
    {
        if ($this->manifest === null) {
            $content = $this->getFileContent('manifest.json');
            if ($content !== null) {
                $this->manifest = json_decode($content, true) ?: [];
            } else {
                $this->manifest = [
                    'dataset_version' => $this->version,
                    'status' => 'online',
                    'statistics' => [
                        'article_count' => 49249,
                        'category_count' => 4,
                        'section_count' => 37,
                        'chunk_count' => 484,
                        'search_shard_count' => 64,
                        'image_count' => 15
                    ]
                ];
            }
        }
        return $this->manifest;
    }

    /**
     * Get Categories
     */
    public function getCategories(): array
    {
        if ($this->categories === null) {
            $content = $this->getFileContent('categories.json');
            if ($content !== null) {
                $this->categories = json_decode($content, true) ?: [];
            } else {
                $this->categories = [];
            }
        }
        return $this->categories;
    }

    /**
     * Get Sections (optionally filtered by category code)
     */
    public function getSections(?string $categoryCode = null): array
    {
        if ($this->sections === null) {
            $content = $this->getFileContent('sections.json');
            if ($content !== null) {
                $this->sections = json_decode($content, true) ?: [];
            } else {
                $this->sections = [];
            }
        }

        if (empty($categoryCode)) {
            return $this->sections;
        }

        $categories = $this->getCategories();
        $targetCatId = null;
        foreach ($categories as $cat) {
            if (($cat['code'] ?? '') === $categoryCode) {
                $targetCatId = (int)($cat['id'] ?? 0);
                break;
            }
        }

        if ($targetCatId === null) {
            return [];
        }

        return array_values(array_filter($this->sections, fn($s) => (int)($s['category_id'] ?? 0) === $targetCatId));
    }

    /**
     * Get Categories and grouped Sections
     */
    public function getCategoriesAndSections(): array
    {
        $categories = $this->getCategories();
        $sections = $this->getSections();

        $sectionsByCat = [];
        foreach ($sections as $s) {
            $catId = (int)($s['category_id'] ?? 0);
            $sectionsByCat[$catId][] = $s;
        }

        $result = [];
        foreach ($categories as $cat) {
            $catId = (int)($cat['id'] ?? 0);
            $cat['sections'] = $sectionsByCat[$catId] ?? [];
            $result[] = $cat;
        }

        return $result;
    }

    /**
     * Get Article Map (O(1) lookup)
     */
    private function getArticleMap(): array
    {
        if ($this->articleMap === null) {
            $content = $this->getFileContent('indexes/article-map.json');
            if ($content !== null) {
                $this->articleMap = json_decode($content, true) ?: [];
            } else {
                $this->articleMap = [];
            }
        }
        return $this->articleMap;
    }

    /**
     * Get Slug Map
     */
    private function getSlugMap(): array
    {
        if ($this->slugMap === null) {
            $content = $this->getFileContent('indexes/slug-map.json');
            if ($content !== null) {
                $this->slugMap = json_decode($content, true) ?: [];
            } else {
                $this->slugMap = [];
            }
        }
        return $this->slugMap;
    }

    /**
     * Get Article by ID or Slug (reads only the single required chunk with LRU memory bounds)
     */
    public function getArticle(int $id = 0, string $slug = '', string $path = '', string $book = '', int $ch = 1): ?array
    {
        $articleMap = $this->getArticleMap();
        $targetId = $id;

        if ($targetId <= 0 && !empty($slug)) {
            $slugMap = $this->getSlugMap();
            $targetId = (int)($slugMap[$slug] ?? 0);
            if ($targetId <= 0) {
                $targetId = (int)($slugMap[urldecode($slug)] ?? ($slugMap[$slug . '.htm'] ?? 0));
            }
        }

        if ($targetId <= 0) {
            return null;
        }

        $mapEntry = $articleMap[(string)$targetId] ?? null;
        if (!$mapEntry) {
            return null;
        }

        $chunkRelPath = $mapEntry['c']; // e.g. "sec-01/chunk-001.json"
        $pos = (int)$mapEntry['p'];

        // Secure chunk path against directory traversal
        $chunkRelPath = ltrim(str_replace(['..', '\\'], ['', '/'], $chunkRelPath), '/');

        // Load chunk with LRU eviction (keep max 3 chunks in memory)
        if (!isset($this->loadedChunks[$chunkRelPath])) {
            if (count($this->loadedChunks) >= 3) {
                array_shift($this->loadedChunks); // Evict oldest
            }

            $content = $this->getFileContent("articles/{$chunkRelPath}");
            if ($content !== null) {
                $this->loadedChunks[$chunkRelPath] = json_decode($content, true) ?: [];
            } else {
                return null;
            }
        }

        $chunkData = $this->loadedChunks[$chunkRelPath];
        $article = $chunkData['articles'][$pos] ?? null;

        if (!$article) {
            return null;
        }

        // Add Prev / Next navigation references
        $prevId = $targetId > 1 ? $targetId - 1 : null;
        $nextId = $targetId < 49249 ? $targetId + 1 : null;

        $article['prev_id'] = $prevId;
        $article['next_id'] = $nextId;

        // Add section title
        $sections = $this->getSections();
        foreach ($sections as $sec) {
            if ((int)($sec['id'] ?? 0) === (int)($article['section_id'] ?? 0)) {
                $article['section_title'] = $sec['title'] ?? '';
                $article['section_code'] = $sec['code'] ?? '';
                break;
            }
        }

        return $article;
    }

    /**
     * Get paginated articles list for a section (Reads only the small section index)
     */
    public function getArticlesBySection(int $sectionId, int $page = 1, int $limit = 20): array
    {
        $sections = $this->getSections();
        $secCode = null;
        foreach ($sections as $sec) {
            if ((int)($sec['id'] ?? 0) === $sectionId) {
                $secCode = $sec['code'] ?? '';
                break;
            }
        }

        if (!$secCode) {
            return ['section_id' => $sectionId, 'total' => 0, 'page' => $page, 'limit' => $limit, 'items' => []];
        }

        if (!isset($this->loadedSectionArticles[$secCode])) {
            $content = $this->getFileContent("indexes/sections/{$secCode}.json");
            if ($content !== null) {
                $this->loadedSectionArticles[$secCode] = json_decode($content, true) ?: [];
            } else {
                $this->loadedSectionArticles[$secCode] = [];
            }
        }

        $items = $this->loadedSectionArticles[$secCode];
        $total = count($items);
        $offset = max(0, ($page - 1) * $limit);
        $slice = array_slice($items, $offset, $limit);

        return [
            'section_id' => $sectionId,
            'section_code' => $secCode,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => (int)ceil($total / max(1, $limit)),
            'items' => $slice
        ];
    }

    /**
     * Title Index (Instant Title Search)
     */
    private function getTitleIndex(): array
    {
        if ($this->titleIndex === null) {
            $content = $this->getFileContent('search/title-index.json');
            if ($content !== null) {
                $this->titleIndex = json_decode($content, true) ?: [];
            } else {
                $this->titleIndex = [];
            }
        }
        return $this->titleIndex;
    }

    /**
     * Normalize Arabic string
     */
    public function normalizeArabic(string $text): string
    {
        if (empty($text)) {
            return '';
        }
        // Remove diacritics
        $text = (string)preg_replace('/[\x{064B}-\x{065F}\x{0670}]/u', '', $text);
        // Normalize alef
        $text = (string)preg_replace('/[إأآٱ]/u', 'ا', $text);
        // Normalize teh marbuta
        $text = (string)preg_replace('/ة/u', 'ه', $text);
        // Normalize yeh
        $text = (string)preg_replace('/[ىي]/u', 'ي', $text);
        return mb_strtolower(trim($text), 'UTF-8');
    }

    /**
     * Tokenize search query
     */
    private function tokenizeQuery(string $query): array
    {
        $norm = $this->normalizeArabic($query);
        preg_match_all('/[^\W\d_]+/u', $norm, $matches);
        $tokens = [];
        foreach ($matches[0] ?? [] as $t) {
            if (mb_strlen($t, 'UTF-8') >= 2) {
                $tokens[] = $t;
            }
        }
        return array_unique($tokens);
    }

    /**
     * Load a single search shard by shard ID (0 to 63)
     */
    private function loadSearchShard(int $shardId): array
    {
        $shardId = max(0, min(63, $shardId));
        if (isset($this->loadedShards[$shardId])) {
            return $this->loadedShards[$shardId];
        }

        // Keep max 2 shards in memory simultaneously
        if (count($this->loadedShards) >= 2) {
            array_shift($this->loadedShards);
        }

        $shardFile = sprintf("search/shards/shard-%02d.json", $shardId);
        $content = $this->getFileContent($shardFile);
        if ($content !== null) {
            $this->loadedShards[$shardId] = json_decode($content, true) ?: [];
        } else {
            $this->loadedShards[$shardId] = [];
        }

        return $this->loadedShards[$shardId];
    }

    /**
     * Full Search Engine (loads ONLY required shard(s))
     */
    public function search(string $query, int $sectionId = 0, string $scope = 'all', int $page = 1, int $limit = 20): array
    {
        $query = trim($query);
        if (empty($query)) {
            return ['total' => 0, 'page' => $page, 'limit' => $limit, 'items' => []];
        }

        $tokens = $this->tokenizeQuery($query);
        if (empty($tokens)) {
            return ['total' => 0, 'page' => $page, 'limit' => $limit, 'items' => []];
        }

        $titleIndex = $this->getTitleIndex();
        $articleMap = $this->getArticleMap();

        $tokenMatches = [];

        foreach ($tokens as $token) {
            $tokenPostings = [];

            // Title match
            $titleHits = $titleIndex[$token] ?? [];
            foreach ($titleHits as $id) {
                $tokenPostings[$id] = 10; // title weight
            }

            if ($scope !== 'title') {
                // Calculate EXACT shard for this token: CRC32(token) % 64
                $shardId = (int)(abs(crc32($token)) % 64);
                $shard = $this->loadSearchShard($shardId);
                $bodyHits = $shard[$token] ?? [];

                foreach ($bodyHits as $id) {
                    $tokenPostings[$id] = ($tokenPostings[$id] ?? 0) + 1; // body weight
                }
            }

            if (empty($tokenPostings)) {
                return ['total' => 0, 'page' => $page, 'limit' => $limit, 'items' => []];
            }

            $tokenMatches[] = $tokenPostings;
        }

        // Intersect matches for all tokens (AND Search)
        $firstMatch = $tokenMatches[0];
        $intersected = [];

        foreach ($firstMatch as $artId => $score) {
            $allPresent = true;
            $totalScore = $score;

            for ($i = 1; $i < count($tokenMatches); $i++) {
                if (!isset($tokenMatches[$i][$artId])) {
                    $allPresent = false;
                    break;
                }
                $totalScore += $tokenMatches[$i][$artId];
            }

            if ($allPresent) {
                // Section filter check
                if ($sectionId > 0) {
                    $entry = $articleMap[(string)$artId] ?? null;
                    if (!$entry || (int)($entry['s'] ?? 0) !== $sectionId) {
                        continue;
                    }
                }
                $intersected[$artId] = $totalScore;
            }
        }

        // Rank by score descending
        arsort($intersected);

        $totalResults = count($intersected);
        $offset = max(0, ($page - 1) * $limit);
        $pageIds = array_slice(array_keys($intersected), $offset, $limit);

        // Fetch minimal metadata for top page results only
        $results = [];
        foreach ($pageIds as $id) {
            $art = $this->getArticle((int)$id);
            if ($art) {
                $snippet = strip_tags($art['content'] ?? '');
                $snippet = mb_substr($snippet, 0, 160, 'UTF-8') . '...';
                
                $results[] = [
                    'id' => $art['id'] ?? $id,
                    'title' => $art['title'] ?? '',
                    'slug' => $art['slug'] ?? '',
                    'section_id' => $art['section_id'] ?? 0,
                    'section_title' => $art['section_title'] ?? '',
                    'book_name' => $art['book_name'] ?? '',
                    'chapter_num' => $art['chapter_num'] ?? 1,
                    'snippet' => $snippet,
                    'score' => $intersected[$id]
                ];
            }
        }

        return [
            'query' => $query,
            'total' => $totalResults,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => (int)ceil($totalResults / max(1, $limit)),
            'items' => $results
        ];
    }
}
