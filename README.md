# مدرسة الكاروز — EL KAROOZ SCHOOL

منصة تعليمية وإدارية ومجتمعية عربية لمدرسة الكاروز للكتاب المقدس.

## توثيق المشروع

ابدأ من [مرجع المشروع الشامل](docs/PROJECT_DOCUMENTATION.md)، وهو توثيق مبني على ملفات التنفيذ الحالية ويغطي المعمارية والصفحات وواجهات PHP وقاعدة البيانات والصلاحيات والاختبارات وحدود التحقق.

## التقنية

- الواجهة: Next.js 14، React، TypeScript، Tailwind CSS.
- الهوية والبيانات والوقت الحقيقي: Supabase Auth وPostgreSQL وRLS وRealtime.
- العمليات والملفات الحساسة: PHP API منفصل.

## أوامر أساسية

من جذر المشروع:

```bash
npm run dev
npm run build
npm run typecheck
npm run verify
```

اختبارات الواجهة من `frontend/`:

```bash
npm test
```

## أدلة أخرى

- المتطلبات: [SRS](docs/SRS_ELKAROOZ_SCHOOL.md)
- التطوير المحلي: [Local Development Guide](docs/LOCAL_DEVELOPMENT_GUIDE.md)
- النشر: [Production Deployment](docs/PRODUCTION_DEPLOYMENT.md)
- خطة نقل الملفات إلى Google Drive (المرحلة 0 قيد التنفيذ؛ لم يبدأ نقل الملفات أو تغيير كود التخزين): [Google Drive Storage Plan](docs/GOOGLE_DRIVE_STORAGE_PLAN.md)
- نتائج الفحص الحي للقراءة فقط وحالة مهام المرحلة 0: [Google Drive Phase 0 Audit](docs/GOOGLE_DRIVE_PHASE0_AUDIT.md)

> قد تحتوي تقارير المراحل والنشر القديمة على معلومات لا تطابق المصدر الحالي؛ راجع قسم «سجل الاختلاف بين الوثائق والمصدر» في مرجع المشروع الشامل.
"# elkaroozschool" 
