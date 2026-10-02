# خطة إكمال مشروع مدرسة الكاروز - 10 مراحل

> **الحالة الحالية:** `NOT READY`
> **تاريخ الفحص:** 2026-10-01 · SHA `6519986` · branch `main`
> **نوع الخطة:** تنفيذية، مبنية على فحص الكود والـDB الفعلي - لا على تقارير سابقة.

---

## كيف تُقرأ هذه الخطة

كل مرحلة لها:
- **الهدف** - سطر واحد
- **المهام** - أرقام، كل واحدة قابلة للتحقق بمعيار صريح
- **معيار القبول** - لا يُعتبر "تم" إلا بنتيجة أمر حقيقي
- **التبعية** - ماذا يجب أن يُنجز قبلها

**قاعدة صارمة:** لا يُكتب `تم` إلا بنتيجة أمر مُنفَّذ. الاختبار الذي يمر لأن توقعه اتغيّر ليس `PASS`.

---

## خط الأساس المُقاس (2026-10-01)

هذه أرقام مقاسة فعليًا، تُثبَّت في أول commit من المرحلة 0.

### البنية

| المكوّن | القياس |
|---|---|
| Supabase public tables | **50** |
| جداول RLS مفعّل | **50 / 50** |
| جداول RLS مطفأ | **0** |
| إجمالي RLS policies | **90** |
| جداول بلا أي policy | **0** |
| INSERT policies | **3** |
| UPDATE policies | **5** |
| DELETE policies | **2** |
| RPCs مستخدمة من المتصفح | 20 |
| جداول يقرأها المتصفح مباشرة | 47 |
| Frontend | **14,760 سطر / 40 ملف** |
| اختبارات Frontend | **0** |
| Backend PHP | ~15,000 سطر / 33 ملف |
| سكربتات اختبار Backend | 12 |
| CI | **لا يوجد** |

### حالة البناء (مُنفَّذ فعلاً)

```
npx tsc --noEmit   → exit 0، نظيف
npx next lint      → exit 0، 0 errors / ~14 warnings (stale closures)
npx next build     → exit 0، 22 صفحة
```

### حالة الخوادم

```
PHP  https://elkaroozschool.is-best.net   HTTPS rc=56 · HTTP rc=52   ← لا يستجيب
Vercel  /            → 307
Vercel  /login       → 200
```

### حالة الاستعادة (B7)

```
export:  SECURITY INVOKER · service_role فقط · 43/43
restore: SECURITY DEFINER · service_role فقط · 41/41 · 34/34 matrix
round-trip: profiles=50 · metadata_match=50/50 · provider_keys=48
```

---

## 🔴 المرحلة 0 - تثبيت خط الأساس

**الهدف:** تجميد الحالة الفعلية في git، حتى لا تتغير الأرقام تحت المراحل التالية.

| # | المهمة | المعيار |
|---|---|---|
| 0.1 | كتابة `docs/BASELINE_2026_10_01.md` بكل الأرقام أعلاه | الملف موجود ومُراجَع |
| 0.2 | `git tag baseline-2026-10-01` | `git tag -l` يعرضه |
| 0.3 | تشغيل كل الـ12 سكربتات القائمة وتسجيل المخرجات في الملف | 12 نتيجة مُلصقة |
| 0.4 | `npx next build` نظيف + `tsc` نظيف | `exit 0` مثبت في الملف |

**التبعية:** لا شيء. هذه نقطة البداية.
**مخاطرة:** صفر - كل تغيير هنا توثيق فقط.

---

## 🔴 المرحلة 1 - الـ14 جدول بلا سياسة كتابة

**الهدف:** إغلاق أكبر فجوة منطقية في المشروع.

### التشخيص المُتحقَّق

الـfrontend ينفّذ **127 استعلام بيانات مباشرة** على Supabase بمفتاح `anon` - أي أن كل الصلاحيات متحقّنة في RLS، وهذا سليم.

لكن في المقابل، **14 جدول** تظهر فيها عمليات كتابة من المتصفح، و**مفيش ولا policy للكتابة** فيها:

```
attendance_records   exam_grades        marathon_answers    marathon_questions
marathon_sections    mp3_tracks          gallery_items        post_images
daily_verses         user_favorites      servant_permissions  group_secretariat
backup_records       import_history
```

**النتيجة العملية:** إما أن الكتابة ترفض في الـDB، أو تمر عبر RPC. في الحالتين الـfrontend لا يعرض للمستخدم أي تفسير.

### الفحص الثاني - الصمت في الواجهة

| الملف | الجدول | `.catch` | error state | alert/toast |
|---|---|---|---|---|
| `app/page.tsx` | post_images | ❌ | ❌ | ❌ |
| `app/admin/notifications/page.tsx` | daily_verses | ❌ | ❌ | ❌ |
| `app/attendance/page.tsx` | attendance_records | ❌ | ❌ | ❌ |
| `app/books/page.tsx` | user_favorites | ❌ | ❌ | ❌ |
| `app/exams/page.tsx` | exam_grades | ❌ | ❌ | ❌ |
| `app/gallery/page.tsx` | gallery_items | ❌ | ❌ | ❌ |
| `app/groups/[id]/page.tsx` | attendance_records | ❌ | ❌ | ❌ |
| `app/marathon/page.tsx` | servant_permissions | ❌ | ❌ | ❌ |
| `app/marathon/manage/page.tsx` | marathon_answers | ❌ | ✅ | ❌ |
| `app/marathon/[id]/page.tsx` | marathon_questions | ❌ | ✅ | ❌ |
| `app/mp3/page.tsx` | mp3_tracks | ❌ | ❌ | ❌ |
| `components/ServantProfileDrawer.tsx` | servant_permissions | ❌ | ✅ | ❌ |

