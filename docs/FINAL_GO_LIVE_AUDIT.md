# FINAL GO-LIVE AUDIT — EL KAROOZ SCHOOL

> **Historical snapshot — 2026-09-30, superseded for current status.** The claim below that one Vercel environment issue was the only blocker describes that snapshot only. On 2026-10-04, the MCP project host did not match `frontend/.env.local`; the owner described it as staging, but its link to the app's intended database is unverified. The later static authorization findings for `get_trainee_marathon_state` and `log_operational_event` apply only to that MCP target; no remediation was applied. Production readiness is unverified. Use `PHASE0_COMPLETION_STATUS.md` and `GOOGLE_DRIVE_PHASE0_AUDIT.md` for current evidence.


**التاريخ:** 2026-09-30
**النطاق:** كود المستودع الفعلي + قاعدة البيانات الحيّة + بناء إنتاجي فعلي
**المنهجية:** لا `PASS` إلا بدليل تشغيل حقيقي. كل نتيجة أدناه مُسندة إلى أمر
نُفِّذ وأعاد مخرجات.

## الحالة النهائية: `NOT READY`

**سبب واحد فقط، قابل للإصلاح في دقائق:** متغيرات البيئة في Vercel غير
مضبوطة، فالإنتاج الحالي مبني **بدون** أي قيم Supabase.

---

## 1. الإنتاج (Vercel)

| المسار | الحالة |
|---|---|
| `/` | `307` → `/login` ✅ |
| `/login` | `200` ✅ |
| `/about` | `200` ✅ |
| `/groups` | `307` (محمي) ✅ |
| `/manifest.json`, `/sw.js`, `/logo.png` | `200` ✅ |

### ⛔ الحاجز الحاسم
فحص الـ JS bundle المنشور على `/login`:
```
Supabase URL occurrences: 0
anon key occurrences:     0
```
يعني البناء نجح بدون `NEXT_PUBLIC_SUPABASE_*` إطلاقاً. النتيجة: **الشاشة
تعمل لكن تسجيل الدخول لا يمكن أن ينجح** مهما كان الكود صحيحاً.

**السبب:** أسماء المتغيرات تبدأ بـ `NEXT_PUBLIC_`، فتُدمج (inline) في
الـ bundle **وقت البناء**. غيابها عن Vercel = غيابها عن الكود، ولا يمكن
إصلاحها بـ Redeploy قبل ضبطها.

### الحل (عبر واجهة Vercel — لا أملك token للوصول إليه، فالتعديل يدوي):
| المتغير | القيمة | Visibility | Environment |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://kgqgnqjkrghvktymbimz.supabase.co` | **Config** | All Environments |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | المفتاح العام `anon` | **Config** | All Environments |

> ⚠️ **Visibility يجب أن يكون `Config` وليس `Secret`.** Vercel يرفض
> `Secret` مع البادئة `public`:
> `Environment variables with a public framework prefix cannot use 'visibility: secret'`

> ⚠️ بعد الضبط: **Redeploy** (وليس mere restart) لتُدمج القيم.

---

## 2. قاعدة البيانات (Supabase) — `kgqgnqjkrghvktymbimz`

### 🔴 ثغرة تم اكتشافها وإغلاقها على الإنتاج
طلب `POST /rest/v1/rpc/create_test_user` بمفتاح `anon` **أنشأ حساب مستخدم
حقيقياً** مع `role` و `group_id` يختارهما المهاجم.

- **قبل الإصلاح:** نجح (تم إنشاء `anon_probe_test` فعلياً).
- **السبب:** 29 دالة `SECURITY DEFINER` مملوكة لـ `PUBLIC`.
- **بعد الإصلاح:** `HTTP 401 permission denied` ✅
- **التنظيف:** حُذف الحساب من `auth.users` ✅
- **بيانات عامة لم تنكسر:** `groups`, `roles`, `bible_books` ما زالت `200` ✅

### RLS
```
50/50 جداول RLS مفعّلة
0 جداول بلا أي سياسة
```

### عزل المجموعات (فحص على مستوى الدور، داخل transaction)
| الجدول | group-1 trainee | group-2 trainee |
|---|---|---|
| `gallery_items` | 5 | **0** |
| `mp3_tracks` | 5 | **0** |
| `curriculums` | 8 | **0** |
| `exams` | 1 | **0** |

عزل حقيقي على مستوى قاعدة البيانات، لا إخفاء في الواجهة.

---

## 3. واجهة PHP (Hostinger)

### 🔴 خطأ في مسار الجذر — كان سيمنع الـ API بالكامل
الملف يُرفع **مسطّحاً** في `public_html`، فتصبح `config/` و `src/` و
`vendor/` **بجوار** `index.php`. لكن الكود استخدم `dirname(__DIR__)` الذي
يشير عندها إلى مستوى **أعلى** من التطبيق.

**النتيجة المتوقعة:** كل طلب يُرجع `VENDOR_MISSING` أو fatal error — أي أن
الـ API لا يعمل إطلاقاً على Hostinger.

**الإصلاح:** صنف واحد `src/Utils/AppRoot.php` يحلّ الجذر مرة واحدة، ويعمل في
**كلا** التخطيطين، مع `fail-closed` بدل التخمين. حُدّث 7 ملفات.

