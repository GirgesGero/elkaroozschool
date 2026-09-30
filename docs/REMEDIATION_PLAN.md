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

## 🔴 المرحلة 1 — تسريب 5 RPCs بين المجموعات ✅ **[تم الإصلاح — 2026-09-30]**

**الخطورة:** `CRITICAL` · **الأثر:** تسريب بيانات شخصية **لحظي**
**مجمّع:** DB + Frontend

> ### ✅ نتيجة التنفيذ
> migration: `20260930150000_rpc_group_scope_guards.sql` — applied to production, commit `1eb9fee`.
>
> **اختبار 10/10 على production مباشرة** (مش dry-run):
> ```
>  1 trainee_g1 -> group2 servants        PASS_deny_cross_group
>  2 trainee_g1 -> group2 secretariat     PASS_deny_cross_group
>  3 trainee_g1 -> group2 summary         PASS_deny_cross_group
>  4 trainee_g1 -> g2 trainee profile     PASS_deny_idor
>  5 trainee_g1 -> g2 attendance          PASS_deny_idor
>  6 trainee_g1 -> مجموعته (لازم يشتغل)    PASS_allow_own_group
>  7 trainee_g1 -> حضوره (لازم يشتغل)     PASS_allow_self
>  8 servant_g1 -> متدرّب g1 (الميزة)     PASS_servant_same_group
>  9 servant_g1 -> group2 servants        PASS_deny_servant_cross
> 10 admin -> group2 (لازم يشتغل)         PASS_admin_global
> ```
>
> **أثر `profiles` policy** (كان 50/39/50 لكل متدرّب):
> ```
> trainee_g1  total=18  other_group=0
> trainee_g2  total=18  other_group=0
> admin       total=50  other_group=32   ← الوصول العالمي محفوظ
> ```
>
> **فحص تراجعي:** `tables=50`, `rls_on=50`, `no_policy=0`,
> `unsafe_callable=0`, `definer_no_searchpath=0`,
> `profiles=50` `marathon=54` `groups=3` `roles=5` — **البيانات سليمة**.
>
> **فحص regressions على الـ frontend:** الـ 20 استعلام `profiles` اتراجعت.
> صفحات الـ admin بتقرأ `id = user.id` (مسموح بفرع `id = auth.uid()`)،
> و`trainees/page.tsx:58` بيفلتر بـ `group_id` لغير الـ admin.
> **لا يوجد استعلام كسر.**

> #### ⚠️ تصحيحان على نص الخطة الأصلي (اتصلّحوا قبل التطبيق)
> **1. صلاحية `VIEW_TRAINEES` غير موجودة.** مفردات الصلاحيات الفعلية في production:
> `GRADE_EXAMS`, `MANAGE_BOOKS`, `MANAGE_CURRICULUM`, `MANAGE_LECTURES`, `MANAGE_MARATHON`.
> لو اتكتبت `VIEW_TRAINEES` كانت هترجّع `false` لكل الخدّام وهتكسر نفس-المجموعة.
> الحل المطبَّق: فحص الدور `servant`/`secretariat` **أو** `MANAGE_LECTURES`/`GRADE_EXAMS`.
>
> **2. شرط حذف الـ policy كان غلط.** كان بيفحص `polroles = ARRAY[0]` (أي PUBLIC)،
> لكن الـ policy الموجودة `TO authenticated` (oid 16485).
> النتيجة: الحذف **ما كانش هيلاقي حاجة**، والسياسة الجديدة هتـ **OR** مع القديمة
> (= التسريب يفضل مفتوح). اتغيّر لـ **حلقة على كل سياسات SELECT**.

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

## 🔴 المرحلة 2 — Backend PHP معطّل فعليًا [5 من 8 routes] ✅ **[تم الإصلاح — 2026-09-30]**

**الخطورة:** `CRITICAL` (وظيفيًا) · **الأثر:** إنشاء backup / استيراد / تصدير / رفع / حذف — **كلهم 500**