**8 من 12 صفحة تتجاهل الخطأ كليًا.**

### المهام

| # | المهمة |
|---|---|
| 1.1 | تصنيف كل جدول من الـ14: هل كتابة متوقعة من الواجهة أم من الـbackend فقط؟ |
| 1.2 | قرار لكل جدول: **RPC مقيّد** / **policy دقيقة مع `with check`** / **إزالة الكتابة من الواجهة** |
| 1.3 | كتابة migration لكل قرار، مع اختبار `SET LOCAL ROLE authenticated` قبل التطبيق |
| 1.4 | إضافة `.catch` + error state + رسالة عربية في الـ12 ملف |
| 1.5 | إخفاء زر الحفظ عند الفشل +Friendly retry بدلodata ضائعة |

**معيار القبول:**
- كل كتابة من المتصفح: إمّا تنجح، أو المستخدم يرى رسالة واضحة - **صفر صمت**
- كل migration مُختبَرة في transaction بـ`ROLLBACK` أولًا
- `next build` + `tsc` نظيفان بعد التعديل

**ملاحظة تصميمية:** لا تُكتب policy بـ`USING (true)`. أي write policy لازم يكون لها `USING` للقراءة و`WITH CHECK` للكتابة، ومربوطة بالدور والمجموعة.

---

## 🔴 المرحلة 2 - قياس الأداء الحقيقي

**الهدف:** تحويل «لا أعرف إن كان بطيئًا» إلى أرقام.

أرقام `next build` الحالية:

```
/trainees          5.13 kB · 181 kB first load
/attendance            -    · 181 kB
/marathon/manage   5.25 kB · 175 kB
/gallery           3.97 kB · 174 kB
First Load JS shared: 87.3 kB   ← ممتاز
Middleware: 86.4 kB
```

| # | المهمة | المعيار |
|---|---|---|
| 2.1 | نشر measuring على production أولًا | لا يُقاس على localhost |
| 2.2 | LCP / INP / CLS على `/login` و`/attendance` و`/trainees` | أرقام Lighthouse مسجلة |
| 2.3 | كشف N+1 queries في صفحات الجداول | قائمة بالاستعلامات المتكررة |
| 2.4 | إضافة `.limit()` / pagination للصفائح الثقيلة | عدد الصفوف المُحمَّلة محدود |
| 2.5 | Skeleton loaders بدل شاشات فارغة | كل صفحة بيانات تعرض حالة تحميل |

**التبعية:** 6.1 (النشر). لا يمكن قياس أداء حقيقي قبل وجود production.

---

## 🟠 المرحلة 3 - ربط الـPHP API بالواجهة

**الهدف:** سدّ فجوة معمارية قائمة فعلاً.

**المُتحقَّق:** `NEXT_PUBLIC_PHP_API_URL` معرّف في `frontend/.env.local`، **ولا يوجد ولا استدعاء واحد** في `frontend/src` - تم بحث كل `fetch()` ذات مسار مطلق، فالنتيجة صفر.

**النتيجة:** الـPHP API (13 route) منها backup / restore / export / import / storage - كله بلا واجهة استخدام.

### المهام

| # | المهمة |
|---|---|
| 3.1 | قرار معماري موثَّق: RPC-first (الحالي) ولا hybrid |
| 3.2 | لو hybrid: طبقة `lib/api/` بحدود صلاحية صريحة لكل route |
| 3.3 | بناء واجهة Backup/Restore داخل `/admin` |
| 3.4 | شاشة “نسخ احتياطياطي” للمستخدم العادي |
| 3.5 | جسر `DATABASE_ONLY` / `FULL_SYSTEM` / `FILES_ONLY` في الواجهة |

**معيار القبول:** كل route في الـPHP API إما مستخدم من الواجهة، أو موثّق كـ`backend-only` بسبب أمنية.

---

## 🟠 المرحلة 4 - اختبارات و CI للواجهة

**الهدف:** منع انحدار الجودة - currently صفر اختبارات وصفر CI.

| # | المهمة | المعيار |
|---|---|---|
| 4.1 | Vitest + Testing Library | `npm test` يعمل |
| 4.2 | Suite 1: حرّاس المصادقة وتحويلات الأدوار | كل دور يرى ما يشاء فقط |
| 4.3 | Suite 2: error handling في الـ12 صفحة | فشل الكتابة يظهر للمستخدم |
| 4.4 | Suite 3: RLS-aware data access | لا استعلام يتجاوز boundary |
| 4.5 | `.github/workflows/ci.yml` | typecheck + lint + build + tests |
| 4.6 | gating إلزامي | PR بلا CI خضراء = لا merge |

**التبعية:** 1.4 (لازم الـerror handling تكون موجودة قبل اختبارها).

---

## 🟡 المرحلة 5 - معالجة الأخطاء والتصلّب المتبقية

من `REMEDIATION_PLAN.md` مرحلة 7 - حالة التحقق الفعلية:

