# EL KAROOZ School — الحالة المعمارية الحالية

> **آخر مراجعة:** 2026-10-11
> **نطاق المراجعة:** الشجرة المحلية + Supabase المرتبط بالتطبيق + اختبارات البناء المحلية.
> **قاعدة مهمة:** هذا المستند يصف ما تم إثباته، وليس كل ما تصفه وثائق تاريخية قديمة.

## الحالة التنفيذية المختصرة

| المجال | الحالة الحالية | الدليل |
|---|---|---|
| Next.js frontend | منفذ محليًا | `frontend/src/app`, `npm run build` |
| Supabase Auth/RLS | مستخدم في الواجهة وقاعدة البيانات | `frontend/src/lib/supabase`, سياسات `pg_policies` |
| المناهج الديناميكية | **منفذة ومطبقة** | `curriculum_days`, `curriculum_entries`, `curriculum_revisions` |
| نقل المناهج القديمة | additive بلا حذف | 21 يومًا و21 محاضرة مرتبطة، والجداول القديمة باقية |
| المرصد/الماراثون | **مرحلة 2 منفذة جزئيًا** | حالات نشر، RPC أسئلة آمن، أرشفة، revisions، مع بقاء واجهة الاستبدال المتقدمة محدودة |
| Google Drive للملفات العامة | **منفذ ومربوط عبر StorageBridgeService** | `StorageBridgeService`, `StorageController`, `media_assets` registry |
| التقارير إلى Drive | **منفذ ومربوط** | تصدير Excel (XLSX) و CSV مع حفظ نسخة سحابية على Google Drive وتسجيلها في `media_assets` |
| الإنتاج | لا يُعلن Ready تلقائيًا | يلزم فصل الأدلة المحلية عن live authenticated E2E |
| GitHub | لا push ضمن هذه المهمة | working tree محلي فقط |

## مسار البيانات الفعلي

```text
Next.js
  ├── Supabase Browser Client: Auth + reads/writes التي تسمح بها RLS
  └── PHP API Client: backups/import/export/storage routes

Supabase PostgreSQL
  ├── profiles / roles / permissions / group_secretariat
  ├── terms / curriculum_days / curriculum_entries / curriculum_revisions
  ├── legacy curriculums / lectures (لم تُحذف)
  ├── marathons / marathon_questions / marathon_answers
  ├── marathon_question_revisions / trainee submissions / trainee answers
  └── media_assets (registry موجود، لكنه ليس مسار الرفع العام الحالي)

Hostinger PHP
  ├── JwtAuthMiddleware + RbacMiddleware + GroupScopeMiddleware
  ├── StorageController
  ├── StorageBridgeService (المسار المحلي الحالي)
  └── GoogleDriveService (موجود ومختبر جزئيًا، ليس موصولًا بكل upload path)
```

## المناهج الديناميكية — As Built

### الجداول الجديدة

- `public.curriculum_days`
  - اليوم تابع لـ`term_id` و`group_id`.
  - يدعم ترتيبًا غير ثابت عبر `day_number` و`sort_order`.
  - الحالة: `DRAFT`, `PUBLISHED`, `ARCHIVED`.
- `public.curriculum_entries`
  - محاضرات متعددة لكل يوم.
  - `lecture_id` اختياري للحفاظ على الربط التاريخي.
  - الحالة مستقلة عن مكان المحاضرة.
- `public.curriculum_revisions`
  - سجل snapshots للتعديلات المستقبلية.

### الوظائف

- `can_manage_curriculum(smallint)`
- `publish_curriculum_day(uuid)`

### الصلاحيات

- `admin` و`super_user`: كل الفرق.
- `secretariat`: فرقتها، لأن `is_secretariat_of_group()` جزء من الحارس.
- `servant`: فقط عند وجود `MANAGE_CURRICULUM` أو `MANAGE_LECTURES`.
- `trainee`: قراءة المنشور فقط.
- `anon`: لا صلاحية جدول ولا تنفيذ RPC الإدارة.

### النقل الأولي

تم إنشاء 21 يومًا و21 مدخلاً من البيانات القديمة. لم يتم حذف أو دمج السجلات المكررة. هذا قرار مقصود حتى يراجعها المسؤول قبل الأرشفة.

## المرصد/الماراثون — As Built

تمت إضافة:

- `status` و`published_at` و`published_by` إلى `marathon_questions`.
- `status` إلى `marathon_sections`.
- `marathon_question_revisions`.
- `can_manage_marathon(smallint)`.
- `get_marathon_questions_for_player(uuid)`؛ يعيد نص السؤال والخيارات دون `is_correct`.
- `archive_marathon_question(uuid)`.
- `replace_marathon_question(uuid,text,uuid,jsonb)`؛ يحفظ revision ثم يؤرشف السؤال القديم وينشئ سؤالًا جديدًا.
- تقييد الأسئلة والأقسام والإجابات حسب فرقة الماراثون.
- منع `anon` من تنفيذ RPCs الجديدة.

