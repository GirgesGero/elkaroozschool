# EL KAROOZ SCHOOL — خطة إصلاح مُصنّفة بالأولوية

> **الحالة الإلزامية الآن: `NOT READY`**
> خطة مبنية على مراجعة فعلية للـ 4 طبقات (DB / Frontend / PHP / معمارية).
> كل ادعاء في هذه الخطة **مُتحقَّق منه بالتشغيل**، مش مقروء من تقارير قديمة.
> آخر تحديث: 2026-09-30 — بعد commit `8929425`.

---

## كيف تُقرأ هذه الخطة

كل مرحلة عندها **سبب استعجال**، **عمل محدد**، **طريقة تحقق**، و**شرط تراجع (rollback)**.
المراحل مرتبة **تنفيذيًا** مش بالأهمية فقط — لأن إصلاح ٣ **يفتح** ٤ فورًا.

> ⚠️ **قاعدة أساسية:** المرحلة ٤ (تصعيد export) **لا تُنفّذ منفصلة عن ٣**.
> لو اتصلّحت ٣ لوحدها، التسريب يتحوّل من "ممنوع صدفة" إلى "شغّال فعليًا".
> لازم **نفس الـ commit**، وأولهم بعد بعضهم.

---

## 🔴 المرحلة 0 — تحضير (يوم واحد، صفر مخاطرة)

**لماذا أولًا:** المراحل ١–٤ كلها **تحتاج صلاحية كتابة على production**، واللي بنفّذها لازم يعرف إن في commit شغّال اتحقّق منه (DoS Raft).

| # | المهمة |
|---|---|
| 0.1 | **نسخة احتياطية كاملة** من production DB عبر `BackupController` + تحميلها خارج السيرفر |
| 0.2 | حفظ نتيجة الفحص الحالية كنص مرجعي (مُحقَّق منها دلوقتي): `50 profile`, `54 marathon answers`, `50/50 RLS on` |
| 0.3 | التأكد إن commit `8929425` على `origin/main` (تمّ: `8929425` ✓) |
| 0.4 | **دوران كلمات المرور فورًا** — ثغرة منفصلة مش dependent على أي حاجة |

**شرط عدم البدء:** لو 0.1 مش جاهز، **متنفّذش** أي migration.

---

## 🔴 المرحلة 1 — تسريب 5 RPCs بين المجموعات [شغّال على production]

**الخطورة:** `CRITICAL` · **الأثر:** تسريب بيانات شخصية **لحظي**
**مجمّع:** DB + Frontend

### التشخيص المُتحقَّق
5 دوال `SECURITY DEFINER` (واللي بتتخطى RLS) مفيهاش **أي** فحص صلاحية:

| الدالة | تسريب مُثبت | عدد المتصلين |
|---|---|---|
| `get_group_operational_summary(p_group_id)` | 1 | 3 |
| `get_group_servants_detailed(p_group_id)` | 2 | 2 |
| `get_group_secretariat_detailed(p_group_id)` | 2 | 2 |
| `get_trainee_full_profile(p_trainee_id)` | — | IDOR |
| `get_trainee_attendance_summary(p_trainee_id)` | — | IDOR |

**اللي اتسرّب فعليًا لمتدرب مجموعة 1:** أسماء + هواتف الخادمين والسر + صلاحياتهم + أسماء 5 متدربين في مجموعة 2 **مع نسبة حضور كل واحد**.

### ⚡ التصميم: **rename + wrap** (من دون لمس أجسام الدوال)

**السبب:** تعديل أجسام الدوال الـ `jsonb` دي بالـ string replace = خطأ بشري مضمون. البديل: نُسمّي الأصلي `_unsafe_*` (ممنوع على `authenticated`)، ونعمل **غلاف** بنفس الاسم يفحص ثم يستدعي الأصلي.

**تحققت من الشروط:**
- ✅ كل الـ 5 ترجع `jsonb` → يُمكن لفّها بنفس التوقيع
- ✅ مفيش أي دالة تعتمد على الـ 5 (`pg_depend` → **فارغ**) → إعادة التسمية آمنة
- ✅ `is_admin_or_super_user()`, `get_current_user_group()`, `has_servant_permission()`, `is_secretariat_of_group()` كلهم موجودون

