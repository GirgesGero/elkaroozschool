<?php

namespace App\Services;

/**
 * Class LectureAnnouncementService
 * Manages weekly lecture announcements, graphic generation integration,
 * duplicate prevention, and publishing to the Global Feed.
 */
class LectureAnnouncementService
{
    private StorageBridgeService $storageService;
    private AuditLogService $auditService;
    private SupabaseClient $supabase;

    public function __construct(
        StorageBridgeService $storageService,
        AuditLogService $auditService,
        SupabaseClient $supabase
    ) {
        $this->storageService = $storageService;
        $this->auditService = $auditService;
        $this->supabase = $supabase;
    }

    /**
     * Publishes a weekly lecture announcement to Global Feed with duplicate check.
     *
     * @param string $groupId
     * @param string $groupName
     * @param string $fridayDate
     * @param array $lecture1 ['title' => string, 'lecturer_name' => string, 'image' => ?string]
     * @param array $lecture2 ['title' => string, 'lecturer_name' => string, 'image' => ?string]
     * @param string $imageStoragePath
     * @param string $actorId
     * @return array
     */
    public function publishWeeklyAnnouncement(
        string $groupId,
        string $groupName,
        string $fridayDate,
        array $lecture1,
        array $lecture2,
        string $imageStoragePath,
        string $actorId
    ): array {
        // 1. Duplicate Prevention Check
        $filter = sprintf('content=like.*%s*&author_id=eq.%s', urlencode($fridayDate), urlencode($actorId));
        $existing = $this->supabase->query('feed_posts?' . $filter);

        if (!empty($existing['data'])) {
            return [
                'success' => false,
                'message' => 'Duplicate announcement prevented: Post already exists for this Friday date.',
                'post_id' => $existing['data'][0]['id'] ?? null
            ];
        }

        // 2. Compose Feed Post Text
        $postContent = sprintf(
            "📢 إعلان محاضرات يوم الجمعة (%s) — %s:\n\n" .
            "1️⃣ المحاضرة الأولى: %s (تقديم: %s)\n" .
            "2️⃣ المحاضرة الثانية: %s (تقديم: %s)\n\n" .
            "مواعيد الحضور تبدأ من الساعة 6:00 مساءً بمقر مدرسة الكاروز.",
            $fridayDate,
            $groupName,
            $lecture1['title'] ?? '',
            $lecture1['lecturer_name'] ?? '',
            $lecture2['title'] ?? '',
            $lecture2['lecturer_name'] ?? ''
        );

        // 3. Create Feed Post Record
        $postPayload = [
            'author_id' => $actorId,
            'content_text' => $postContent,
            'content' => $postContent,
            'created_at' => date('c')
        ];

        $postResult = $this->supabase->query('feed_posts', 'POST', $postPayload);

        if (empty($postResult['data'])) {
            throw new \RuntimeException('Failed to create announcement feed post.');
        }

        $postId = $postResult['data'][0]['id'];

        // 4. Attach Image Record if table exists
        if ($imageStoragePath) {
            $this->supabase->query('post_images', 'POST', [
                'post_id' => $postId,
                'storage_path' => $imageStoragePath,
                'image_url' => $imageStoragePath
            ]);
        }

        // 5. Record Immutable Audit Log
        AuditLogService::log(
            $actorId,
            'إدارة',
            'admin',
            'CREATE_ANNOUNCEMENT',
            'feed_posts',
            (string)$postId,
            null,
            [
                'group_id' => $groupId,
                'friday_date' => $fridayDate,
                'image' => $imageStoragePath
            ]
        );

        return [
            'success' => true,
            'message' => 'Weekly lecture announcement published successfully.',
            'post_id' => $postId
        ];
    }
}