**✅ الحل المُطبَّق:** في `JwtAuthMiddleware.php` كان `(array)$decoded` cast سطحي، فـ`stdClass` المتداخلة في `app_metadata`/`user_metadata` كانت تفشل عند القراءة `['role']` بـ:
`Cannot use object of type stdClass as array`. الإصلاح: `json_decode(json_encode($decoded), true)` مع تحقق `is_array` — deep cast يحوّل كل المستويات. خمسة مواقع قراءة مُحتاجة نفس المعالجة، والاتنين بتقرأوا نفس المسار فالإصلاح واحد.

**Rollback:** استرجاع السطر القديم — التغيير سطر واحد مغلق.

**النتائج بعد الإصلاح:** اختبارات مسار النجاح ونفيت regress الـ `stdClass` fatal. الـ suite الأمني رجع **21/21 → (بعد المرحلة 4) 26/26**، والـ HTTP harness **16/16** بلا تغيير في السلوك.

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

## 🔴 المرحلة 3 — تصعيد أفقي في export [يفتح بعد إصلاح 2] ✅ **[تم الإصلاح — 2026-09-30]**

**الملف:** `backend-api/src/Controllers/ExportController.php:13,17`

```php
RbacMiddleware::requireRoles($user, ['admin', 'super_user', 'servant', 'secretariat']);
$isGlobal = in_array($user['role'] ?? '', ['admin', 'super_user'], true);
// غير الأدمن: المجموعة تُشتق من التوكن المُتحقَّق منه فقط —
// طلب group_id في الـ URL ما بيوسّعش الوصول، بيتجاهل.
$groupId  = $isGlobal
    ? (isset($_GET['group_id']) ? (int)$_GET['group_id'] : 0)   // 0 = الكل
    : (int)($user['group_id'] ?? 0);
```

**⚠️ تصحيح مُطبَّق على هذه الخطة:** `GroupScopeMiddleware::enforceGroupScope()` بترجع `void` وبتعمل `Response::error` نهائي — **مش** boolean. فكتابة شرط `!enforceGroupScope(...)` كانت هتكون false دائمًا، يعني الفحص الأمني هيتشال بدون ما حد ياخد باله. عشان كده التنفيذ الفعلي **مش** بيستدعيها في المسار غير-الأدمن أصلًا: بيقفل export على مجموعة التوكن ويحدي الطلب.

**السلوك النهائي المُتحقَّق منه (اختبار 4/4 على المسار الدقيق لـ PostgREST):**
| الدور | `?group_id` | نتيجة الطلب الفعلية |
|---|---|---|
| `admin` | `2` | `group_id=eq.2` ✅ override |
| `admin` | (مفيش) | كل المجموعات ✅ |
| `servant` g1 | `2` | `group_id=eq.1` — **rij scoping مش رفض** |

> **قرار دلالات (يحتاج تأكيد من صاحب المشروع):** السلوك الحالي **silent scoping** (طلب g2 من servant g1 بيرجع بيانات g1 بدل `403`).
> الحد الأمني **مقفول**، لكن هل المطلوب رفض صريح؟ اتسجّل كـ open question في `GO_LIVE_CHECKLIST.md`.

**شغّال قبل ده؟** ❌ لا — الـ 500 كان بيقطع قبل الـ CSV. إصلاح ٢ **كان هيحوّله لتسريب شغّال** لو اتعمل منفرد، لأن ده سبب ربط المرحلتين ٢ و ٣ في نفس الـ commit.

---

## 🔴 المرحلة 4 — Traversal على الرفع [حيّ — الملفات بتتم_write] ✅ **[تم الإصلاح — 2026-09-30]**

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
**النتائج الفعلية بعد الإصلاح (9/9):**

| الحالة | النتيجة |
|---|---|
| `folder_type=../../../ESCAPED_A` | `400` — ولا ملف اتكتب بره `storage/` ✓ |
| مسارات traversal أخرى | مرفوضة كلها ✓ |
| `user_role` خارج الـ allowlist | `400 INVALID_USER_ROLE` ✓ |
| رفع شرعي `folder_type=mp3` | نجح → `storage/academic/group_1/mp3/` ✓ |
| خادم g1 → `group_id=2` | مرفوض (group scope غير مشروط) ✓ |