### المهمة 1.1 — migration القاعدة
الملف: `supabase/migrations/20260930150000_rpc_group_scope_guards.sql`

```sql
-- 1) منع الوصول للأصل بلا فحص
ALTER FUNCTION public.get_group_operational_summary(smallint)   RENAME TO _unsafe_get_group_operational_summary;
ALTER FUNCTION public.get_group_servants_detailed(smallint)     RENAME TO _unsafe_get_group_servants_detailed;
ALTER FUNCTION public.get_group_secretariat_detailed(smallint)  RENAME TO _unsafe_get_group_secretariat_detailed;
ALTER FUNCTION public.get_trainee_full_profile(uuid)            RENAME TO _unsafe_get_trainee_full_profile;
ALTER FUNCTION public.get_trainee_attendance_summary(uuid)      RENAME TO _unsafe_get_trainee_attendance_summary;

REVOKE ALL ON FUNCTION public._unsafe_get_group_operational_summary(smallint)  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._unsafe_get_group_servants_detailed(smallint)    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._unsafe_get_group_secretariat_detailed(smallint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._unsafe_get_trainee_full_profile(uuid)           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._unsafe_get_trainee_attendance_summary(uuid)     FROM PUBLIC, anon, authenticated;
```

### المهمة 1.2 — غلاف فحص المجموعة (3 دوال)
```sql
CREATE OR REPLACE FUNCTION public.get_group_operational_summary(p_group_id smallint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $fn$
BEGIN
    IF NOT public.is_admin_or_super_user()
       AND p_group_id IS DISTINCT FROM public.get_current_user_group() THEN
        RAISE EXCEPTION 'ليس لديك صلاحية عرض بيانات هذه الفرقة'
            USING ERRCODE = '42501';
    END IF;
    RETURN public._unsafe_get_group_operational_summary(p_group_id);
END; $fn$;
```
نفس القالب لـ `get_group_servants_detailed` و `get_group_secretariat_detailed`.

### المهمة 1.3 — غلاف فحص الـ trainee (IDOR)
```sql
CREATE OR REPLACE FUNCTION public.get_trainee_full_profile(p_trainee_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $fn$
DECLARE v_group smallint; v_role varchar;
BEGIN
    SELECT group_id, role_id INTO v_group, v_role
      FROM public.profiles WHERE id = p_trainee_id;

    -- صحيح: هو نفسه / له صلاحية داخل مجموعتك / إداري
    IF NOT (
        p_trainee_id = auth.uid()
        OR public.is_admin_or_super_user()
        OR (public.get_current_user_group() IS NOT DISTINCT FROM v_group
            AND (public.get_current_user_role() IN ('servant','secretariat')
                 OR public.has_servant_permission('VIEW_TRAINEES')))
    ) THEN
        RAISE EXCEPTION 'ليس لديك صلاحية عرض بيانات هذا المتدرب'
            USING ERRCODE = '42501';
    END IF;

    RETURN public._unsafe_get_trainee_full_profile(p_trainee_id);
END; $fn$;
```
> **مهم — الاستثناء الموحّد:** `TraineeProfileDrawer.tsx:76` بتفتح ملف **متدرب مُختار** داخل نفس المجموعة، فالشرط لازم يسمح بداخل المجموعة وإلا كسرنا ميزة شغّالة.

### المهمة 1.4 — `profiles` SELECT policy
```sql
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
CREATE POLICY "Authenticated users can read profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (deleted_at IS NULL OR is_admin_or_super_user()
           OR group_id = get_current_user_group()
           OR id = auth.uid());
```

### المهمة 1.5 — Frontend
`groups/[id]/page.tsx:184` الحارس client-side بس. ينفع يفضل كـ UX، بس **مش وسيلة أمان** — علّقه بتعليق صريح:
```tsx
// UX guard only. The REAL enforcement is the RPC guard + RLS
// (migration 20260930150000). Do not rely on this redirect.
```

