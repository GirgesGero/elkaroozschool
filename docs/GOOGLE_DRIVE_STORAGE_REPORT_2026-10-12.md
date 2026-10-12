# تقرير تنفيذ Google Drive Storage وتصدير التقارير — EL KAROOZ School

> **تاريخ التقرير:** 2026-10-12  
> **المشروع:** EL KAROOZ School  
> **نطاق العمل:** تنفيذ التخزين السحابي على Google Drive لجميع أنواع الملفات والمرفقات، حفظ مراجع الملفات في `media_assets`، ربط المناهج والمرصد، وتمكين تصدير تقارير Excel مع حفظ نسخة سحابية.

---

## 1. ملخص ما تم تنفيذه

1. **الطبقة الموحدة للتخزين (`StorageBridgeService.php`)**:
   - تم تطوير `StorageBridgeService` ليكون المحرك الموحد لجميع عمليات رفع وحفظ الملفات في النظام.
   - إضافة التحقق من التكرار المسبق (`Deduplication`) عبر حساب بصمة `SHA-256` للملف وفحص جدول `media_assets`؛ وفي حال وجود الملف مسبقاً يتم استرجاع معرفه ورابطه دون إعادة رفعه.
   - دعم الرفع التلقائي إلى Google Drive إما عبر **Service Account مباشر** (`GoogleDriveService`) أو عبر **Google Apps Script Bridge** (`GoogleAppsScriptBridgeService`)، مع الاحتفاظ بمسار تخزين محلي مرحلي في حال عدم تهيئة مفاتيح Drive دون إيقاف النظام أو كسر مسارات التشغيل.
   - تسجيل كل ملف مرفوع ذرياً في جدول `public.media_assets` في Supabase مع كامل البيانات الوصفية (`resource_type`, `group_id`, `uploaded_by`, `file_size_bytes`, `checksum_sha256`, `drive_file_id`, `drive_folder_id`).
   - إضافة دالة `saveFileContent()` لتمكين حفظ الملفات المنشأة برمجياً بواسطة النظام (مثل تقارير Excel ونسخ النسخ الاحتياطي).

2. **بروتوكول البث والتنزيل الجزئي (Streaming & Range Requests)**:
   - إضافة دالة `streamFile()` في `GoogleDriveService.php` لدعم بروتوكول **RFC 7233** (HTTP 206 Partial Content و HTTP 200) للبث المباشر للصوتيات والمرئيات وتنزيل الملفات الكبيرة من Drive.
   - إضافة دالة `streamLocalFile()` في `StorageBridgeService.php` لدعم نفس بروتوكول البث للملفات المحلية.
   - تحديث `StorageController::getFile()` لتدفق الملفات بحسب موفر التخزين (`GOOGLE_DRIVE` أو `HOSTINGER_LOCAL`) مع عزل الصلاحيات وحماية نطاق الفرق والمجموعات.

3. **تقارير Excel وتصدير البيانات (`SpreadsheetWriter.php` & `ExportController.php`)**:
   - بناء مولد ملفات **Microsoft Excel OpenXML (`.xlsx`) نظيف وأصيل** داخل `SpreadsheetWriter.php` بالاعتماد على امتداد `ZipArchive` القياسي دون الحاجة لمكتبات Composer ثقيلة قد لا تتوفر على استضافة Hostinger المشتركة.
   - حماية خلايا التقارير من هجمات حقن المعادلات (`Formula Injection`).
   - تعديل `ExportController::exportData()` ليقوم بتوليد التقرير ثم حفظ نسخة سحابية غير قابلة للتعديل تلقائياً على Google Drive وتسجيلها في `media_assets` تحت المجلد `system/exports/group_{groupId}` وإرجاع ترويسات `X-Media-Asset-Id` و `X-Drive-File-Id`.
   - دعم معامل `save_only=true` لحفظ التقرير سحابياً مباشرة دون إجبار المتصفح على التحميل الفوري.

4. **تكامل الواجهة الأمامية (Frontend Integration)**:
   - **تقارير المتدربين (`admin/imports/page.tsx`)**: تفعيل زر تصدير Excel (`.xlsx`) الحي؛ حيث يقوم بتنزيل ملف Excel حقيقي إلى جهاز المستخدم وإرسال نسخة سحابية في الخلفية إلى Google Drive عبر `/storage/upload`.
   - **منشورات الحائط (`components/PostComposer.tsx`)**: إضافة زر لرفع الصور مباشرة من الجهاز إلى Google Drive وحفظها في `media_assets` كـ `POST_IMAGE` وإرفاق الرابط بالمنشور.
   - **الملف الشخصي (`components/UnifiedProfileModal.tsx`)**: تحديث محرر الصورة الشخصية ليرفع الصورة عبر `/storage/upload` مع نوع `AVATAR` وحفظها سحابياً ثم تحديث `profiles.avatar_url`.
   - **المناهج والمحاضرات (`components/CurriculumManagementPanel.tsx`)**: إضافة إمكانية إرفاق ملفات الوثائق والصوتيات لكل محاضرة في المنهج الديناميكي ورفعها إلى Drive وحفظ مراجعها في `content_metadata.attachments`.
   - **المرصد والماراثون (`app/marathon/manage/page.tsx`)**: إضافة أداة إرفاق ملفات/صور داخل نافذة إنشاء السؤال لرفعها إلى Drive وإدراج رابطها تلقائياً في نص السؤال.

---

## 2. جدول نتائج الاختبارات المنفذة