> ⚠️ تصحيح منهجي مهم: أول اختبار بعد الإصلاح فشل لأن الـ assertion كان بيدوّر على **اسم الملف الأصلي**، لكن الـ sanitizer بيولّد UUID. الفشل كان في **الاختبار** مش في الـ production fix. الـ assertion الصح هو **وجهة الملف** جوه `storage/`.

> ⚠️ وقتها كمان الـ harness الأمني regressed من `21/21` لـ `18/21` — وده كمان **سلوك الاختبار مش المنتج**: كان بيفحص نافذة source ثابتة (1600 حرف) فـ`saveUploadedFile()` بقت أطول من كده. اتصلّح إن الـ window يتبع حدود الدوال، وطلعت **26/26**. لو شفت regression مفاجئ بعد تعديل، **افحص الـ harness قبل ما تفترض إنك كسرت المنتج**.

---

## 🟠 المرحلة 5 — أسرار وكلمات مرور في المستودع ✅ (جزئيًا — المصدر نضيف، الدوران متبقي)

| # | المهمة | الملف |
|---|---|---|
**✅ المُنفَّذ في المصدر (commit `bd09a9f`):** كل القيم الحقيقية اتشالت من الشجرة. الباقي (الدوران) **متنفَّذ**.

| # | المهمة | الحالة |
|---|---|---|
| 5.1 | **حذف feature الـ quick-login بالكامل** من production | ✅ `handleQuickLogin` + `QUICK_ACCOUNTS` + الكروت + `Users` import + الـ prefills اتشالوا |
| 5.2 | نقل كلمات المرور من 11 سكربت لـ env | ✅ 6 قيم استُبدلت بـ `ek_pw("EK_PW_*")` — **بلا fallback مقصود** |
| 5.3 | **دوران** كل كلمات المرور | ❌ **متنفَّذ — مطلوب من صاحب المشروع** |

> `handleQuickLogin` كان بيفتح `/login` (public) وبيدخل بحساب admin بضغطة. اتشال بالكامل.

**التحقق المُنفَّذ:**
- `tsc --noEmit` نظيف · `next lint` بلا errors (warnings فقط) · `next build` ناجح (22 صفحة)
- **صفر** ظهور لـ `Pass123` في `frontend/src/` وفي **الـ build output** (`static/` + `server/` + cache)
- المسح على الملفات المتتبَّعة: الوحيد الباقي هو `ghost_user` في اختبار negative — **حساب غير موجود** في production، والقيمة غلط عمدًا. سيبها زي ما هي.
- الـ 9 حسابات المستخدمة في السكربتات **مُتحقَّقوجودها في production** عبر `profiles` — أي إن القيم اللي اتشالت كانت **أسرار حيّة**، مش بيانات اختبار وهمية.

**⚠️ القيم في git history.** المصدر نضيف، لكن `git log` لسه فيه القيم. القرار لك يا صاحب المشروع:

| الخيار | التكلفة |
|---|---|
| **A. دوران كل كلمة مرور** (موصى به) | 5 دقائق من Dashboard + invalidate sessions. التاريخ بيفضل مرئي بس **ميبقاش صالح**. |
| **B. `git filter-repo` / BFG** | يمسح التاريخ فعليًا. **مؤجَّل:** بيكسر كل SHAs ويطلب push `--force`، وأي fork/clone عند أي حد بيخلي النسخة القديمة حية. **مجبرك تنسخ احتياطي قبل ده.** |

> توصيتي: **A**. الفرق العملي بين A و B بعد الدوران = صفر، والخطر بتاع B أعلى بكتير.

**ملاحظة على البنية:** الـ `ek_pw()` بتعمل `SystemExit` لو الـ env var ناقصة — يعني **السكربت بيفشل بصوت عالي** بدل ما يرجع لتمرير بكلمة مرور متسربة من الكود.

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

