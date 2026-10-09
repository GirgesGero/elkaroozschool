# المرحلة 2 — عقد الملفات ونموذج البيانات والـ RLS (Schema & Metadata Contract)

> **الحالة:** مكتملة وجاهزة للمراجعة والاعتماد.  
> **التاريخ:** 4 أكتوبر 2026.  
> **المرجع:** [خطة نقل تخزين الملفات إلى Google Drive](GOOGLE_DRIVE_STORAGE_PLAN.md) — مهام 2.1 إلى 2.8.

---

## 1. القرار المعماري لنموذج البيانات (ADR 2.1)

### القرار: النموذج الهجين (Unified `media_assets` + Backward-Compatible Foreign Keys)
- **الخيار المعتمد:** إنشاء جدول مركزي موحد باسم `public.media_assets` لتوثيق كافة الأصول المرفوعة على Google Drive، مع الحفاظ على حقول الربط القديمة في الجداول القائمة لتجنب أي كسر مفاجئ للواجهة أو استعلامات SQL الحالية.
- **أسباب الاختيار:**
  1. **إدارة مركزية لملفات Drive:** يسهل حصر الحصص التخزينية (Quotas)، وتنفيذ عمليات الفحص الشامل (Integrity Checks)، وتتبع الملفات اليتيمة (Orphans)، ومراقبة أحجام الملفات بحسب الفرقة أو النوع.
  2. **فصل أسرار التخزين عن واجهة المستخدم:** معرفات Google Drive الداخلية (`drive_file_id`, `drive_folder_id`) تبقى داخل `media_assets` ولا يتم الاستعلام عنها مباشرة في الـ Feed أو قوائم الدروس العامة.
  3. **عزل الصلاحيات و RLS:** تطبيق سياسات RLS دقيقة وفق الفرقة (`group_id`) ومالك الملف (`uploaded_by`) على مستوى الأصول.
  4. **توافق رجعي سلس (Zero Downtime Migration):** استمرار عمل الحقول النصية القديمة (`file_url`, `audio_url`, `image_url`) كـ Proxy URLs تشير إلى مسار الـ Streaming في PHP API (`/api/storage/file/{asset_id}`).

---

## 2. العقد الأدنى للملف ومخطط جدول `media_assets` (2.2 & 2.5)

```sql
-- ============================================================================
-- Media Assets Central Registry
-- Migration: 20261004120000_create_media_assets.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- التصنيف والمورد المرتبط
    resource_type VARCHAR(64) NOT NULL CHECK (
        resource_type IN (
            'CURRICULUM',
            'LECTURE_AUDIO',
            'LECTURE_ATTACHMENT',
            'BOOK_FILE',
            'BOOK_COVER',
            'RESEARCH_FILE',
            'MP3_TRACK',
            'GALLERY_ITEM',
            'GALLERY_COVER',
            'POST_IMAGE',
            'AVATAR',
            'BACKUP_ARCHIVE',
            'IMPORT_FILE',
            'GENERAL'
        )
    ),
    resource_id UUID NULL,                      -- معرّف السجل المرتبط في جدوله الخاص
    
    -- بيانات Google Drive والموفر
    storage_provider VARCHAR(32) NOT NULL DEFAULT 'GOOGLE_DRIVE' CHECK (
        storage_provider IN ('GOOGLE_DRIVE', 'HOSTINGER_LOCAL')
    ),
    drive_file_id VARCHAR(128) NOT NULL,        -- معرف الملف الخاص في Google Drive
    drive_folder_id VARCHAR(128) NOT NULL,      -- معرف المجلد الأب في Google Drive
    
    -- البيانات الفنية للملف
    file_name VARCHAR(255) NOT NULL,            -- اسم الملف المطهر
    mime_type VARCHAR(128) NOT NULL,            -- نوع MIME الحقيقي
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    checksum_sha256 VARCHAR(64) NOT NULL,       -- البصمة الرقمية للتحقق من النزاهة
    
    -- النطاق والعزل والصلاحيات
    group_id SMALLINT NULL REFERENCES public.groups(id) ON DELETE RESTRICT,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    
    -- دورة حياة الملف
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (
        status IN ('PENDING', 'ACTIVE', 'FAILED', 'DELETED')
    ),
    
    -- التوقيتات والحذف المنطقي
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- الفهارس لتحسين الأداء
CREATE INDEX idx_media_assets_resource ON public.media_assets (resource_type, resource_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_media_assets_group ON public.media_assets (group_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_media_assets_uploader ON public.media_assets (uploaded_by);
CREATE INDEX idx_media_assets_drive_file ON public.media_assets (drive_file_id);
CREATE UNIQUE INDEX uq_media_assets_active_file ON public.media_assets (drive_file_id) WHERE (deleted_at IS NULL);

-- تفعيل RLS
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- تريجر تحديث updated_at
CREATE TRIGGER trg_media_assets_updated_at
BEFORE UPDATE ON public.media_assets
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
```

