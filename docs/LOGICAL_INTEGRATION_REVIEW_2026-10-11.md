# مراجعة الترابطات والأخطاء المنطقية — 2026-10-11

## نطاق الفحص

تمت مراجعة:

- Next.js pages/components.
- Supabase migrations, RLS policies, RPCs, triggers.
- PHP Storage/Drive/Export services.
- Google Drive design docs.
- وثائق readiness القديمة والمتعارضة.
- المسارات الديناميكية الجديدة للمناهج والمرصد.

## نتائج تم إصلاحها في هذه الجولة

| المشكلة | الإصلاح |
|---|---|
| player يقرأ `marathon_answers.is_correct` مباشرة | استبدال القراءة بـ`get_marathon_questions_for_player` |
| أسئلة المرصد لا تملك lifecycle | إضافة `DRAFT/PUBLISHED/ARCHIVED` |
| تعديل السؤال قد يفسد submissions القديمة | revisions + archive/replace |
| قراءة الأسئلة غير معزولة حسب الفرقة | RLS وRPC مرتبطان بفرقة الماراثون والمستخدم |
| `anon` قادر على تنفيذ مسارات الإدارة الجديدة | revoke/حارس RPC |
| فشل Insert للاختيارات كان يُتجاهل في UI | فحص الخطأ وأرشفة السؤال الجزئي |
| زر إعادة الفتح يحمل وصفًا أوسع من سلوكه | تعديل النص إلى إعادة فتح السؤال الأول |
| صلاحيات السكرتارية كانت تعتمد على قراءة جدول مباشر من المتصفح | لوحة المناهج تستخدم `has_servant_permission` RPC وRLS يبقى الحارس النهائي |
| revisions للمناهج كانت قابلة للتحديث/الحذف بصلاحيات الجدول الموروثة | تقليص privileges إلى `SELECT, INSERT` |
| وثائق كثيرة تزعم `READY` رغم فجوات Google Drive/production | إنشاء `CURRENT_IMPLEMENTATION_STATUS.md` كمصدر حالة حالي |

## أخطاء منطقية لا تزال بحاجة إلى عمل لاحق

1. **واجهة استبدال سؤال كاملة:** قاعدة البيانات تدعم `replace_marathon_question`، لكن مدير الماراثون لا يعرض محررًا كاملًا لاستدعائها بعد.
2. **إعادة الفتح:** واجهة القائمة تعيد فتح السؤال الأول فقط لأن RPC القديم يأخذ `p_question_id`; يلزم اختيار السؤال المطلوب من كل محاولة.
3. **Google Drive:** `GoogleDriveService` موجود، لكن `StorageController` ما زال يكتب عبر `StorageBridgeService` المحلي؛ لا يجوز وصف upload العام بأنه Google Drive.
4. **التقارير:** `ExportController` ينزل/يرجع التقرير، لكنه لا يثبت حفظ نسخة على Drive داخل `media_assets`.
5. **مصدر الترم الثاني:** قاعدة المشروع الأصلية تذكر شرط إكمال الترم الأول، لكن لا يوجد في schema الحالي كيان موحد لحالة إكمال الطالب يمكن الاعتماد عليه. لا ينبغي إعادة تقديم قفل شكلي في UI دون حارس خادمي.
6. **التكرارات القديمة:** تم التطبيع بدون حذف. يجب أن يقرر المسؤول أي rows تُؤرشف بعد مراجعة المحتوى، لا أن يتم merge تلقائيًا.
7. **الاختبار الحي:** لا تكفي اختبارات `200/307` أو build؛ يلزم authenticated E2E لكل دور.

## قرار الحالة

```text
Local code:      Phase 1 + Phase 2 database safeguards implemented
Live database:   curriculum phase applied; observatory lifecycle/secure player applied
Google Drive:    partial infrastructure, not end-to-end upload verified
Reports to Drive: not verified
Production E2E:  not fully verified
Overall:         NOT READY for a claim of full system completion
```
