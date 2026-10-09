<?php
// backend-api/src/Controllers/BibleController.php
// Controller for Bible Encyclopedia v1.0 (Distributed Static Architecture)

declare(strict_types=1);

namespace App\Controllers;

use App\Services\BibleDataService;
use App\Utils\Response;
use App\Utils\SafeFailure;
use Throwable;

class BibleController
{
    private BibleDataService $service;

    public function __construct()
    {
        $this->service = new BibleDataService('v1');
    }

    /**
     * GET /bible/manifest
     */
    public function manifest(): void
    {
        try {
            $manifest = $this->service->getManifest();
            header('Cache-Control: public, max-age=86400, immutable');
            Response::success($manifest, 'تم جلب وثيقة الموسوعة بنجاح');
        } catch (Throwable $e) {
            SafeFailure::respond($e, 'فشل في جلب وثيقة الموسوعة');
        }
    }

    /**
     * GET /bible/sections
     */
    public function sections(): void
    {
        try {
            $categoryCode = isset($_GET['category']) ? trim((string)$_GET['category']) : null;
            $treeFormat = isset($_GET['grouped']) && $_GET['grouped'] === '1';

            if ($treeFormat) {
                $data = $this->service->getCategoriesAndSections();
            } else {
                $data = $this->service->getSections($categoryCode);
            }

            header('Cache-Control: public, max-age=86400, immutable');
            Response::success($data, 'تم جلب أقسام الموسوعة بنجاح');
        } catch (Throwable $e) {
            SafeFailure::respond($e, 'فشل في جلب أقسام الموسوعة');
        }
    }

    /**
     * GET /bible/section-articles
     */
    public function sectionArticles(): void
    {
        try {
            $sectionId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
            $limit = isset($_GET['limit']) ? min(50, max(1, (int)$_GET['limit'])) : 20;

            if ($sectionId <= 0) {
                Response::error('معرف القسم مطلوب', 'INVALID_PARAM', 400);
                return;
            }

            $data = $this->service->getArticlesBySection($sectionId, $page, $limit);
            header('Cache-Control: public, max-age=3600');
            Response::success($data, 'تم جلب مقالات القسم بنجاح');
        } catch (Throwable $e) {
            SafeFailure::respond($e, 'فشل في جلب مقالات القسم');
        }
    }

    /**
     * GET /bible/article
     */
    public function article(): void
    {
        try {
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            $slug = isset($_GET['slug']) ? trim((string)$_GET['slug']) : '';
            $path = isset($_GET['path']) ? trim((string)$_GET['path']) : '';
            $book = isset($_GET['book']) ? trim((string)$_GET['book']) : '';
            $ch = isset($_GET['ch']) ? (int)$_GET['ch'] : 1;

            if ($id === 0 && empty($slug) && empty($path) && empty($book)) {
                Response::error('يجب تمرير معرف المقال (id) أو الرابط (slug)', 'INVALID_PARAM', 400);
                return;
            }

            $article = $this->service->getArticle($id, $slug, $path, $book, $ch);

            if (!$article) {
                Response::error('المقال أو الإصحاح المطلوب غير موجود في الموسوعة', 'ARTICLE_NOT_FOUND', 404);
                return;
            }

            header('Cache-Control: public, max-age=86400, immutable');
            Response::success($article, 'تم جلب محتوى المقال بنجاح');
        } catch (Throwable $e) {
            SafeFailure::respond($e, 'فشل في جلب المقال');
        }
    }

    /**
     * GET /bible/search
     */
    public function search(): void
    {
        try {
            $q = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
            $scope = isset($_GET['scope']) ? trim((string)$_GET['scope']) : 'all';
            $sectionId = isset($_GET['section']) ? (int)$_GET['section'] : 0;
            $limit = isset($_GET['limit']) ? min(50, max(1, (int)$_GET['limit'])) : 20;
            $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;

            if (empty($q)) {
                Response::success([
                    'query' => '',
                    'total' => 0,
                    'limit' => $limit,
                    'page' => $page,
                    'items' => [],
                ], 'بحث فارغ');
                return;
            }

            $results = $this->service->search($q, $sectionId, $scope, $page, $limit);
            header('Cache-Control: public, max-age=1800');
            Response::success($results, "تم العثور على {$results['total']} نتيجة");
        } catch (Throwable $e) {
            SafeFailure::respond($e, 'فشل في تنفيذ البحث');
        }
    }

    /**
     * GET /bible/stats
     */
    public function stats(): void
    {
        try {
            $manifest = $this->service->getManifest();
            $data = [
                'total_articles' => $manifest['statistics']['article_count'] ?? 49249,
                'total_categories' => $manifest['statistics']['category_count'] ?? 4,
                'total_sections' => $manifest['statistics']['section_count'] ?? 37,
                'dataset_version' => $manifest['dataset_version'] ?? 'v1.0.0',
                'daily_verse' => [
                    'text' => 'فِي الْبَدْءِ كَانَ الْكَلِمَةُ، وَالْكَلِمَةُ كَانَ عِنْدَ اللهِ، وَكَانَ الْكَلِمَةُ اللهَ.',
                    'reference' => 'إنجيل يوحنا 1: 1'
                ]
            ];
            Response::success($data, 'إحصاءات الموسوعة وآية اليوم');
        } catch (Throwable $e) {
            SafeFailure::respond($e, 'فشل في جلب الإحصاءات');
        }
    }
}
