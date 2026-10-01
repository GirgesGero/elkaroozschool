# خطة إكمال مشروع مدرسة الكاروز — 10 مراحل

> **الحالة الحالية:** `NOT READY`
> **تاريخ الفحص:** 2026-10-01 · SHA `6519986` · branch `main`
> **نوع الخطة:** تنفيذية، مبنية على فحص الكود والـDB الفعلي — لا على تقارير سابقة.

---

## كيف تُقرأ هذه الخطة

كل مرحلة لها:
- **الهدف** — سطر واحد
- **المهام** — أرقام، كل واحدة قابلة للتحقق بمعيار صريح
- **معيار القبول** — لا يُعتبر "تم" إلا بنتيجة أمر حقيقي
- **التبعية** — ماذا يجب أن يُنجز قبلها

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

## 🔴 المرحلة 0 — تثبيت خط الأساس

**الهدف:** تجميد الحالة الفعلية في git، حتى لا تتغير الأرقام تحت المراحل التالية.

| # | المهمة | المعيار |
|---|---|---|
| 0.1 | كتابة `docs/BASELINE_2026_10_01.md` بكل الأرقام أعلاه | الملف موجود ومُراجَع |
| 0.2 | `git tag baseline-2026-10-01` | `git tag -l` يعرضه |
| 0.3 | تشغيل كل الـ12 سكربتات القائمة وتسجيل المخرجات في الملف | 12 نتيجة مُلصقة |
| 0.4 | `npx next build` نظيف + `tsc` نظيف | `exit 0` مثبت في الملف |

**التبعية:** لا شيء. هذه نقطة البداية.
**مخاطرة:** صفر — كل تغيير هنا توثيق فقط.

---

## 🔴 المرحلة 1 — الـ14 جدول بلا سياسة كتابة

**الهدف:** إغلاق أكبر فجوة منطقية في المشروع.

### التشخيص المُتحقَّق

الـfrontend ينفّذ **127 استعلام بيانات مباشرة** على Supabase بمفتاح `anon` — أي أن كل الصلاحيات متحقّنة في RLS، وهذا سليم.

لكن في المقابل، **14 جدول** تظهر فيها عمليات كتابة من المتصفح، و**مفيش ولا policy للكتابة** فيها:

```
attendance_records   exam_grades        marathon_answers    marathon_questions
marathon_sections    mp3_tracks          gallery_items        post_images
daily_verses         user_favorites      servant_permissions  group_secretariat
backup_records       import_history
```

**النتيجة العملية:** إما أن الكتابة ترفض في الـDB، أو تمر عبر RPC. في الحالتين الـfrontend لا يعرض للمستخدم أي تفسير.

### الفحص الثاني — الصمت في الواجهة

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
- كل كتابة من المتصفح: إمّا تنجح، أو المستخدم يرى رسالة واضحة — **صفر صمت**
- كل migration مُختبَرة في transaction بـ`ROLLBACK` أولًا
- `next build` + `tsc` نظيفان بعد التعديل

**ملاحظة تصميمية:** لا تُكتب policy بـ`USING (true)`. أي write policy لازم يكون لها `USING` للقراءة و`WITH CHECK` للكتابة، ومربوطة بالدور والمجموعة.

---

## 🔴 المرحلة 2 — قياس الأداء الحقيقي

**الهدف:** تحويل «لا أعرف إن كان بطيئًا» إلى أرقام.

أرقام `next build` الحالية:

```
/trainees          5.13 kB · 181 kB first load
/attendance            —    · 181 kB
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

## 🟠 المرحلة 3 — ربط الـPHP API بالواجهة

**الهدف:** سدّ فجوة معمارية قائمة فعلاً.

**المُتحقَّق:** `NEXT_PUBLIC_PHP_API_URL` معرّف في `frontend/.env.local`، **ولا يوجد ولا استدعاء واحد** في `frontend/src` — تم بحث كل `fetch()` ذات مسار مطلق، فالنتيجة صفر.

**النتيجة:** الـPHP API (13 route) منها backup / restore / export / import / storage — كله بلا واجهة استخدام.

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

## 🟠 المرحلة 4 — اختبارات و CI للواجهة

**الهدف:** منع انحدار الجودة — currently صفر اختبارات وصفر CI.

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

## 🟡 المرحلة 5 — معالجة الأخطاء والتصلّب المتبقية

من `REMEDIATION_PLAN.md` مرحلة 7 — حالة التحقق الفعلية:

| # | المهمة | الحالة |
|---|---|---|
| 5.1 | وقف تسريب `$e->getMessage()` في `public/index.php` → `error_log` + رسالة عامة | ❌ **مازال مطبَّقًا** |
| 5.2 | `public/.user.ini` بـ`display_errors=Off; log_errors=On` | ❌ **الملف غير موجود** |
| 5.3 | `flock()` يغطي read-modify-write كاملًا في rate limiter | ❌ لم يُنفَّذ |
| 5.4 | تنشيط `RateLimitMiddleware` (حاليًا **صفر call sites**) | ❌ لم يُنفَّذ |
| 5.5 | `filter_var` على `X-Forwarded-For` في `AuditLogService.php` | ❌ لم يُنفَّذ |
| 5.6 | `.limit()` للصفحات الأثقل | ❌ لم يُنفَّذ |

> **تحذير مُلزم:** 5.3 **قبل** 5.4. الـ`LOCK_EX` الحالي على الكتابة فقط، فالقرار يُتخذ **قبل** القفل. تفعيله بدون 5.3 = حماية وهمية (تُعدّ أقل من الحقيقة تحت الضغط).

---

## 🔵 المرحلة 6 — النشر والاختبار على الخادم الحقيقي

**الهدف:** تحوّل كل التحقق المحلي إلى تحقق على production.

**البلocker:** لا توجد بيانات نشر محفوظة محليًا — `[REDACTED]`

| # | المهمة | المعيار |
|---|---|---|
| 6.1 | توفير بيانات النشر (SFTP/FTP + Vercel token) | بيانات صالحة في `.env` (لا في git) |
| 6.2 | حل تعطّل PHP host (`rc=56` / `rc=52`) | `curl -I` يعيد 200 على `/health` |
| 6.3 | تفعيل SSL صحيح | شهادة صالحة، بلا تحذير |
| 6.4 | رفع حزمة `public_html.zip` | `/health` يرد فعليًا |
| 6.5 | **اختبار حرّاس web-root على Apache حقيقي** | `config/.htaccess` etc. ترد 403 فعليًا — لا تحقق بنيوي فقط |
| 6.6 | تسجيل دخول حقيقي على الخادم المنشور | استجابة `200` + `role` صحيح |
| 6.7 | `POST /restore/execute` من production | round-trip ناجح عبر HTTP، لا عبر SQL مباشر |
| 6.8 | ضبط CORS بين `elkaroozschool-seven.vercel.app` والـPHP | طلب حقيقي ينجح |
| 6.9 | إعادة بناء Vercel بمتغيرات البيئة | vars على **كل** البيئات، لا Production فقط |

> **قاعدة لا تُكسر:** نجاح اختبار SQL على production **ليس بديلاً** عن اختبار PHP/Apache/Auth المنشور. كل بند من بنود B7 المفتوحة يُغلق بطلب HTTP حقيقي فقط.

---

## 🔵 المرحلة 7 — مصفوفة أدوار على production

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

## 🔵 المرحلة 8 — اختبارات الاستغلال (-rollback only)

**الهدف:** إعادة تشغيل كل استغلال مكتشف سابقًا، على production، داخل معاملة قابلة للتراجع.

| # | السيناريو | المعيار |
|---|---|---|
| 8.1 | ANON يقرأ PII عبر `get_trainee_full_profile` | `42501` |
| 8.2 | ANON يقرأ PII عبر `get_trainee_attendance_summary` | `42501` |
| 8.3 | `anon`/`authenticated` يستدعيان RPCs التصدير | `42501` |
| 8.4 | `authenticated` يستدعي restore RPC بclaims super_user مزيفة | `42501` |
| 8.5 | تصعيد trainee → `super_user` | `42501` أو `23505` — **مفيش ثغرة** (مُتحقَّق) |
| 8.6 | تعديل `PASTORAL` من `super_user` | `403` (admin فقط) |
| 8.7 | traversal على رفع الملفات | `400` |
| 8.8 | ZIP bomb / archive bomb | رفض |
| 8.9 | حقن CSV formula | محايدة |
| 8.10 | `session_replication_role='replica'` من دور عام | `42501` (مُتحقَّق) |
| 8.11 | restore بأرشيف معدَّل الترقية | `23505` من `uq_single_super_user` (مُتحقَّق) |

> **كل اختبار ينفَّذ داخل `BEGIN ... ROLLBACK`.** التحقق يستخدم `SET LOCAL ROLE authenticated` + `request.jwt.claims` — **لا** `current_user = postgres` أبدًا.

---

## 🟠 المرحلة 9 — تجربة المستخدم والـPWA

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
| 8.9 | توحيد الأيقونات — **favicon ناقص** (مُتحقَّق) | أيقونة في كل route |
| 9.10 | تحسين preload لخط.display | لا CLS |

---

## 🔵 المرحلة 10 — الجاهزية والتوثيق

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
| 10.1 | الـfixtures في production (حسابين بـ`1111...` و`2222...`) | **لا تُحذف تلقائيًا** — يلزم قرار صريح من صاحب المشروع |
| 10.2 | الـsessions القديمة بعد metadata backfill | تحتاج revoke/refresh قسري |
| 10.3 | الأسرار في git history | الخيار A (دوران) موصى به — history يبقى مرئيًا لكن غير صالح |
| 10.4 | XLSX / PDF export | غير متاحين — الرد الصريح `unavailable` أفضل من التزييف |
| 10.5 | استعادة كلمة المرور / MFA | **لا** — قرار أمني صحيح، ويجب توثيقه بوضوح |

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
| 0 — خط الأساس | يوم | — |
| 1 — 14 جدول | 3 أيام | — |
| 5 — أخطاء | يومان | مع 1 |
| 4 — اختبارات + CI | 3 أيام | بعد 1 |
| 6 — نشر | أسبوع | يحتاج B1 + B2 |
| 2 — أداء | يومان | بعد 6 |
| 3 — ربط PHP | أسبوع | بعد 6 |
| 7 — مصفوفة أدوار | 3 أيام | بعد 6 |
| 8 — استغلال | يومان | بعد 6 |
| 9 — UX + PWA | 5 أيام | بعد 6 |
| 10 — توثيق | يومان | آخر |

**إجمالي ressource الطريقتين:** 26 يوم عمل.
**مع الكتل (B1/B2):** غير محدد — يعتمد على صاحب المشروع.

---

## ✅ بوابة READY النهائية

لا يُكتب `READY` إلا تحقق **كل** بند:

- [ ] خط الأساس مثبَّت
- [ ] كل كتابة في الواجهة إما تنجح أو تُظهر رسالة — صفر صمت
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

## ملحق — نتائج الفحص الفعلي

### ما هو مُتحقَّق خاطئ شائعًا

| الادعاء | الواقع المُقاس |
|---|---|
| “الـPHP API متكامل ومربوط” | 13 route، **صفر** استدعاء من الواجهة |
| “كل الجداول محمية” | 50/50 RLS ✅، لكن الكتابة بـ**3** insert فقط |
| “الواجهة جاهزة” | 0 اختبارات، 0 CI، 8/12 صفحة تكتب بصمت |
| “كل الروابط تعمل” | PHP `rc=56` — لا يستجيب |
| “فريق جاهز للإنتاج” | لا يوجد deployment runbook مُختبَر |

### تحقّقات منفَّذة أثناء كتابة هذه الخطة

```
tsc --noEmit      exit 0
next lint         exit 0  (warnings فقط — stale closures في useEffect)
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
- لا custom GUC لتجاوز الـtriggers — **`session_replication_role`** حصرًا داخل `SECURITY DEFINER`
- إخفاء عناصر UI ليس أمانًا — الإجبار يجب أن يكون في route/RPC/RLS/API/storage
