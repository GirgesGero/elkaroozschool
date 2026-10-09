# تصنيف البيئة والتحقق الميداني — Environment Classification

**تاريخ التحقق الميداني:** 4 أكتوبر 2026  
**المُدقق:** Hermes Agent  
**طريقة التحقق:** فحص الحزم المنشورة (Deployed Bundles) + استعلامات قراءة الكتالوج المباشرة (Read-Only Catalog Queries) + فحص مسارات HTTP الخارجية.

---

```text
Environment Classification
==========================

Supabase Project: kgqgnqjkrghvktymbimz (https://kgqgnqjkrghvktymbimz.supabase.co)
Classification: STAGING (بيئة اختبار وتجهيز متصلة بالواجهة التجريبية)
Evidence:
  1. تطابق كامل بين Supabase MCP URL و frontend/.env.local وحزم JavaScript المنشورة على Vercel.
  2. فحص بيانات قاعدة البيانات: 50 مستخدمًا فقط (جميعهم بأسماء اختبار نمطية مثل trainee_g2_*, servant_g3_*, admin_user, super_user).
  3. سجل التدقيق (Audit Logs): 47 حدثًا تخص عمليات اختبار (IMPORT_TRAINEES, PRE_RESTORE_SAFETY_BACKUP, RESTORE).
  4. انعدام النشاط الفعلي بعد 28 سبتمبر 2026 (جميع السجلات أُنشئت بين 26 و28 سبتمبر 2026).
  5. مراجع الوسائط (Media Metadata): أعداد محدودة ومطابقة لمجموعات بيانات الاختبار (5 كتب، 5 أبحاث، 8 مناهج، 5 مقاطع صوتية، 5 عناصر معرض، 10 صور منشورات).

Frontend Deployment:
  - URL: https://elkaroozschool-seven.vercel.app
  - Status: يعمل بنجاح (HTTP 200 على /login وكافة المسارات)
  - Compiled Target: https://kgqgnqjkrghvktymbimz.supabase.co

Backend Deployment:
  - Configured Example URL: https://elkaroozschool.is-best.net
  - Live Status: غير متاح للخدمة البرمجية (محجوب بصفحة التحدي الأمني aes.js الخاصة بالاستضافة المجانية ByetHost/InfinityFree)
  - Local API Engine: مكتمل في backend-api ومختبر بنسبة 100% (115/115 أمان، 9/9 بيئة، 11/11 إخفاء أخطاء)
  - Production Hostinger Host: غير مرفوع أو غير مفعل بعد

Database Status:
  - 50 جدولًا (جميعها مفعّل عليها RLS)
  - 69 إصدار migration في السجل الحي
  - 31 ملف migration محلي (28 تاريخي + 1 إصلاح مطبق + 2 مقترحات محلية)
  - لا توجد بيانات تشغيلية حقيقية للمستخدمين

Storage Status:
  - Local Storage: backend-api/storage/ يحتوي على .htaccess فقط
  - Google Drive: لم يبدأ ربط الخدمة أو نقل الملفات

Safe to Apply Changes: YES (تطبيق غير تدميري على بيئة Staging مع الالتزام بالمعايير)

Reason:
  قاعدة البيانات الحالية تمثل بيئة Staging/Testing مثبتة بالأدلة (بيانات اختبارية وسجل تدقيق تجريبي)،
  مما يسمح بتنفيذ واختبار مقترحات تقوية الدوال (RPC Hardening) ومصالحة الـ migrations والـ ACL
  داخل بيئة Staging دون المساس بأي بيانات مستخدمين حقيقيين، مع حظر أي أمر تدميري (Destructive SQL)
  وتوثيق كل تعديل قبل اعتماده للإنتاج.
```

---

## تفاصيل الأدلة الفنية المقاسة (Measured Technical Evidence)

### 1. فحص حزم Vercel المنشورة
- تم سحب حزم الـ JavaScript المنشورة فعليًا من النطاق المباشر `https://elkaroozschool-seven.vercel.app/login`.
- وُجد أن رابط Supabase المترجم داخل الحزم الحية هو حصريًا: `https://kgqgnqjkrghvktymbimz.supabase.co`.
- لا يوجد أي تضارب بين إعدادات الـ Local والـ Deployed Frontend والـ Supabase MCP.

### 2. فحص محتوى قاعدة البيانات (Read-Only Data Audit)
- **المستخدمون (auth.users / public.profiles):** إجمالي 50 حسابًا.
  - 39 متدربًا (Trainee) بأسماء نمطية: `trainee_g2_1` .. `trainee_g2_12`, `trainee_g3_1` .. `trainee_g3_12`, `trainee_g1`, `fady_1`, `mark_1`.
  - 5 خدام (Servant): `servant_g1`, `servant_g2_1`, `servant_g3_1`, `servant_g3_2`.
  - 4 سكرتارية (Secretariat): `sec_g1`, `sec_g2_1`, `sec_g3_1`.
  - 1 مسؤول عام: `admin_user`.
  - 1 مستخدم متميز: `super_user`.
  - 1 حساب معلق اختباري: `suspended_user`.
  - 2 حسابات فحص: `probe_g1`, `probe_g2`.
- **المنشورات والتفاعلات:** 45 منشورًا تجريبيًا أُنشئت بين 26 و28 سبتمبر 2026.
- **سجلات الحضور والامتحانات:** 80 سجل حضور اختباري، امتحان واحد مصحح، 18 إجابة ماراثون.
- **سجل العمليات (audit_logs):** 47 سجلًا تدريبيًا لعمليات الاستيراد واستعادة النسخ الاحتياطية المؤقتة.

### 3. فحص بوابة PHP الخارجية
- فحص الطلب لـ `https://elkaroozschool.is-best.net/health` يعيد رد HTTP 200 ولكنه يحتوي على سكريبت التحدي `aes.js`، مما يعني أنه سيرفر استضافة مجانية وليس بيئة Hostinger الإنتاجية المقصودة للمشروع.
- حزمة PHP وتعديلات الحماية معدة بالكامل محليًا وتنتظر قيام المالك برفعها إلى Hostinger الخاص به.

---

## التوجيهات التشغيلية للمرحلة الحالية

1. **التعامل مع البيئة كـ STAGING:**
   - يُسمح باستكمال التحقق من الـ migrations، ومصالحة الـ DDL، وتطبيق مقترح تحصين دوال الماراثون وسجل العمليات (`20261004202345_harden_marathon_and_audit_rpcs.sql`) بعد إثباته.
2. **الضوابط الصارمة:**
   - عدم استخدام أي أوامر تدميرية (`TRUNCATE` أو `DROP CASCADE` غير آمن).
   - توثيق كل تغيير يتم إجراؤه على Staging في ملف مستقل لتضمينه في خطة الـ Production Rollout اللاحقة.