---

## 3. سياسات الأمان والحماية على مستوى الصفوف (RLS Policies) (2.5)

```sql
-- 1. القراءة: المسؤول والسوبر يوزر يقرأون كل الأصول
CREATE POLICY "Admin and SuperUser read all media assets"
ON public.media_assets
FOR SELECT
TO authenticated
USING (public.is_admin_or_super_user());

-- 2. القراءة: المستخدم يقرأ أصول فرقته أو الأصول العامة (group_id IS NULL)
CREATE POLICY "Authenticated users read own group or global media assets"
ON public.media_assets
FOR SELECT
TO authenticated
USING (
    (deleted_at IS NULL) AND (
        (group_id IS NULL)
        OR (group_id = public.get_current_user_group())
        OR (uploaded_by = auth.uid())
    )
);

-- 3. الإدارة: الخدام والسكرتارية ومسؤولو النظام يرفعون الأصول الخاصة بفرقهم
CREATE POLICY "Authorized staff insert media assets"
ON public.media_assets
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin_or_super_user()
    OR (
        public.is_servant_or_secretariat() 
        AND (group_id = public.get_current_user_group() OR group_id IS NULL)
        AND (uploaded_by = auth.uid())
    )
);

-- 4. الحذف المنطقي: مالك الملف أو إدارة النظام
CREATE POLICY "Owners and admins delete media assets"
ON public.media_assets
FOR UPDATE
TO authenticated
USING (
    public.is_admin_or_super_user()
    OR (uploaded_by = auth.uid() AND group_id = public.get_current_user_group())
)
WITH CHECK (
    public.is_admin_or_super_user()
    OR (uploaded_by = auth.uid() AND group_id = public.get_current_user_group())
);
```

---

## 4. جدول مطابقة الحقول القديمة بالنموذج الجديد (Field Mapping Matrix) (2.3)

| الجدول القديم | الحقل القديم | نوع المحتوى | التمثيل الجديد في `media_assets` | استراتيجية التوافق والتحويل |
|---|---|---|---|---|
| `curriculums` | `file_url` | PDF مذكرة / كتاب دراسي | `resource_type='CURRICULUM'` | يبقى `file_url` ويحمل مسار الـ API الموثق `/api/storage/file/{asset_id}`. |
| `lectures` | `audio_url` | MP3 تسجيل المحاضرة | `resource_type='LECTURE_AUDIO'` | يحمل رابط البث مع دعم HTTP Range 206. |
| `lectures` | `attachments_metadata` | JSONB مصفوفة مرفقات | مصفوفة كائنات تحوي `asset_id`, `name`, `size`, `mime` | تحديث الـ JSONB ليشمل `asset_id` لكل ملف مرفوع. |
| `books` | `file_url`, `cover_url` | PDF كتاب + غلاف صورة | `BOOK_FILE`, `BOOK_COVER` | الحقول تقبل الروابط الموجهة للـ Streaming Controller. |
| `researches` | `file_url` | PDF بحث دراسي | `resource_type='RESEARCH_FILE'` | رابط موثق للـ API. |
| `mp3_tracks` | `audio_url` | MP3 ترنيمة / تسجيل | `resource_type='MP3_TRACK'` | رابط البث المباشر. |
| `gallery_albums` | `cover_url` | صورة غلاف الألبوم | `resource_type='GALLERY_COVER'` | رابط صورة الغلاف. |
| `gallery_items` | `image_url` | صورة داخل الألبوم | `resource_type='GALLERY_ITEM'` | رابط الصورة المحمية. |
| `feed_posts` | `images_metadata` | JSONB صور المنشور | مصفوفة كائنات `[{"asset_id": "...", "url": "..."}]` | ربط الصور بصلاحية المنشور الأصلي. |
| `profiles` | `avatar_url` | صورة شخصية | `resource_type='AVATAR'` | صورة شخصية مرتبطة بـ `profile_id`. |
| `backup_records` | `storage_path` | حزمة نسخ احتياطي | `resource_type='BACKUP_ARCHIVE'` | `storage_type` يصبح `GOOGLE_DRIVE`. |
| `import_history` | `original_file_storage_path` | كشف Excel مستورد | `resource_type='IMPORT_FILE'` | حفظ مسار الملف في Drive أو الأرشيف المؤقت. |

