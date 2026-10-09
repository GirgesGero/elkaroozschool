-- Phase 0 media metadata inventory; SELECT-only, aggregate counts.
-- Run only against the owner-confirmed staging project.
-- No URLs, IDs, file contents, personal values, or writes are returned/performed.
-- Verified manually through Supabase MCP on 2026-10-04.

-- 1. Nonblank references by source field.
SELECT 'books.file_url' AS field, count(*) AS rows_total,
       count(*) FILTER (WHERE file_url IS NULL OR btrim(file_url) = '') AS blank_refs,
       count(*) FILTER (WHERE file_url IS NOT NULL AND btrim(file_url) <> '') AS nonblank_refs
FROM public.books
UNION ALL
SELECT 'books.cover_url', count(*),
       count(*) FILTER (WHERE cover_url IS NULL OR btrim(cover_url) = ''),
       count(*) FILTER (WHERE cover_url IS NOT NULL AND btrim(cover_url) <> '')
FROM public.books
UNION ALL
SELECT 'researches.file_url', count(*),
       count(*) FILTER (WHERE file_url IS NULL OR btrim(file_url) = ''),
       count(*) FILTER (WHERE file_url IS NOT NULL AND btrim(file_url) <> '')
FROM public.researches
UNION ALL
SELECT 'curriculums.file_url', count(*),
       count(*) FILTER (WHERE file_url IS NULL OR btrim(file_url) = ''),
       count(*) FILTER (WHERE file_url IS NOT NULL AND btrim(file_url) <> '')
FROM public.curriculums
UNION ALL
SELECT 'lectures.audio_url', count(*),
       count(*) FILTER (WHERE audio_url IS NULL OR btrim(audio_url) = ''),
       count(*) FILTER (WHERE audio_url IS NOT NULL AND btrim(audio_url) <> '')
FROM public.lectures
UNION ALL
SELECT 'mp3_tracks.audio_url', count(*),
       count(*) FILTER (WHERE audio_url IS NULL OR btrim(audio_url) = ''),
       count(*) FILTER (WHERE audio_url IS NOT NULL AND btrim(audio_url) <> '')
FROM public.mp3_tracks
UNION ALL
SELECT 'gallery_items.image_url', count(*),
       count(*) FILTER (WHERE image_url IS NULL OR btrim(image_url) = ''),
       count(*) FILTER (WHERE image_url IS NOT NULL AND btrim(image_url) <> '')
FROM public.gallery_items
UNION ALL
SELECT 'gallery_albums.cover_url', count(*),
       count(*) FILTER (WHERE cover_url IS NULL OR btrim(cover_url) = ''),
       count(*) FILTER (WHERE cover_url IS NOT NULL AND btrim(cover_url) <> '')
FROM public.gallery_albums
UNION ALL
SELECT 'profiles.avatar_url', count(*),
       count(*) FILTER (WHERE avatar_url IS NULL OR btrim(avatar_url) = ''),
       count(*) FILTER (WHERE avatar_url IS NOT NULL AND btrim(avatar_url) <> '')
FROM public.profiles
UNION ALL
SELECT 'lecturers.avatar_url', count(*),
       count(*) FILTER (WHERE avatar_url IS NULL OR btrim(avatar_url) = ''),
       count(*) FILTER (WHERE avatar_url IS NOT NULL AND btrim(avatar_url) <> '')
FROM public.lecturers
UNION ALL
SELECT 'post_images.image_url', count(*),
       count(*) FILTER (WHERE image_url IS NULL OR btrim(image_url) = ''),
       count(*) FILTER (WHERE image_url IS NOT NULL AND btrim(image_url) <> '')
FROM public.post_images
UNION ALL
SELECT 'post_images.storage_path', count(*),
       count(*) FILTER (WHERE storage_path IS NULL OR btrim(storage_path) = ''),
       count(*) FILTER (WHERE storage_path IS NOT NULL AND btrim(storage_path) <> '')
FROM public.post_images
UNION ALL
SELECT 'backup_records.storage_path', count(*),
       count(*) FILTER (WHERE storage_path IS NULL OR btrim(storage_path) = ''),
       count(*) FILTER (WHERE storage_path IS NOT NULL AND btrim(storage_path) <> '')