| # | المهمة | الحالة |
|---|---|---|
| 5.1 | وقف تسريب `$e->getMessage()` في `public/index.php` → `error_log` + رسالة عامة | ✅ **مُنفَّذ ومُتحقَّق** — الرسالة بقت في اللوج، والعميل بياخد رمز ارتباط |
| 5.2 | `public/.user.ini` بـ`display_errors=Off; log_errors=On` | ✅ **مُنفَّذ ومُتحقَّق** — موجود وشامل في جوه الـZIP |
| 5.3 | `flock()` يغطي read-modify-write كاملًا في rate limiter | ✅ **مُنفَّذ ومُتحقَّق** — 24 عملية متزامنة، كلهم شافوا رقم مختلف |
| 5.4 | تنشيط `RateLimitMiddleware` (كان **صفر call sites**) | ✅ **مُنفَّذ ومُتحقَّق** — 12 نقطة استدعاء، 429 فعلي بعد الحد |
| 5.5 | `filter_var` على `X-Forwarded-For` في `AuditLogService.php` | ✅ **مُنفَّذ ومُتحقَّق** — 7/7 ضد التزوير |
| 5.6 | `.limit()` للصفحات الأثقل | ⏭️ **لا ينطبق** — الاستضافة shared، مش Vercel؛ الحدود على مستوى PHP (5.4) |

### كيف تم التحقق من 5.3 و5.4 و5.5

البنود دي اتنفذت مع اختبار يكشف التراجع، مش مجرد فحص بنيوي:

| الاختبار | يثبت | النتيجة |
|---|---|---|
| `scripts/verify_rate_limit_atomicity.php` | 24 عملية متزامنة على نفس العدّاد | 24 قيمة مختلفة (mutation test: 24 قيمة متطابقة عند إعادة البوج القديم) |
| `scripts/verify_client_ip.php` | العنوان المُزوَّف لا يصل لجدول التدقيق ولا للعدّاد | 7/7 |
| `request حقيقي على PHP حي` | الحد يُطبَّق فعلاً، و`/health` لا يتأثر | `401×5` ثم `429` |

**ترتيب 5.3 قبل 5.4 اتلتزم بيه فعليًا:** لو كان اتنشط الحد قبل إصلاح القفل، كان العدّاد يعدّ أقل من الحقيقة تحت الضغط — حماية وهمية. الاختبار أثبت الفارق: بالبوج القديم 24 طلب كلهم مرّوا من حد 1.

**مصدر واحد للـIP:** اتعمل `src/Utils/ClientIp.php` بدل تكرار المنطق في مكانين، لأن نسختين من القاعدة دي هتختلف حتماً مع الوقت.

> **تحذير مُلزم:** 5.3 **قبل** 5.4. الـ`LOCK_EX` الحالي على الكتابة فقط، فالقرار يُتخذ **قبل** القفل. تفعيله بدون 5.3 = حماية وهمية (تُعدّ أقل من الحقيقة تحت الضغط).

---

## 🔵 المرحلة 6 - النشر والاختبار على الخادم الحقيقي

**الهدف:** تحوّل كل التحقق المحلي إلى تحقق على production.

**البلocker:** لا توجد بيانات نشر محفوظة محليًا - `[REDACTED]`

| # | المهمة | المعيار |
|---|---|---|
| 6.1 | توفير بيانات النشر (SFTP/FTP + Vercel token) | بيانات صالحة في `.env` (لا في git) |
| 6.2 | حل تعطّل PHP host (`rc=56` / `rc=52`) | `curl -I` يعيد 200 على `/health` |
| 6.3 | تفعيل SSL صحيح | شهادة صالحة، بلا تحذير |
| 6.4 | رفع حزمة `public_html.zip` | `/health` يرد فعليًا |
| 6.5 | **اختبار حرّاس web-root على Apache حقيقي** | `config/.htaccess` etc. ترد 403 فعليًا - لا تحقق بنيوي فقط |
| 6.6 | تسجيل دخول حقيقي على الخادم المنشور | استجابة `200` + `role` صحيح |
| 6.7 | `POST /restore/execute` من production | round-trip ناجح عبر HTTP، لا عبر SQL مباشر |
| 6.8 | ضبط CORS بين `elkaroozschool-seven.vercel.app` والـPHP | طلب حقيقي ينجح |
| 6.9 | إعادة بناء Vercel بمتغيرات البيئة | vars على **كل** البيئات، لا Production فقط |

> ### نتيجة فحص 6.2 (2026-10-02) — الرفع تم، لكن الدومين ده مش الاستضافة

فحص فعلي بعد الرفع، لا استنتاج:

| القياس | النتيجة |
|---|---|
| DNS `elkaroozschool.is-best.net` | `185.27.134.59` |
| TCP 80/443 | متصلين |
| TLS | ✅ **نجح** — TLSv1.3، الشهادة صالحة (SAN يشمل wildcard `*.is-best.net`) |
| HTTP | `200 OK` — لكن بايمحتوى JS مش `/health` |
| `Server:` | **`openresty`** — مش Apache/LiteSpeed |
| جسم الرد | صفحة challenge: `<script src="/aes.js">` + `slowAES.decrypt` |
| `/nonexistent-zzz-12345` | **نفس صفحة challenge بالظبط** |
| subdomain وهمي (`zzq7x9k3nonexistent`) | فشل DNS ✅ |
| `api.elkarooz-school.com` | **فشل DNS** — النطاق مش مُفعَّل |

### الدليل الحاسم: مفيش PHP على الدومين ده

المسارات الأربعة دي رجّعت نفس صفحة challenge بالبايت، مع اختلاف 3 بايتات بس في الحجم
(نفس الـpadding):

| المسار | النتيجة |
|---|---|
| `/health` | 200 · challenge · 859 bytes |
| `/index.php` | 200 · challenge · 862 bytes |
| `/config/supabase.php` | 200 · challenge · 872 bytes |
| `/nonexistent-zzz-12345` | 200 · challenge · 874 bytes |