1. ✅ كل استغلال المرحلة ١ رجّع `42501` — **متحقَّق على production**
2. ✅ 5 من 5 الـ RPCs ترجع بيانات للمجموعة الصحيحة — **10/10 على production**
3. ✅ **ولا** استغلال يُخرج ملفاً بره `storage/` — **متحقَّق (9/9)**
4. ✅ كل مسارات **النجاح** في الـ 8 PHP routes ترجع 200
5. ✅ فحص `authenticated` على كل ادعاء عزل
6. 🟡 صفر كلمة مرور أو secret في الـ **working tree** (✅) — **الدوران لسه متبقي**
7. ❌ `/health` = `ONLINE` على **الإنتاج** — متبقي
8. ❌ تسجيل دخول حقيقي بـ `trainee_g1` يعرض مجموعة 1 فقط — متبقي

### حالة التحقق الآن (2026-09-30)

| # | البند | الحالة | الدليل |
|---|---|---|---|
| 1 | استغلال RPC بين المجموعات | ✅ PASS | 10/10 تحت دور `authenticated` على production |
| 2 | `profiles` محصور في المجموعة | ✅ PASS | `trainee_g1: 0 خارج` · `admin: 32 خارج` (وصول عام محفوظ) |
| 3 | `create_test_user` بحساب anon | ✅ PASS | `401 permission denied` |
| 4 | تصعيد الصلاحيات عبر `profiles` | ✅ PASS | group-hop و self-admin مرفوضين بـ trigger |
| 5 | JWT claims العميقة (PHP) | ✅ PASS | اختبارات export: 4/4، لا `stdClass` fatal |
| 6 | scoping الـ export | ✅ PASS | servant g1 يطلب g2 → `group_id=eq.1` فعليًا |
| 7 | traversal على الرفع | ✅ PASS | 9/9، لا ملف بره `storage/` |
| 8 | allowlist الرفع | ✅ PASS | `folder_type` و`user_role` مرفوضين خارج القوائم |
| 9 | الأسرار في المصدر | ✅ PASS | صفر في `frontend/src` + build output |
| 10 | **دوران كلمات المرور** | ❌ متبقي | مطلوب من صاحب المشروع |
| 11 | **رفع PHP للإنتاج** | ❌ متبقي | الحزمة جاهزة ومُتحقَّق، لم تُرفع |
| 12 | **env vars على Vercel** | ❌ متبقي | `NEXT_PUBLIC_SUPABASE_*` |
| 13 | **تسجيل دخول حقيقي** | ❌ متبقي | متوقف على 10–12 |

### 🔬 الدليل على الحزمة المُسلَّمة (مش الـ source tree)

الحزمة اتبنت من `backend-api/` بعد كل الإصلاحات واتفحصت **بعد فك الضغط من جديد**:

```
%LOCALAPPDATA%\ElKarooz-API-public_html.zip  →  36 ملف · 41,636 بايت
```

| الفحص | النتيجة |
|---|---|
| PHP syntax على كل ملف بعد فك الضغط | **35 ملف · 0 أخطاء** |
| `/health` من النسخة المفكوكة | `200 ONLINE` |
| traversal على النسخة المفكوكة | **مرفوض** · ولا ملف بره `storage/` |
| export scoping على النسخة المفكوكة | `group_id=eq.1` · CSV اتولّد · لا fatal |

> ⚠️ **الحزمة دي لسه ما اترفعتش لـ Hostinger.** التحقق كله تم **محليًا على نسخة مفكوكة**. لحد ما الحزمة تترفع ويتحقق `/health` على `elkaroozschool.is-best.net`، بند 7 يفضل ❌.

> **القاعدة المستخدمة:** أي اختبار على RLS لازم يشتغل بدور `authenticated`.
> `postgres` و`service_role` **بتتخطّى RLS**، فاختبار بيعدّي عليهم بيوهمك إن العزل شغّال.
>
> العنصر ٨ هو أهم عنصر في القائمة دي: من غير تسجيل دخول حقيقي، المشروع **مش** في production فعليًا مهما كانت كل الاختبارات خضراء.