### طريقة التحقق (إلزامية، كـ `authenticated`)

> ⚠️ **فخ مُتحقَّق منه أثناء كتابة هذه الخطة:** حرفي `2` بيتحلَّل لـ `integer` مش `smallint`،
> فـ `get_group_servants_detailed(2)` بيرمي `42883 function ... (integer) does not exist`.
> **لازم تكتب `2::smallint`** في كل اختبار. هذا غيّر كود التحقق نفسه بعد أول تشغيل فاشل.

```
متدرب g1 → get_group_servants_detailed(2::smallint)    => 42501
متدرب g1 → get_trainee_full_profile(<uuid g2>)          => 42501
متدرب g1 → get_group_servants_detailed(1::smallint)     => ينجح  (مش كسر)
خدم g1   → get_trainee_full_profile(<متدرّب g1>)        => ينجح  (الميزة سليمة)
admin    → الدوال الـ 5 بمجموعات مختلفة                => تنجح
```

**✅ مُتحقَّق فعلًا على production (transaction + rollback):**
```
الحارس اتبنى بنجاح  → اتنفّذت الدالة → 42501 cross-group read denied
بعد rollback        → get_group_servants_detailed موجود، مفيش أي _unsafe_* متبقّي
```
يعني **الكود في 1.1–1.2 مُجرَّب وشغّال** — مش pseudocode.

**شرط النجاح:** الأربعة الأولى بالترتيب ده + `SELECT count(*) FROM _unsafe_*` لسه بيشتغل لـ `service_role`.

**Rollback:** `DROP FUNCTION` للأغلفة + `RENAME` العكس. البند 1.4 يُرجَع بـ migration راجعة.

---

## 🔴 المرحلة 2 — Backend PHP معطّل فعليًا [5 من 8 routes]

**الخطورة:** `CRITICAL` (وظيفيًا) · **الأثر:** إنشاء backup / استيراد / تصدير / رفع / حذف — **كلهم 500**

### الملف: `backend-api/src/Middleware/JwtAuthMiddleware.php:30`
```php
// قبل
'claims' => (array)$decoded
// بعد
'claims' => json_decode(json_encode($decoded), true),
```
سطر واحد. **متحقَّق:** `??` **لا** يمنع الـ fatal.

> **تحذير — التنفيذ:** بعد هذا الإصلاح، **المرحلة 3 تتفتح فورًا**. متصلّحش ٣ بعده في نفس الوقت إلا لو قاصد.

---

## 🔴 المرحلة 3 — تصعيد أفقي في export [يفتح بعد إصلاح 2]

**الملف:** `backend-api/src/Controllers/ExportController.php:13,17`

```php
RbacMiddleware::requireRoles($user, ['admin', 'super_user', 'servant', 'secretariat']);
$isGlobal = in_array($user['role'] ?? '', ['admin', 'super_user'], true);
$groupId  = $isGlobal
    ? (isset($_GET['group_id']) ? (int)$_GET['group_id'] : 0)   // 0 = الكل
    : (int)($user['group_id'] ?? 0);

if ($groupId !== 0 && !GroupScopeMiddleware::enforceGroupScope($user, $groupId)) {
    Response::error('رقم الفرقة غير صالح', 'INVALID_GROUP', 400);
}
```
`GroupScopeMiddleware` مش مستورد في الملف — لازم تضيف الـ `use`.

**شغّال دلوقتي؟** ❌ لا — الـ 500 بيقطع قبل الـ CSV (تحققت بالطلب الحيّ). الـ fix ٢ **بيحوّله لتسريب شغّال** لو اتعمل منفرد.

---

## 🔴 المرحلة 4 — Traversal على الرفع [حيّ — الملفات بتتم_write]

**الملفات:** `StorageController.php:21,33,39` + `StorageBridgeService.php:19`

**متحقَّق بالتشغيل:** `folder_type=../../../ESCAPED_A` → الملف اتكتب **بره `storage/`**، والـ 500 اللي رجع **مش حماية** لأن الكتابة بتحصل قبل سطر الـ audit.