**مسار مش موجود رجّع 200 بدل 404.** ده مستحيل لو فيه تطبيق PHP شغال — أي تطبيق
بيرد 404 على الأقل. وبما إن `/config/supabase.php` رجّع نفس الرد، فمفيش
ملف اتقري أصلاً.

الـchallenge ده بوابة حماية بتاع **مزوّد الاستضافة** (openresty + AES)، بتحوّل
المتصفح لـJS cookie قبل ما يوصل الطلب لأصل الـbackend. مش LiteSpeed ولا Apache ولا
PHP — فاللي شفته في الـscreenshot الأول («Something Went Wrong») كان من طبقة
أخرى تماماً عن اللي اتصلّح في v2/v3.

### يعني إيه عملياً

- ✅ **v3 اترفع** — بس مش على دومين استضافة PHP.
- ❌ **مفيش استضافة PHP متوصلة بـ`is-best.net`.** محتاجة subdomain أو نطاق
  متسجل في لوحة cPanel/ISPConfig عند المزوّد نفسه، مع **PHP-FPM مفعّل** و
  `.htaccess` متقرأ (AllowOverride All).
- الـTLS اتحسّن عن الجلسة السابقة (كان بيقفل renegotiation، دلوقتي handshake
  سليم) — بس ده تحسّن البوابة مش التطبيق.

### الخطوة المطلوبة من المستخدم

1. تأكيد إن الاستضافة **PHP** فيها، مش static hosting بس.
2. معرفة الـsubdomain أو النطاق الفعلي اللي اتربطت بيه (اللي راجع في لوحة
   الاستضافة، مش اللي في التوثيق).
3. التأكد إن `PHP-FPM` مفعّل للاستضافة دي، و`Open Basedir` يسمح بـ`public_html`.
4. رفع v3 على `public_html` بتاع **الاستضافة**، مش على نطاق البوابة.

### ❌ لم يُغلق

بند 6.2 **ما زال مفتوحاً** — مفيش `200` على `/health` من تطبيق PHP حقيقي بعد.
وبنود 6.5 (حراس 403)، 6.6 (login)، 6.7 (restore عبر HTTP)، 6.8 (CORS)، 6.9
(Vercel) كلها معلّقة على نفس السبب. المرحلة 7 (مصفوفة الأدوار على production)
مش قابلة للإثبات قبله.

> **قاعدة لا تُكسر:** نجاح اختبار SQL على production **ليس بديلاً** عن اختبار PHP/Apache/Auth المنشور. كل بند من بنود B7 المفتوحة يُغلق بطلب HTTP حقيقي فقط.

---

## 🔵 المرحلة 7 - مصفوفة أدوار على production

**الهدف:** إثبات الفصل على الخادم المنشور، لا على localhost.

الأدوار الستة: `super_user`, `admin`, `secretariat`, `servant`, `trainee`, + الحسابات المعطلة/المعلّقة.

| # | المهمة | المعيار |
|---|---|---|
| 7.1 | مصفوفة HTTP: كل دور × كل route (قراءة وكتابة) | جدول allow/deny كامل |
| 7.2 | إثبات حجب cross-group: خادم group 1 يطلب group 2 | `403` فعلي، لا إخفاء في UI |
| 7.3 | التحقق من asymmetry: Admin وحده يعدّل Absence Message | `super_user → 403`، `admin → 200` |
| 7.4 | حساب معلّق (suspended) يُرفض عند middleware | `403 ACCOUNT_SUSPENDED` من الخادم |
| 7.5 | `trainee` يرى مجموعته فقط | `servant`/`scriptariat` كذلك |
| 7.6 | كل حالة deny تُسجَّل في audit log | سجل كامل |

**التبعية:** 6.4 و 6.6.

---

## 🔵 المرحلة 8 - اختبارات الاستغلال (-rollback only)

**الهدف:** إعادة تشغيل كل استغلال مكتشف سابقًا، على production، داخل معاملة قابلة للتراجع.

| # | السيناريو | المعيار |
|---|---|---|
| 8.1 | ANON يقرأ PII عبر `get_trainee_full_profile` | `42501` |
| 8.2 | ANON يقرأ PII عبر `get_trainee_attendance_summary` | `42501` |
| 8.3 | `anon`/`authenticated` يستدعيان RPCs التصدير | `42501` |
| 8.4 | `authenticated` يستدعي restore RPC بclaims super_user مزيفة | `42501` |
| 8.5 | تصعيد trainee → `super_user` | `42501` أو `23505` - **مفيش ثغرة** (مُتحقَّق) |
| 8.6 | تعديل `PASTORAL` من `super_user` | `403` (admin فقط) |
| 8.7 | traversal على رفع الملفات | `400` |
| 8.8 | ZIP bomb / archive bomb | رفض |
| 8.9 | حقن CSV formula | محايدة |
| 8.10 | `session_replication_role='replica'` من دور عام | `42501` (مُتحقَّق) |
| 8.11 | restore بأرشيف معدَّل الترقية | `23505` من `uq_single_super_user` (مُتحقَّق) |

> **كل اختبار ينفَّذ داخل `BEGIN ... ROLLBACK`.** التحقق يستخدم `SET LOCAL ROLE authenticated` + `request.jwt.claims` - **لا** `current_user = postgres` أبدًا.

---

## 🟠 المرحلة 9 - تجربة المستخدم والـPWA

**الهدف:** “سهلة وبسيطة” = شرط قابل للقياس.