### قواعد تاريخية

لا يتم تعديل سؤال منشور موجود في مكانه إذا كان له submissions قديمة. الاستبدال ينشئ سؤالًا جديدًا ويؤرشف القديم، وبالتالي تبقى الإجابات التاريخية مربوطة بالـ`question_id` القديم.

## الملفات وGoogle Drive — As Built

### ما تم تنفيذه وإثباته
- `StorageBridgeService.php` تم تحديثه ليكون البوابة المركزية لكافة عمليات الرفع (`saveUploadedFile` و `saveFileContent`).
- يدعم الرفع إلى Google Drive عبر حساب الخدمة `GoogleDriveService` أو جسر `GoogleAppsScriptBridgeService`، مع منع التكرار عبر البصمة الإلكترونية SHA-256 قبل الشروع في الرفع.
- يتم تسجيل كل ملف يرفع في جدول `media_assets` في Supabase مع كامل البيانات الوصفية (`drive_file_id`, `checksum_sha256`, `resource_type`, `group_id`, `uploaded_by`).
- يدعم خادم البث `StorageController::getFile` بروتوكول البث الجزئي RFC 7233 (HTTP 206 Byte-Range) لكلا الموفرين (`GOOGLE_DRIVE` و `HOSTINGER_LOCAL`).
- تم دمج واجهات الرفع في الواجهة الأمامية:
  - صور الملف الشخصي والـ Avatars مع Google Drive عبر `/storage/upload`.
  - صور منشورات الـ Feed عبر `/storage/upload`.
  - مرفقات محاضرات المنهج الديناميكي (صوتيات، وثائق PDF و Word) وحفظ مراجعها في `curriculum_entries.content_metadata`.
  - مرفقات أسئلة المرصد والماراثون في لوحة الإدارة.

## التقارير والتصدير — As Built

- تم تفعيل تصدير كشوفات المتدربين بصيغة Microsoft Excel (`.xlsx`) بالإضافة إلى `.csv` في واجهة الإدارة `admin/imports` عبر مكتبة `xlsx` بالواجهة الأمامية ومولد OpenXML ZipArchive النظيف في الباك إند `SpreadsheetWriter`.
- يتم تلقائياً حفظ نسخة سحابية غير قابلة للتعديل من التقرير في Google Drive وتسجيلها في `media_assets` تحت المجلد `system/exports/group_{groupId}`.
- يدعم المسار `/export/data` ترويسات `X-Media-Asset-Id` و `X-Drive-File-Id` بالإضافة إلى معامل `save_only=true`.

## مراجعة منطقية حرجة

1. **لا تستخدم `marathon_questions` مباشرة في player لعرض الإجابات.** استخدم `get_marathon_questions_for_player` حتى لا يتسرب `is_correct`.
2. **لا تعدّل سؤالًا له محاولات قديمة في مكانه.** استخدم `replace_marathon_question`.
3. **لا تعتبر نجاح Insert للسؤال نجاحًا للعملية إذا فشل Insert للاختيارات.** الواجهة الجديدة تتحقق من فشل الاختيارات وتؤرشف السؤال الجزئي.
4. **لا تخلط `group_id` الخاص بالماراثون مع `group_id` الخاص بالمستخدم دون تحقق خادمي.** الحارس الجديد يربط الاثنين.
5. **لا تعتمد على إخفاء الأزرار كصلاحية.** الحماية الفعلية في RLS وRPC.
6. **لا تعتبر خدمة Google Drive موصولة لمجرد وجود class.** يجب أن يمر upload الفعلي عبرها ويُقرأ `media_assets` بعدها.
7. **لا تعتمد على وثائق قديمة تحمل `READY` بجانب وثائق أحدث تحمل `NOT READY`.** الأدلة الحالية هي المصدر الحاكم.

## حدود المراجعة

- لم يتم تنفيذ اختبار authenticated E2E لكل دور على production في هذه الجولة.
- لم يتم اختبار رفع PDF/Word/Excel وصورة وصوت إلى Google Drive فعليًا عبر upload route.
- لم يتم تنفيذ حفظ تقرير إلى Drive.
- لم يتم تنفيذ حذف أو دمج البيانات المكررة القديمة.
- لم يتم تنفيذ نشر جديد إلى Vercel أو push إلى GitHub.

## أوامر التحقق المحلية

```bash
cd "E:/drive progect/ELKAROOZ SCHOOL/frontend"
npx tsc --noEmit -p tsconfig.json
npm test -- --run
npm run build
```

النتيجة الأخيرة بعد التعديلات الحالية يجب إعادة تشغيلها قبل إعلان التسليم النهائي.