### المهمة 4.1 — allowlist
```php
$ALLOWED_FOLDERS = ['curriculum','lectures','books','research','mp3',
                    'users','feed','general','gallery','avatars'];
$folderType = $_POST['folder_type'] ?? 'general';
if (!in_array($folderType, $ALLOWED_FOLDERS, true)) {
    Response::error('نوع المجلد غير صالح', 'INVALID_FOLDER', 400);
}
if ($folderType === 'users') {
    $userRole = $_POST['user_role'] ?? 'trainees';
    if (!in_array($userRole, ['trainees','servants','secretariat','admins'], true)) {
        Response::error('نوع المستخدم غير صالح', 'INVALID_USER_ROLE', 400);
    }
}
```

### المهمة 4.2 — containment على مسار الكتابة
في `StorageBridgeService::saveUploadedFile` بعد السطر 19:
```php
$root = realpath($this->rootDir);
$real = realpath($targetDirectory);
if ($root === false || $real === false
    || !str_starts_with($real, $root . DIRECTORY_SEPARATOR)) {
    throw new \Exception('مسار التخزين خارج النطاق المسموح');
}
```
ده **نفس** المنطق الموجود بالفعل في `deleteFile()` (`:59-68`) — مجرد نقله لمسار الكتابة.

### طريقة التحقق
```
folder_type=../../../ESCAPED_X  => 400 INVALID_FOLDER + لا ملف يُنشأ
user_role=../../../ESCAPED_Y    => 400 INVALID_USER_ROLE
folder_type=mp3, group_id=1     => ينجح
خادم g1 → group_id=2           => 403 (سلوك موجود، لازم ما يتكسرش)
```
متحقَّق حاليًا: الأخير = `403 GROUP_SCOPE_VIOLATION` ✓ — **حافظ عليه**.

---

## 🟠 المرحلة 5 — أسرار وكلمات مرور في المستودع

| # | المهمة | الملف |
|---|---|---|
| 5.1 | **حذف feature الـ quick-login بالكامل** من production | `frontend/src/app/login/page.tsx:100-111` |
| 5.2 | نقل 8 كلمات المرور من 9 سكربتات لـ `.env` | `scripts/verify_auth_roles_security.py:68-75` |
| 5.3 | **دوران** كل كلمات المرور (history في git آمن ومرئي) | Dashboard |

> `handleQuickLogin` بيفتح `/login` (public) وبيدخل بحساب admin بضغطة. **الميزة دي مينفعش تفضل على production.**

---

## 🟠 المرحلة 6 — Gate حقيقي للاختبارات

**لماذا قبل mediums:** الـ `21/21` و`16/16` **بيدّوا ثقة زائفة** — بيفحصوا **مسارات الرفض بس**، بينما 5 من 8 routes 500 في **كل write ناجح**.

### المهمة 6.1 — اختبارات **مسار نجاح**
```php
// scripts/verify_api_http.php — إلزامي
$adminToken = <mint role=admin>;
expect('admin creates backup',  'POST /backup/create'  => 200);
expect('admin imports CSV',     'POST /import/trainees' => 200);
expect('admin deletes in-root',  'POST /storage/delete' => 200 DELETED);   // مش DELETE_FAILED
expect('servant uploads file',   'POST /storage/upload' => 200);
```

### المهمة 6.2 — اختبارات **سلبية** للصلاحيات (الأهم)
```php
expect('trainee -> /backup/create',   token(trainee) => 403);
expect('servant g1 exports g2',       'GET /export/data?group_id=2' => 403);
expect('servant g1 uploads to g2',    group_id=2 => 403);
```

### المهمة 6.3 — Database
اختبار SQL one-shot (مش CI — production مش بيحب الـ CI):
- كل ادعاء المرحلة ١ في transaction بـ `ROLLBACK`
- **يُشغَّل كـ `authenticated`** دايمًا — اتصال MCP superuser وبيتخطى RLS

---

## 🟡 المرحلة 7 — Errors والـ hardening