| # | المهمة | المعيار |
|---|---|---|
| 9.1 | تدفق الدخول: عدد الضغطات من الصفحة الرئيسية إلى البيانات | ≤ 2 ضغطات |
| 9.2 | حالة “ليس لديك صلاحية” مفهومة وليست شاشة فارغة | رسالة عربية واضحة |
| 9.3 | Consistent loading / empty / error states | لا شاشة بيضاء أبدًا |
| 9.4 | توحيد رسائل الأخطاء (`42701` → “غير مصرح”) | صفر كود تقني مكشوف للمستخدم |
| 9.5 | تسجيل Service Worker وتحقق منه | يعمل في production |
| 9.6 | Installability + offline fallback | Lighthouse PWA ≥ 90 |
| 9.7 | RTL + RTL icons + تباعد متسق | مراجعة بصرية لكل صفحة |
| 9.8 | اختبار على شاشة 360px | لا تمرير أفقي |
| 8.9 | توحيد الأيقونات - **favicon ناقص** (مُتحقَّق) | أيقونة في كل route |
| 9.10 | تحسين preload لخط.display | لا CLS |

---

## 🔵 المرحلة 10 - الجاهزية والتوثيق

| # | المهمة |
|---|---|
| 10.1 | أرشفة التقارير القديمة + `docs/INDEX.md` |
| 10.2 | إعادة كتابة `README.md` (6 أسطر مكررة حاليًا) |
| 10.3 | `RUNBOOK.md`: كيف تنشر، ترجع، تستعيد |
| 10.4 | `INCIDENT.md`: ماذا تفعل إذا نزل الـPHP |
| 10.5 | `SECURITY.md`: سياسة الإبلاغ |
| 10.6 | تحديث `GO_LIVE_CHECKLIST.md` بالنتائج الحقيقية فقط |

---

## 🔁 ملاحظات دائمة

| # | البند | القرار |
|---|---|---|
| 10.1 | الـfixtures في production (حسابين بـ`1111...` و`2222...`) | **لا تُحذف تلقائيًا** - يلزم قرار صريح من صاحب المشروع |
| 10.2 | الـsessions القديمة بعد metadata backfill | تحتاج revoke/refresh قسري |
| 10.3 | الأسرار في git history | الخيار A (دوران) موصى به - history يبقى مرئيًا لكن غير صالح |
| 10.4 | XLSX / PDF export | غير متاحين - الرد الصريح `unavailable` أفضل من التزييف |
| 10.5 | استعادة كلمة المرور / MFA | **لا** - قرار أمني صحيح، ويجب توثيقه بوضوح |

---

## 🔴 قائمة الكتل الحالية

| # | البلocker | يحجب |
|---|---|---|
| B1 | بيانات النشر غير متوفرة `[REDACTED]` | 6.x بالكامل |
| B2 | PHP host لا يستجيب (`rc=56`/`rc=52`) | 6.2، 6.4، 6.5، 6.7، 7.x |
| B3 | `restore/execute` لم يُختبر عبر HTTP على production | إغلاق B7 |
| B4 | حارس Apache web-root تحقّق بنيوي فقط | 6.5 |
| B5 | متغيرات Vercel تحتاج إعادة بناء | 6.9، والواجهة على production |
| B6 | جلسات قديمة تحتاج إبطال | 7.4 |
| B7 | الـPWA لم يُتحقَّق منه في production | 9.5، 9.6 |
| B8 | لا اختبارات frontend ولا CI | 4.x |
| B9 | Canonical ZIP قديم | 6.4 |

---

## 📊 خريطة التبعيات

```
0 (خط الأساس)
   │
   ├─► 1 (14 جدول) ──► 4 (اختبارات + CI)
   │                      │
   ├─► 5 (أخطاء) ─────────┤
   │                      │
   └─► 6 (نشر) ◄──────────┘
          │
          ├─► 2 (أداء)
          ├─► 3 (ربط PHP)
          ├─► 7 (مصفوفة أدوار)
          ├─► 8 (استغلال)
          │        │
          └────────┴──► 9 (UX + PWA) ──► 10 (توثيق) ──► READY
```

**لماذا 6 قبل 7 و 8 و 9؟** لأن كل واحد منها يحتاج خادمًا حقيقيًا. التحقق المحلي للمصادقة والاستغلال موجود بالفعل، لكنه لا يثبت شيئًا عن Apache و SSL و CORS.

---

## ⏱️ الجدول الزمني

| المرحلة | المدة | الموازي |
|---|---|---|
| 0 - خط الأساس | يوم | - |
| 1 - 14 جدول | 3 أيام | - |
| 5 - أخطاء | يومان | مع 1 |
| 4 - اختبارات + CI | 3 أيام | بعد 1 |
| 6 - نشر | أسبوع | يحتاج B1 + B2 |
| 2 - أداء | يومان | بعد 6 |
| 3 - ربط PHP | أسبوع | بعد 6 |
| 7 - مصفوفة أدوار | 3 أيام | بعد 6 |
| 8 - استغلال | يومان | بعد 6 |
| 9 - UX + PWA | 5 أيام | بعد 6 |
| 10 - توثيق | يومان | آخر |

**إجمالي ressource الطريقتين:** 26 يوم عمل.
**مع الكتل (B1/B2):** غير محدد - يعتمد على صاحب المشروع.

---

## ✅ بوابة READY النهائية

لا يُكتب `READY` إلا تحقق **كل** بند:

- [ ] خط الأساس مثبَّت
- [ ] كل كتابة في الواجهة إما تنجح أو تُظهر رسالة - صفر صمت
- [ ] كل الـ14 جدول لها قرار موثَّق
- [ ] CI خضراء على كل PR
- [ ] PHP host يرد 200 على `/health` + SSL صالح
- [ ] تسجيل دخول حقيقي على production ناجح
- [ ] `restore/execute` ناجح عبر HTTP على production
- [ ] حجب cross-group مُثبَت على الخادم (لا UI فقط)
- [ ] كل سيناريو استغلال رُفض على production داخل rollback
- [ ] PWA مُتحقَّق منه (Service Worker + offline + installability)
- [ ] Lighthouse ≥ 90 على الصفحات الرئيسية
- [ ] `runbook` + `rollback` مُختبَرَين فعليًا
- [ ] لا أسرار في git أو ZIP أو التقارير

**حتى ذلك الحين: `NOT READY`.**

---

## ملحق - نتائج الفحص الفعلي

### ما هو مُتحقَّق خاطئ شائعًا

| الادعاء | الواقع المُقاس |
|---|---|
| “الـPHP API متكامل ومربوط” | 13 route، **صفر** استدعاء من الواجهة |
| “كل الجداول محمية” | 50/50 RLS ✅، لكن الكتابة بـ**3** insert فقط |
| “الواجهة جاهزة” | 0 اختبارات، 0 CI، 8/12 صفحة تكتب بصمت |
| “كل الروابط تعمل” | PHP `rc=56` - لا يستجيب |
| “فريق جاهز للإنتاج” | لا يوجد deployment runbook مُختبَر |

### تحقّقات منفَّذة أثناء كتابة هذه الخطة

```
tsc --noEmit      exit 0
next lint         exit 0  (warnings فقط - stale closures في useEffect)
next build        exit 0  (22 صفحة)
Supabase          50 tables · 50 RLS · 90 policies · 0 بلا policy
Escalation test   admin→super_user = denied:23505 ✅ لا ثغرة
session_repl      anon/authenticated/service_role = 42501 ✅
```

### قرارات معمارية مسجَّلة

- تصدير منطقي JSONB بدل `pg_dump` (الاستضافة المشتركة لا تملك `pg_dump`)
- `SECURITY INVOKER` للتصدير · `SECURITY DEFINER` للاستعادة
- كلاهما `service_role` فقط
- استرجاع `all-or-nothing` داخل transaction واحدة
- لا استعادة لكلمة المرور أو MFA
- لا custom GUC لتجاوز الـtriggers - **`session_replication_role`** حصرًا داخل `SECURITY DEFINER`
- إخفاء عناصر UI ليس أمانًا - الإجبار يجب أن يكون في route/RPC/RLS/API/storage

---

## 🔴 تصحيح مُلزم - بعد مراجعة `/admin/backups` و `/admin/imports`

> **هذا التصحيح يلغي استنتاجات أعلاه ويغلب عليها.** أُضيف بعد قراءة الكود سطرًا سطرًا.

### الاستنتاج الخاطئ الذي تم إبطاله

كتبت في المرحلة 1:
> «الـPHP API (13 route) منها backup / restore / export / import - كله بلا واجهة استخدام»

**غير صحيح.** `/admin/backups` فيه UI كامل لـ backup + restore + AES-256 + `DATABASE_ONLY` / `FILES_ONLY`.

**الاستنتاج الصحيح:** الواجهة **لا تستدعي الـPHP API إطلاقًا** (صفر `fetch` لـ HTTP) - لكن ليس لأن الق functionalities غير موجودة، بل لأن **الأزرار نفسها وهمية بالكامل**.

### 🔴 الاكتشاف الأخطر: واجهة احتياطي/استعادة مُزيّفة بالكامل

**الملف:** `frontend/src/app/admin/backups/page.tsx` - 583 سطر

#### `handleCreateBackup` (L104-146)

```js
const dummyChecksum = Array.from({length:64}, () => Math.random()...);   // L111 checksum وهمي
file_size_bytes: 1048576 * 2.5,                                         // L117 حجم ثابت مزروع
status: 'COMPLETED',                                                    // L120 "مكتمل" قبل أي عمل
```

ولا `fetch`، ولا `Blob`، ولا `crypto`، ولا `JSZip`، ولا اتصال بـPHP API.

**النتيجة:** زر يقول **«تم إنشاء النسخة الاحتياطية المشفرة بنجاح»** - ولم يُنشأ ملف.

#### `handleRestoreBackup` (L176-216) - الأخطر من النوعين

```js
await supabase.rpc('log_operational_event', {... p_status: 'SUCCESS' ...});  // L189
await supabase.rpc('log_operational_event', {... p_status: 'SUCCESS' ...});  // L199
setOperationMsg({ type:'success', text:'تمت استعادة النظام بنجاح' });        // L208
```

**لا يقرأ ملفاً. لا يفكّ تشفير. لا يغيّر الـDB. لا يتحقق من كلمة المرور** (اكتفى بـ`if (!restorePassword) return` - فحص وجود لا صحة).

الاستعادة الوحيدة الحقيقية في المشروع هي `DatabaseRestoreService.php` في الـPHP API - **ولا شيء في الواجهة يصل إليها.**

**تقييم الخطورة:** هذا ليس ثغرة أمنية، بل **نزاهة نظام**. أسوأ من الفشل الصامت: النظام **يقول إنه نجح** ويكتب سجل نجاح في الـaudit log. الـadmin يستعيد ثقته في نسخه الاحتياطية وهي غير موجودة أصلاً.

#### مُتحقَّق منه على production

```sql
-- backup_records insert كـ admin
→ denied:42703   (لا grant أصلاً - أضيق من RLS)
```