FROM public.backup_records
UNION ALL
SELECT 'import_history.original_file_storage_path', count(*),
       count(*) FILTER (WHERE original_file_storage_path IS NULL OR btrim(original_file_storage_path) = ''),
       count(*) FILTER (WHERE original_file_storage_path IS NOT NULL AND btrim(original_file_storage_path) <> '')
FROM public.import_history
ORDER BY field;

-- 2. JSON shape and non-empty array counts (do not return JSON values).
SELECT field, json_type, count(*) AS rows,
       count(*) FILTER (WHERE CASE WHEN json_type = 'array' THEN jsonb_array_length(value) > 0 ELSE false END) AS nonempty_arrays,
       count(*) FILTER (WHERE json_type = 'object') AS objects
FROM (
  SELECT 'feed_posts.images_metadata' AS field,
         jsonb_typeof(images_metadata) AS json_type, images_metadata AS value
  FROM public.feed_posts
  UNION ALL
  SELECT 'lectures.attachments_metadata',
         jsonb_typeof(attachments_metadata), attachments_metadata
  FROM public.lectures
) AS media_json
GROUP BY field, json_type
ORDER BY field, json_type;

-- 3. Referential orphan counts only.
SELECT 'post_images without parent feed_posts' AS check_name, count(*) AS rows
FROM public.post_images i
LEFT JOIN public.feed_posts p ON p.id = i.post_id
WHERE p.id IS NULL
UNION ALL
SELECT 'gallery_items without parent album', count(*)
FROM public.gallery_items i
LEFT JOIN public.gallery_albums a ON a.id = i.album_id
WHERE a.id IS NULL;

-- 4. Soft-delete counts for media-bearing and related tables that expose deleted_at.
SELECT 'backup_records' AS table_name, count(*) AS total,
       count(*) FILTER (WHERE deleted_at IS NULL) AS active,
       count(*) FILTER (WHERE deleted_at IS NOT NULL) AS soft_deleted
FROM public.backup_records
UNION ALL
SELECT 'books', count(*), count(*) FILTER (WHERE deleted_at IS NULL), count(*) FILTER (WHERE deleted_at IS NOT NULL) FROM public.books
UNION ALL
SELECT 'curriculums', count(*), count(*) FILTER (WHERE deleted_at IS NULL), count(*) FILTER (WHERE deleted_at IS NOT NULL) FROM public.curriculums
UNION ALL
SELECT 'feed_posts', count(*), count(*) FILTER (WHERE deleted_at IS NULL), count(*) FILTER (WHERE deleted_at IS NOT NULL) FROM public.feed_posts
UNION ALL
SELECT 'gallery_albums', count(*), count(*) FILTER (WHERE deleted_at IS NULL), count(*) FILTER (WHERE deleted_at IS NOT NULL) FROM public.gallery_albums
UNION ALL
SELECT 'gallery_items', count(*), count(*) FILTER (WHERE deleted_at IS NULL), count(*) FILTER (WHERE deleted_at IS NOT NULL) FROM public.gallery_items
UNION ALL
SELECT 'lecturers', count(*), count(*) FILTER (WHERE deleted_at IS NULL), count(*) FILTER (WHERE deleted_at IS NOT NULL) FROM public.lecturers
UNION ALL
SELECT 'lectures', count(*), count(*) FILTER (WHERE deleted_at IS NULL), count(*) FILTER (WHERE deleted_at IS NOT NULL) FROM public.lectures
UNION ALL
SELECT 'mp3_tracks', count(*), count(*) FILTER (WHERE deleted_at IS NULL), count(*) FILTER (WHERE deleted_at IS NOT NULL) FROM public.mp3_tracks
UNION ALL
SELECT 'profiles', count(*), count(*) FILTER (WHERE deleted_at IS NULL), count(*) FILTER (WHERE deleted_at IS NOT NULL) FROM public.profiles
UNION ALL
SELECT 'researches', count(*), count(*) FILTER (WHERE deleted_at IS NULL), count(*) FILTER (WHERE deleted_at IS NOT NULL) FROM public.researches
ORDER BY table_name;