| # | المهمة | الملف |
|---|---|---|
| 7.1 | **وقف تسريب `$e->getMessage()`** → `error_log` + رسالة عامة | `index.php:124` |
| 7.2 | `display_errors=Off; log_errors=On` | `.user.ini` |
| 7.3 | `flock()` على عدّاد rate limit | `RateLimitMiddleware.php:29-39` |
| 7.4 | **تنشيط** `RateLimitMiddleware` (صفر call sites حاليًا) | `index.php` |
| 7.5 | `filter_var` على `X-Forwarded-For` | `AuditLogService.php:17` |
| 7.6 | إضافة `.limit()` للصفحات الأثقل | 7 ملفات |

> **مهم — 7.3 قبل 7.4.** الـ counter الحالي **غير ذرّي**: الـ `LOCK_EX` على الكتابة بس، فالقرار بياخد قبل القفل. لو نشّطته كده = حماية وهمية (بتعدّ أقل من الحقيقة تحت الضغط). لازم `flock` يغطي read-modify-write كله.

---

## 🔵 المرحلة 8 — الجاهزية والتوثيق

| # | المهمة |
|---|---|
| 8.1 | **متغيرات Vercel** — `NEXT_PUBLIC_SUPABASE_URL` + `ANON_KEY` (Config / All Environments). **login معطّل لحد كده** |
| 8.2 | نشر PHP على Hostinger + اختبار `/health` |
| 8.3 | `.github/workflows/ci.yml` (15 سطر) — typecheck + lint + build |
| 8.4 | أرشفة الـ 8 تقارير `FINAL_*` الناقصة + `docs/INDEX.md` |
| 8.5 | إعادة كتابة `README.md` (تالف: 6 أسطر مكرّرة) |

---

## 📊 خريطة التبعيات — ليه الترتيب ده بالذات

```
[0] تحضير ──┬──► [1] RPC guards          (مستقل)
            │
            └──► [2] deep cast ──┬──► [3] export guard   ⚠️ لازم 2+3 في نفس الـ commit
                                  │
                                  └──► [4] upload traversal  (مستقل)
```

**المرحلة ٣ ملتصقة بـ ٢، مش بـ ١.** الـ traversal (٤) مستقل تمامًا عن كل الـ SQL.

---

## ⏱️ الجدول الزمني

| المرحلة | المدة | الثقة |
|---|---|---|
| 0 — تحضير | يوم | 🟢 آمن |
| 1 — RPCs | 1–2 يوم | 🟠 متوسط |
| 2 — deep cast | ساعتين | 🟢 آمن |
| 2+3 معًا | **ساعة واحدة** | 🟠 متوسط |
| 4 — traversal | 3 ساعات | 🟢 آمن |
| 5 — أسرار | 3 ساعات | 🟢 آمن |
| 6 — gates | 1–2 يوم | 🟢 آمن |
| 7–8 | 1 أسبوع | 🟢 آمن |

---

## ✅ معايير قبول نهائية

المشروع **لا يُعتبر جاهزًا** إلا بـ:

1. ✅ كل استغلال المرحلة ١ رجّع `42501`
2. ✅ 5 من 5 الـ RPCs ترجع بيانات للمجموعة الصحيحة
3. ✅ **ولا** استغلال يُخرج ملفاً بره `storage/`
4. ✅ كل مسارات **النجاح** في الـ 8 PHP routes ترجع 200
5. ✅ فحص `authenticated` على كل ادعاء عزل
6. ✅ صفر كلمة مرور أو secret في الـ working tree
7. ✅ `/health` = `ONLINE` على الإنتاج
8. ✅ تسجيل دخول حقيقي بـ `trainee_g1` يعرض مجموعة 1 فقط

> **القاعدة المستخدمة:** أي اختبار على RLS لازم يشتغل بدور `authenticated`.
> `postgres` و`service_role` **بتتخطّى RLS**، فاختبار بيعدّي عليهم بيوهمك إن العزل شغّال.
>
> العنصر ٨ هو أهم عنصر في القائمة دي: من غير تسجيل دخول حقيقي، المشروع **مش** في production فعليًا مهما كانت كل الاختبارات خضراء.