الزر يفشل عند الـDB - لكن `catch` يعرض رسالة، فالسلوك هنا **مقبول نسبياً**؛ المشكلة الأساسية هي الوهم في المسار الناجح المزروع.

### 🔴 تصحيح ثانٍ: `handleDeleteBackup` (L148-174)

```js
.from('backup_records').update({ deleted_at: ... })   // soft delete في الواجهة
```

تحقق: لا `DELETE` policy على `backup_records` (2 delete policies فقط في المشروع كله). إذاً الحذف **فاشل أيضاً** - لكن الرسالة تُظهر نجاحاً؟ لا، `throw error` يعمل. السلوك هنا سليم، فقط الميزة معطّلة.

### 🔴 اكتشاف ثالث: Excel export يكذب باسم الملف

**الملف:** `/admin/imports/page.tsx` L231

```js
link.setAttribute('download', `trainees_export_${Date.now()}.${format === 'csv' ? 'csv' : 'csv'}`);
```

`format === 'csv' ? 'csv' : 'csv'` - الطرفان نفس القيمة. لو اختار المستخدم **Excel** ينزّل ملف **CSV**.

### ✅ ما هو سليم فعلاً (تصحيح مُكمِّل)

| المكوّن | الحكم |
|---|---|
| `handleExecuteImport` (L143-190) | **حقيقي بالكامل** - `rpc('import_trainees_bulk_atomic')`، dry-run، All-or-Nothing، error handling صحيح |
| `handleExportTrainees` (L195-236) | **حقيقي** - قراءة `profiles` + CSV + audit |
| Auth guard في الواجهة | **سليم** - `['admin','super_user']` وغيرهم مرفوض |
| `backup_records` / `import_history` قراءة | **سليم** - قراءة السجل فقط |

### 📌 التحديث الإجباري للمرحلة 1

المرحلة 1 تُرقَّم إلى **المرحلة 1A** (سياسات الكتابة) وتُضاف إليها:

#### 🔴 المرحلة 1B - إزالة واجهة التزييف (أعلى أولوية في المشروع)

| # | المهمة | المعيار |
|---|---|---|
| 1B.1 | **نشر تحذير فوري** في الواجهة: `/admin/backups` غير صالح للإنتاج | رسالة صريحة أعلى الصفحة |
| 1B.2 | حذف أو تعطيل `handleCreateBackup` و `handleRestoreBackup` | لا زر يدّعي نجاحًا بدون عمل |
| 1B.3 | استبدالها باستدعاء **حقيقي** لـ`POST /backup/create` و `POST /restore/execute` | رسالة نجاح **فقط** بعد `200` حقيقي |
| 1B.4 | ربط `PHP_API_URL` (المعرّف حاليًا وغير المستخدم) بالواجهة | استدعاء فعلي مثبت |
| 1B.5 | حذف `dummyChecksum` و `file_size_bytes` المزروعين | لا قيمة وهمية في الكود |
| 1B.6 | إصلاح اسم ملف Excel → إما دعم حقيقي أو **إخفاء الزر** | لا يكذب الاسم |
| 1B.7 | فحص **كل** زر في المشروع بحثًا عن نفس النمط | جدول `زر → هل يعمل فعلاً؟` |

> **قاعدة جديدة تُضاف:** لا يُكتب `تم` ولا `نجاح` في الكود إلا بعد **استجابة حقيقية مؤكدة**. كل زر في النظام يجب أن يكون له **مصدر حقيقة واحد** - إما `fetch` حقيقي، أو `RPC` يعيد `success:true` بعد تنفيذ فعلي.

### 🔴 B10 - بلocker جديد

| # | البلocker | يحجب |
|---|---|---|
| **B10** | **واجهة backup/restore وهمية بالكامل** | كل ثقة العميل في النسخ الاحتياطي · المرحلة 9 كليًا |

**حالة المشروع بعد هذا الاكتشاف:** `NOT READY` - وبأسباب **أنثق** من السابق.

---

## 🔴 تصحيح ثانٍ مُلزم - استنتاج الـ14 جدول كان خاطئاً

> **هذا يصحّح ما ورد في المرحلة 1A.** أُضيف بعد اختبار فعلي على production، لا بعد قراءة الكود فقط.

### ما قلته قبلاً (خطأ)

> «14 جدول عليها عمليات كتابة من المتصفح ومفيش ولا policy للكتابة فيها»

### لماذا كان خطأ

الاستعلام الذي أنتج هذا الرقم كان:

```sql
WHERE cmd IN ('INSERT','UPDATE','DELETE')   -- ❌
```

PostgreSQL يسجّل policy شاملة واحدة كـ`cmd = 'ALL'`، **لا** كثلاث policies منفصلة. فاستعلامي عدّ `ALL` على أنها "لا سياسة".

### الحقيقة المُتحقَّق منها

**كل الـ14 جدول لديه سياسة كتابة.** الاستعلام الصحيح:

```sql
SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies
WHERE schemaname='public';
```

يعطي **26 policy** على الـ14 جدول - معظمها `cmd='ALL'` مع `qual` مقيّد بالدور.