### الأدلة
أُعيد بناء الـ bundle المسطّح **بالضبط كما سيراه Hostinger** وشُغّل عليه:

| الفحص | النتيجة |
|---|---|
| بناء PHP (تطبيق) | ✅ 25 ملف / **0 أخطاء** |
| بناء PHP (الحزمة المسطّحة) | ✅ 35 ملف / **0 أخطاء** |
| `scripts/verify_production_security.php` | ✅ **21/21** |
| `scripts/verify_api_http.php` (خادم حقيقي) | ✅ **16/16** |
| `/health` من `public_html` | ✅ `ONLINE` |

### إصلاحات أمنية أخرى (مُختبَرة)
| # | المشكلة | الإصلاح | الاختبار |
|---|---|---|---|
| 1 | تجاوز JWT بقبول حمولة غير موقّعة | حذف fallback | `forged_superuser` → 401 |
| 2 | اجتياز مسار في حذف الملفات | canonicalization + حدّ الجذر | 3 متغيرات مرفوضة |
| 3 | تخطّي عزل المجموعات في Storage | استدعاء غير مشروط | رفع من مجموعة أخرى مرفوض |
| 4 | `validateUpload` غير مستدعاة | تفعيل الاستدعاء | فحص ثابت |
| 5 | مفاتيح وهمية عند غياب env (fail-open) | fail-closed 500 | اختبار غياب env |
| 6 | CORS يسمح بـ localhost في الإنتاج | حصره بـ non-production | اختبار production |

---

## 4. الواجهة الأمامية (Next.js)

| الفحص | النتيجة |
|---|---|
| `tsc --noEmit` | ✅ **0 أخطاء** |
| `next build` | ✅ Compiled successfully |
| توليد الصفحات | ✅ **22/22** |

### 🔴 إصلاح ضروري: تعارض نسخة Next.js
`package.json` في **جذر** المستودع كان يثبّت `next@14.2.24` بينما
`frontend/package.json` يثبّت `14.2.35`. مع `workspaces` كان Vercel يبني
إصداراً **مختلفاً** عن الذي يُفحص محلياً — وهذا بالضبط سبب أخطاء
`No Next.js version detected` و`Module not found` السابقة.

**الإصلاح:** حُذف الاعتماد من الجذر، وأُزيل `workspaces` ليطابق التثبيت
المحلي أمر Vercel بالضبط (`cd frontend && npm install`).

### الترقية الأمنية
`14.2.24` → **`14.2.35`** (نشرة تفويض حرجة في Middleware، الإصلاح ≥ 14.2.25).

---

## 5. الحزمة النهائية

`%LOCALAPPDATA%\ElKarooz-API-public_html.zip` — **39 KB، 37 ملفاً**

تحقّقت من الحزمة نفسها (لا مجلد العمل):
```
index.php  .htaccess  config/{app,storage,supabase}.php
vendor/autoload.php  vendor/firebase/php-jwt/src/JWT.php
storage/.htaccess  src/Utils/AppRoot.php
```
- ✅ `.htaccess` **مُضمَّن** (استبعاده = 404 في كل المسارات)
- ✅ لا `.env` ولا `.log` ولا أسرار
- ⚠️ **الحزمة القديمة `public_html.zip` في `%LOCALAPPDATA%` قديمة ومُبطلّة — احذفها**

---

## 6. ما لم يُختبر بعد (بصراحة)

| # | البند | الحالة |
|---|---|---|
| 1 | دخول إنتاجي username/password | ❌ **NOT VERIFIED** — معطّل بسبب الحاجز (1) |
| 2 | `https://elkaroozschool.is-best.net/health` | ❌ لم تُرفع الحزمة بعد |
| 3 | تشفير PHP مع مفاتيح Supabase الحديثة (RS256) | ❌ لم يُختبر دخول حقيقي |
| 4 | استثناء رسالة الغياب (Admin فقط يعدّلها) | ❌ لم يُختبر |
| 5 | Backup/Restore/Import/Export | ❌ لم تُختبر على الإنتاج |
| 6 | PWA: offline / install / service worker | ❌ الملفات `200` فقط |
| 7 | حزمة اختبارات آلية (Jest/Vitest) | ❌ غير موجودة في المشروع |
| 8 | المفتاح العام في سكربتات Python | ⚠️ `anon` فقط — يُنقل لـ `.env` |

> **تحذير:** تقارير سابقة في الماضي `READY` و`137/137` و`12/12` — **لا تُعامل كدليل**.
> الأدلة في هذا المستند فقط هي المعتمدة، وكلها من اليوم.

---

## 7. الترتيب المطلوب للإطلاق

1. اضبط `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` في Vercel
   (Visibility: **Config**، All Environments) ← **هذا هو الحاجز**
2. **Redeploy**، ثم اختبر `/login` بدخول حقيقي
3. ارفع `ElKarooz-API-public_html.zip` إلى `public_html` على Hostinger
4. اختبر `https://elkaroozschool.is-best.net/health`
5. اختبر: عزل المجموعات، رفع/حذف ملف، backup، absence asymmetry
6. انقل أسرار سكربتات Python إلى `.env`
7. حدّث الحالة إلى `GO` فقط بعد نجاح 2 و4 و5