| الاختبار | الإجراء | النتيجة |
|---|---|:---:|
| **فحص الاتصال بحساب الخدمة Service Account** | `scripts/test_google_drive_production_connection.php` | ✅ **6/6 نجح** |
| **فحص بث وتحميل Google Drive (RFC 7233)** | `scripts/verify_google_drive_streaming.php` | ✅ **32/32 نجح** |
| **فحص مولد وتنسيقات التصدير وحماية الحقن** | `scripts/verify_export_formats.php` | ✅ **26/26 نجح** |
| **اختبار تكامل رفع PDF ومطابقة SHA-256** | رفع ملف PDF اختباري وحفظه في `media_assets` | ✅ **نجح (HTTP 200)** |
| **اختبار منع التكرار (Deduplication Check)** | رفع نفس المحتوى مرة ثانية والتأكد من عدم تكراره | ✅ **نجح (`is_duplicate: true`)** |
| **اختبار رفع ملف Word (.docx)** | رفع مستند وورد والتأكد من نوع `LECTURE_ATTACHMENT` | ✅ **نجح (HTTP 200)** |
| **اختبار رفع صورة (Avatar WebP)** | رفع صورة والتأكد من نوع `AVATAR` وحفظها | ✅ **نجح (HTTP 200)** |
| **اختبار إنشاء وحفظ تقرير Excel (.xlsx)** | توليد تقرير وحفظه في Drive كـ `media_assets` | ✅ **نجح (2,168 بايت)** |
| **فحص خلو الواجهة من أخطاء TypeScript** | `npx tsc --noEmit -p tsconfig.json` | ✅ **نجح (Clean)** |
| **مجموعة اختبارات الواجهة الآلية (Vitest)** | `npm test -- --run` | ✅ **15/15 ملف، 165/165 اختبار نجح** |
| **بناء الإنتاج (Next.js Production Build)** | `npm run build` | ✅ **نجح بالكامل (24/24 مسار)** |

---

## 3. الملفات التي تم تعديلها أو إنشاؤها

### Backend (PHP API)
- `backend-api/src/Services/StorageBridgeService.php`: تحويله إلى البوابة المركزية للتخزين مع Deduplication والربط بـ Drive و `media_assets` والبث المحلي.
- `backend-api/src/Services/GoogleDriveService.php`: إضافة دالة `streamFile()` لدعم HTTP 206 Partial Content.
- `backend-api/src/Services/GoogleAppsScriptBridgeService.php`: إضافة دالة `uploadFile()` عبر الجسر السحابي.
- `backend-api/src/Services/SpreadsheetWriter.php`: إضافة مولد OpenXML XLSX أصيل عبر `ZipArchive` دون مكتبات خارجية.
- `backend-api/src/Controllers/StorageController.php`: تمرير السياق والصلاحيات إلى `StorageBridgeService` وتفعيل بث الملفات المحلية والسحابية.
- `backend-api/src/Controllers/ExportController.php`: حفظ نسخة سحابية تلقائية في Drive لتقارير Excel و CSV.
- `scripts/verify_export_formats.php`: تحديث فحص إتاحة XLSX لمطابقة مولد OpenXML الجديد.

### Frontend (Next.js)
- `frontend/src/app/admin/imports/page.tsx`: تمكين تصدير Excel الفعلي مع حفظ نسخة سحابية في Drive.
- `frontend/src/components/PostComposer.tsx`: إضافة زر رفع الصور من الجهاز إلى Google Drive.
- `frontend/src/components/UnifiedProfileModal.tsx`: رفع الصورة الشخصية إلى Google Drive عند توفر الجلسة.
- `frontend/src/components/CurriculumManagementPanel.tsx`: إضافة إرفاق الملفات والصوتيات لمحاضرات المنهج وحفظها في Drive.
- `frontend/src/app/marathon/manage/page.tsx`: إضافة إرفاق الملفات والصور لأسئلة الماراثون وحفظها في Drive.

### وثائق ومخططات
- `docs/CURRENT_IMPLEMENTATION_STATUS.md`: تحديث الحالة المعمارية للتخزين وتقارير Excel.
- `docs/GOOGLE_DRIVE_STORAGE_REPORT_2026-10-12.md`: هذا التقرير التفصيلي.

---

## 4. الإعدادات المطلوبة في بيئة الاستضافة الحية (Hostinger)

لتحقيق الرفع المباشر إلى Google Drive على خادم الإنتاج:
1. **في حال استخدام Google Service Account**:
   - وضع ملف الاعتماد `service-account.json` خارج مجلد الويب وتعيين مساره في المتغير:
     `GOOGLE_SERVICE_ACCOUNT_JSON_PATH=/home/username/private/service-account.json`
2. **في حال استخدام Google Apps Script Bridge**:
   - المتغيرات مهيأة في `.env.hostinger` (`GOOGLE_APPS_SCRIPT_URL`, `GOOGLE_APPS_SCRIPT_TOKEN`). إذا تغير التوكن على Google Script، يجب تحديثه في إعدادات البيئة على Hostinger.
3. في حال غياب المفاتيح، يعمل النظام تلقائياً بآلية **Fallback الآمنة** عبر `HOSTINGER_LOCAL` ويسجل الملفات في `media_assets` مع دعم البث الكامل دون أن يتعطل النظام أو يفشل رفع المستخدمين.

---

## 5. حالة Git والإنتاج

- جميع التغييرات تم اختبارها والتحقق منها بنجاح محلياً.
- **لم يتم تنفيذ `git commit` أو `git push`** وفقاً لتعليماتك الصريحة، والشجرة المحلية جاهزة للمراجعة.