| الجدول | السياسة | الشرط |
|---|---|---|
| `backup_records` | Admin manage backup_records | `is_admin_or_super_user()` |
| `import_history` | Admin manage import_history | `is_admin_or_super_user()` |
| `servant_permissions` | Manage servant permissions | `is_admin_or_super_user()` + `with_check` |
| `group_secretariat` | Admin manage secretariat assignments | `is_admin_or_super_user()` + `with_check` |
| `user_favorites` | Manage favorites | `user_id = auth.uid()` |
| `daily_verses` | Authenticated read daily verses | **`SELECT` فقط - read-only عمداً** |
| `marathon_answers` | Manage marathon answers | `has_servant_permission('MANAGE_MARATHON')` |
| `marathon_questions` | Manage marathon questions | نفس الشرط |
| `marathon_sections` | Manage marathon sections | نفس الشرط |
| `gallery_items` | Manage gallery items | admin أو servant/secretariat في نفس المجموعة |
| `mp3_tracks` | Manage mp3 tracks | admin أو servant/secretariat في نفس المجموعة |
| `exam_grades` | Servant with GRADE_EXAMS manage grades | `has_servant_permission('GRADE_EXAMS')` + نفس المجموعة |
| `attendance_records` | Secretariat record attendance | `is_secretariat_of_group()` |
| `post_images` | Manage post images | صاحب المنشور أو admin |

### اختبار فعلي على production (داخل `BEGIN … ROLLBACK`)

| السيناريو | النتيجة |
|---|---|
| admin يكتب `user_favorites` (له) | **مسموح** (قيد `42804` على item_type، مش RLS) |
| admin يكتب `servant_permissions` | **مسموح** (قيد `23505` تكرار، مش RLS) |
| admin يكتب `daily_verses` | **مرفوض `42501`** - تصميمي: read-only |
| servant يكتب `daily_verses` | **مرفوض `42501`** |
| **servant يكتب صلاحية مستخدم آخر** | **مرفوض `42501`** ✅ |

**التصعيد مسدود. الـRLS يعمل.**

### 📌 التعديل على المرحلة 1A

المرحلة 1A تُلغى كـ"إضافة سياسات". تُستبدل بـ:

#### المرحلة 1A (مُعدَّلة) - تحسين رسائل الخطأ فقط

| # | المهمة | المعيار |
|---|---|---|
| 1A.1 | تحويل `42501`/`42804`/`23505` لرسائل عربية مفهومة | المستخدم يفهم السبب |
| 1A.2 | توضيح `daily_verses` كـread-only في الواجهة | لا زر إضافة لآية إن كانت معطلة |
| 1A.3 | إضافة `.catch` للكتابات المتبقية | صفر صمت |

### الخطأ الجوهري اللي أنا السبب فيه

قعدت أستنتج من **استعلام catalog غلط** بدل ما أقرأ الأسماء الحقيقية للسياسات، وقلت للـuser "14 جدول بلا سياسة" وأنا مبنياً على رقم واحد مش متحقق منه. **الاختبار الفعلي هو اللي صحّح كلامي، مش القراءة بتاعتي.**

> **قاعدة جديدة:** أي رقم عن حالة نظام يُنشر بعد تنفيذه مرة واحدة على production، لا من استعلام catalog فقط.

---

## B11 - 2026-10-02: production host is DOWN, and the PHP backend is verified sound

### The blocker found

`https://elkaroozschool.is-best.net` accepts TCP on 80 and 443 but returns no HTTP
response at all. Not a slow site, not a build error - the socket opens and closes.

```
curl https://elkaroozschool.is-best.net/login
  -> schannel: remote party requests renegotiation   (x2)
  -> server closed abruptly (missing close_notify)
  -> exit 56

curl http://elkaroozschool.is-best.net/login
  -> Empty reply from server
```

DNS is fine: `elkaroozschool.is-best.net -> 185.27.134.59` (confirmed via 8.8.8.8; the
local resolver refuses queries, which is a local network setting, not a site fault).

The certificate itself is valid and correctly scoped:

```
subject = CN=is-best.net
issuer  = ZeroSSL ECC DV SSL CA 2
SAN     = DNS:is-best.net, DNS:*.is-best.net
valid   = 2026-09-02 .. 2026-12-01
```

`*.is-best.net` does cover `elkaroozschool.is-best.net`, and the dates are current. So
this is not an expired or mismatched certificate. The renegotiation loop is a hosting
or server-config fault, and it cannot be fixed from the repository.

**This blocks phase 2 and phase 6.** No real performance number can be measured and no
end-to-end role test can run against a host that does not answer.

### What WAS verified: the PHP backend is sound

Run locally under PHP 8.3.35, because the code can be checked independently of the host.

| Check | Result |
|---|---|
| Syntax check, all non-vendor PHP files | 31/31 pass |
| `GET /health` | 200, reports v2.0.0, php 8.3.35 |
| `GET /api/health` (base-prefix strip) | 200 |
| Unknown route | 404 `ROUTE_NOT_FOUND` |
| CORS preflight from the production origin | 204, allows the headers the app sends |
| Protected route, no token | 401 `UNAUTHORIZED` |
| Protected route, `Basic` header | 401 |
| Protected route, forged HS256 token | 401 `INVALID_TOKEN` |
| Protected route, garbage token | 401 `INVALID_TOKEN` |

The forged-token result is the important one. `JwtAuthMiddleware` once fell back to
unverified decoding, which would have let a caller hand itself the role `super_user`.
That branch now fails closed, and the test above confirms it: a self-crafted token
claiming `role: super_user` is rejected, not honoured.

Config also fails closed. `config/supabase.php` requires all four env vars and aborts
with `CONFIG_MISSING` rather than defaulting to a guessable JWT secret, so a
misconfigured host cannot silently boot with auth switched off. No secret is committed
to the repository.

### Unpushed work

6 commits are local only. `origin/main` is behind. They are not on any live site, and
the site that is configured as production is not serving, so there is nothing to deploy
to until the host is fixed.
