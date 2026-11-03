# مدرسة الكاروز — EL KAROOZ SCHOOL

منصة تعليمية وإدارية ومجتمعية عربية (RTL) لمدرسة الكاروز للكتاب المقدس (الإصدار `1.0.1`).

## توثيق المشروع والمراجعة الشاملة

- **المرجع المعماري والتنفيذي الشامل:** [مرجع المشروع الشامل](docs/PROJECT_DOCUMENTATION.md) — يوثق المعمارية الفعليّة، المسارات الـ 30 في الواجهة، المسارات الـ 23 في PHP API، ملفات الهجرة الـ 49 في Supabase، مصفوفة الصلاحيات، والاختبارات.
- **تقرير المراجعة الشاملة والتدقيق الأمني والمنطقي (محدّث في 2026-10-31):** [تقرير المراجعة الشاملة](REVIEW_REPORT.md) — يوثق نتائج الفحص التفصيلي لطبقات المشروع الخمس (Backend PHP، صفحات Next.js، مكتبات ومكونات الواجهة، قاعدة البيانات وسياسات RLS والسكربتات، وتدقيق الوثائق).

## البنية التقنية

- **الواجهة الأمامية (`frontend/`):** Next.js 14.2.35 (App Router)، React 18.3.1، TypeScript 5.7.3، Tailwind CSS، React Query، DOMPurify، ExcelJS (27 صفحة + 3 مسارات API).
- **الهوية والبيانات والوقت الحقيقي (`supabase/`):** Supabase Auth، PostgreSQL، سياسات عزل الصفوف (RLS)، الدوال الذرية (RPCs)، وRealtime (49 ملف هجرة SQL محلي).
- **الخادم الخلفي (`backend-api/`):** بوابة PHP 8.2+ منفصلة للعمليات الحساسة (النسخ الاحتياطي المشفر، الاستعادة الذرية، الاستيراد/التصدير، جسر تخزين الملفات المحلي وGoogle Drive، موسوعة الكتاب المقدس، وإعادة ضبط النظام الآمنة عبر 23 مساراً).

## الأوامر الأساسية

من جذر المشروع:

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run verify
```

لتشغيل اختبارات الوحدة والتكامل في الواجهة الأمامية (`23` ملف اختبار — `219` اختباراً):

```bash
cd frontend
npm test
```

## الأدلة المرجعية المعتمدة

- **مرجع واجهات البرمجة:** [API Reference](docs/API.md)
- **سياسات وضوابط الأمان:** [Security Policies](docs/SECURITY.md)
- **مصفوفة صلاحيات المسارات والأدوار:** [Route Permission Matrix](docs/FINAL_ROUTE_PERMISSION_MATRIX.md)
- **نظام الثيمات والهوية البصرية:** [Theme System](docs/THEME_SYSTEM.md)
- **مواصفات متطلبات النظام:** [SRS](docs/SRS_ELKAROOZ_SCHOOL.md)
- **دليل التطوير المحلي:** [Local Development Guide](docs/LOCAL_DEVELOPMENT_GUIDE.md)
- **دليل النشر على بيئة الإنتاج:** [Production Deployment](docs/PRODUCTION_DEPLOYMENT.md)
- **خطة نقل الملفات إلى Google Drive:** [Google Drive Storage Plan](docs/GOOGLE_DRIVE_STORAGE_PLAN.md) | [Phase 0 Audit](docs/GOOGLE_DRIVE_PHASE0_AUDIT.md)
- **خطة ونطاق إعادة ضبط النظام الآمنة:** [SAFE_SYSTEM_RESET_PLAN](docs/SAFE_SYSTEM_RESET_PLAN.md)
- **خطة استكمال الأداء وقياسه:** [COMPLETION_PLAN — المرحلة 2](docs/COMPLETION_PLAN.md#-المرحلة-2---قياس-الأداء-الحقيقي)

> **تنبيه مرجعي:** قد تحتوي بعض تقارير المراحل التاريخية (`PHASE_*` و`FINAL_*`) على إحصاءات أو حالات تعود لتاريخ كتابتها؛ المرجع المعتمد للحالة الراهنة هو [مرجع المشروع الشامل](docs/PROJECT_DOCUMENTATION.md) و[تقرير المراجعة الشاملة](REVIEW_REPORT.md).