---

## 5. مصالحة نطاق المجموعة لمعرض الصور (Gallery Scope Reconciliation) (2.4)

- **الوضع الحي المرصود في Supabase:** كلا جدولي `gallery_albums` و `gallery_items` يحتويان على عمود `group_id smallint NULL`.
- **القاعدة المعتمدة:**
  - إذا كان `group_id IS NOT NULL`: الألبوم ومحتوياته خاصة بالفرقة المحددة (يقرؤها ويعدلها خدام وطلاب تلك الفرقة والمسؤولون فقط).
  - إذا كان `group_id IS NULL`: الألبوم عام على مستوى المدرسة بأكملها (يقرؤه جميع المستخدمين المصادقين).
- **التوافق في `media_assets`:** يتم نسخ قيمة `group_id` تلقائياً من الألبوم أو العنصر إلى سجل `media_assets` التابع له لضمان عدم حدوث أي تسريب لصور فرقة إلى أخرى.

---

## 6. دورة حياة الملف ومعالجة الأخطاء الجزئية (File Lifecycle & Compensation) (2.7)

```text
    ┌──────────────┐
    │ 1. PENDING   │ (تم استلام الطلب وبدء رفع البايتات إلى Google Drive)
    └──────┬───────┘
           │
     [نجاح الرفع إلى Drive]
           │
           ▼
    ┌──────────────┐      [فشل حفظ السجل في Supabase]      ┌──────────────┐
    │  2. ACTIVE   │ ───────────────────────────────────────>│ 3. FAILED    │
    └──────┬───────┘                                        └──────┬───────┘
           │                                                       │
     [طلب حذف الملف]                                         [تنظيف وحذف الملف]
           │                                                 (Orphan Cleanup)
           ▼                                                       │
    ┌──────────────┐                                               ▼
    │  4. DELETED  │ (حذف منطقي في DB + حذف فعلي من Drive)   [حذف من Drive]
    └──────────────┘
```

### آلية التعويض الفوري (Orphan Compensation):
1. في حال نجاح رفع الملف إلى Google Drive ولكن فشلت كتابة بياناته في Supabase لأي سبب (انقطاع اتصال، خطأ في الصلاحيات):
   - يقوم الـ Backend بمحاولة حذف الملف المنشأ فوراً من Google Drive لتجنب ترك ملفات يتيمة.
   - إذا تعذر الحذف الفوري، يتم تسجيل معرّف `drive_file_id` في جدول المهام المعلقة (`storage_cleanup_queue`) ليقوم Cronjob بحذفه لاحقاً.
2. لا يتم إرجاع استجابة نجاح (HTTP 200/201) للعميل إلا بعد نجاح عمليتي الرفع وتوثيق الـ Metadata معاً.

---

## 7. عقد استجابات الـ API المنقحة (Sanitized API Response Schema) (2.8)

### 7.1 استجابة الرفع الناجح (`POST /api/storage/upload`)
```json
{
  "status": "success",
  "message": "تم رفع الملف بنجاح",
  "data": {
    "asset_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "filename": "lecture_01_gospel_of_matthew.pdf",
    "file_url": "https://api.elkarooz-school.com/api/storage/file/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "file_size": 2458920,
    "mime_type": "application/pdf",
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "group_id": 1,
    "resource_type": "CURRICULUM"
  }
}
```

### 7.2 استجابة رفض الصلاحية (`403 Forbidden`)
```json
{
  "status": "error",
  "code": "GROUP_SCOPE_VIOLATION",
  "message": "غير مصرح لك برفع أو استعراض ملفات تابعة لفرقة دراسية أخرى",
  "correlation_id": "req_9f8e7d6c5b4a"
}
```

> **ملاحظة أمنية:** لا تظهر أي مسارات سيرفر، ولا معرفات Drive الداخلية (`drive_file_id`), ولا مفاتيح التشفير في أي استجابة موجهة للمتصفح.
