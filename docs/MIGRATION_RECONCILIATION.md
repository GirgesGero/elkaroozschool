# تقرير مصالحة Migrations — المحلي مقابل الحي

**آخر تحقق حي:** 4 أكتوبر 2026
**المصدر:** Supabase MCP (`list_migrations`) + استعلام SQL للقراءة فقط + ملفات `supabase/migrations/`

> **تأكيد الهوية (4 أكتوبر 2026):** بعد تزويد المالك بالمضيف المقصود، طابق host الذي أعاده `get_project_url` مع `frontend/.env.local` ومع المضيف الذي أكده المالك. أُعيد فحص ledger وكتالوج المشروع للقراءة فقط. تصنيف البيئة staging أم production ما زال غير محسوم؛ لا تُجرَ أي كتابة أو probe مؤقت قبل حسمه.

**DDL snapshot:** `supabase/schema_live_snapshot.sql` موجود، لكن اكتماله كمصدر لإعادة إنشاء schema غير مثبت.

---

## الخلاصة

| الفئة | العدد | التفاصيل |
|-------|-------|----------|
| Local SQL files | 32 | 28 تاريخية + migration إصلاح Phase 0 + `media_assets` + RPC hardening + ACL hardening |
| Live migration rows | 72 | 72 إصدارًا مسجلًا على Staging |
| تطابق إصدار + اسم منطقي | 12 | 12 مطابقة تامة للاسم والإصدار |
| الاسم المنطقي نفسه بإصدار مختلف | 20 | 16 migration أساسية + 4 اختلافات timestamp |
| Live بلا اسم منطقي محلي مقابل | 40 | غير ممثلة محليًا بالاسم المنطقي ومحفوظ الـSQL الكامل لها في الـledger |
| Local-only تاريخي | 0 | كل الملفات التاريخية الـ28 لها مقابل اسمي حي |
| Local-only proposals | 0 | تم تطبيق كافة المقترحات بنجاح على Staging |
| Phase 0 remediation | 1 | `20261004141649_phase0_post_image_and_reactor_visibility.sql` موجودة في ledger المشروع المطابق؛ بيئة الهدف staging/production غير محسومة |
| Statements محفوظة في ledger الحي | 61/69 | 61 سجلًا تحوي SQL statements؛ 8 سجلات NULL لها ملفات محلية مطابقة إصدارًا/اسمًا، لكن المحتوى غير متحقق |

**مقارنة محتوى أُنجزت في 4 أكتوبر 2026:** قورنت statements الحية للـ`phase0_post_image_and_reactor_visibility` (20261004141649) على MCP target مع الملف المحلي؛ أوامر SQL متطابقة دلاليًا، والاختلاف الظاهر في التعليقات فقط. هذا يثبت محتوى migration المحددة على ذلك الهدف وحده، ولا يثبت تطابق بقية السجلات أو البيئة أو production.

**تصحيح التقرير السابق:** كانت أرقام `28 محلي / 38 live-only / unique=66 / local-only=0` غير متسقة. إعادة الفحص للقراءة فقط على المشروع الذي طابق المضيف أكدت 69 إصدارًا حيًا و31 ملفًا محليًا: 9 تطابقات إصدار/اسم، و20 اسمًا بإصدار مختلف، و40 سجلًا بلا اسم محلي مقابل، وproposal محليتين غير مطبقتين. ledger يحوي statements لـ61/69؛ ثمانية سجلات exact قديمة statements=NULL. migration `20261004141649` موجودة في ledger وقورنت دلاليًا مع ملفها المحلي؛ proposal `media_assets` وproposal hardening للـRPCs غير مطبقتين. تصنيف البيئة staging أم production غير محسوم. ملف `schema_live_snapshot.sql` ليس dump كاملًا أو قابلًا لإعادة التشغيل: يحتوي stubs لـ48 دالة SQL/PLpgSQL ولا يحفظ بعض تعبيرات السياسات؛ لا يغطي migrations الـ40 ولا يُعتمد كمرجع DDL. المقارنة الشاملة ما زالت مفتوحة.

---

## التطابق الفعلي (9)

هذه migrations متطابقة بالاسم والـversion:

| الاسم | Version |
|-------|---------|
| `backfill_app_metadata_from_profiles` | 20261001130000 |
| `drop_create_test_user` | 20261001140000 |
| `logical_export_rpcs` | 20261001160000 |
| `pastoral_template_admin_only` | 20260930200000 |
| `revoke_anon_execute_on_group_rpcs` | 20261001 |
| `revoke_public_execute_on_data_reading_rpcs` | 20261002 |
| `rpc_group_scope_guards` | 20260930150000 |
| `sync_profile_app_metadata` | 20261001150000 |
| `phase0_post_image_and_reactor_visibility` | 20261004141649 |

## الاسم المنطقي نفسه بإصدار مختلف (20)

الملفات المحلية `001_extensions.sql` إلى `016_seed_data.sql` تطابق أسماء migrations حية بعد إزالة البادئة الرقمية من الاسم الحي للمقارنة؛ لكن إصداراتها مختلفة. تضاف إليها أربعة ملفات timestamp موضحة أدناه. هذه مطابقة أسماء فقط، وليست إثباتًا لتطابق محتوى SQL.

| الاسم المنطقي | الملف المحلي | Live Version |
|---------------|-------------|-------------|
| extensions | `001_extensions.sql` | 20260926042302 |
| core_roles_groups | `002_core_roles_groups.sql` | 20260926042315 |
| profiles_auth_mapping | `003_profiles_auth_mapping.sql` | 20260926042328 |
| permissions_secretariat | `004_permissions_secretariat.sql` | 20260926042339 |
| academic_terms_lectures | `005_academic_terms_lectures.sql` | 20260926042352 |
| attendance | `006_attendance.sql` | 20260926042434 |
| exams_grades | `007_exams_grades.sql` | 20260926042447 |
| marathons | `008_marathons.sql` | 20260926042500 |
| feed_social | `009_feed_social.sql` | 20260926042514 |
| notifications_verses | `010_notifications_verses.sql` | 20260926042525 |
| library_media | `011_library_media.sql` | 20260926042537 |
| bible_local | `012_bible_local.sql` | 20260926042557 |
| audit_backup_import | `013_audit_backup_import.sql` | 20260926042609 |
| indexes_functions_triggers | `014_indexes_functions_triggers.sql` | 20260926042622 |
| rls_policies | `015_rls_policies.sql` | 20260926042639 |
| seed_data | `016_seed_data.sql` | 20260926042652 |

**ملاحظة أمنية:** بعض هذه الملفات المحلية (خاصة `015_rls_policies.sql`) تحتوي policies **مختلفة** عن الحي. لا تُطبق على قاعدة حية قبل المقارنة.

## Version Drift (4)

نفس الاسم المنطقي، timestamps مختلفة. تمت الآن مراجعة يدوية أولية لثلاث حالات (`fix_null_propagation_fail_open_authz`, `logical_restore_rpcs`, `revoke_anon_security_definer`) بالإضافة إلى `close_self_escalation` أدناه؛ لم يُنجز canonical diff كامل لأي منها، فلا تعتبر مطابقة SQL مثبتة.

| الاسم | Local Version | Live Version | الفارق |
|-------|-------------|-------------|---------|
| `close_self_escalation` | 20260930140000 | 20260930133048 | 2h local ahead |
| `fix_null_propagation_fail_open_authz` | 20261001120000 | 20261001112952 | 50min local ahead |
| `logical_restore_rpcs` | 20261001170000 | 20261001141907 | 2.8h local ahead |
| `revoke_anon_security_definer` | 20260930120000 | 20260930095254 | 2.4h local ahead |

**الحالة:** سبب اختلاف timestamps غير مثبت. يلزم مقارنة DDL/الدوال والسياسات قبل اعتماد أي ملف محلي أو تطبيقه.

**ملاحظات الفحص اليدوي الأولي للحالات الثلاث الأخرى (4 أكتوبر 2026):**
- `fix_null_propagation_fail_open_authz`: راجعت النصين؛ core authorization fix متوافق مبدئيًا (رفض anon، fail-closed عند غياب `auth.uid()`، وإبقاء authenticated)، لكن لم يُنتج normalized diff كامل.
- `revoke_anon_security_definer`: core revokes وdefault-privilege guard والتحقق النهائي متوافقة مبدئيًا؛ اختلافات التعليقات/رسالة الخطأ لا تثبت وحدها التطابق الكامل.
- `logical_restore_rpcs`: الملف المحلي يبني تحديث الصف الموجود عبر فرع `UPDATE` منفصل، بينما statement الحي يستخدم `INSERT ... ON CONFLICT`; هذا فرق تنفيذ ملموس لم يُحسم أثره دلاليًا. لا تعتمد الملف قبل مراجعة كاملة واختبار restore على staging.

**مثال تمت مقارنته من statements الحية:** ثلاثة سجلات `close_self_escalation` متتابعة (`20260930133048`, `20260930133128`, `20260930133150`). الأول يخزن `WITH CHECK` ذاتيًا في سياسة `profiles`; الثاني يركب trigger يقارن `NEW` بـ`OLD` ويعيد تعريف السياسة؛ والثالث يثبت `search_path` لدوال `SECURITY DEFINER` ويضيف سياسات لخمسة جداول. راجعت SQL لهذه السجلات مقابل `20260930140000_close_self_escalation.sql`: الملف المحلي يجمع core actions الثلاثة في ملف واحد، مع guard إضافي؛ محتوى SQL الأساسي متوافق بالمراجعة اليدوية وليس hash/byte-identical. هذا يوضح أن الـ40 غير المطابقة بالاسم ليست بالضرورة تغييرات غير موجودة محليًا. المقارنة تخص نصوص migration فقط ولا تثبت وحدها الحالة النهائية الحية أو صحة التطبيق.

## Live بلا مقابل محلي بالاسم المنطقي (40)

هذه السجلات لا يقابلها اسم migration محلي وفق المطابقة الموثقة أعلاه. لا يعني ذلك أن التغييرات حُصرت أو غُطيت في snapshot.

```text
20260926043106 017_seed_test_accounts
20260926043127 018_populate_test_accounts
20260926043551 019_fix_auth_identities
20260926043605 020_repopulate_test_accounts
20260926044034 021_fix_gotrue_users
20260926044425 022_set_default_auth_uid
20260926045131 023_academic_attendance_engine
20260926045146 024_attendance_thursday_lock
20260926045209 025_attendance_summary_rpc
20260926050041 026_marathon_engine_rpcs
20260926051133 027_marathon_sections_rls
20260926051334 028_marathon_timestamps
20260926051422 029_fix_servant_permissions_rls
20260926051844 030_feed_interactions_rpcs
20260926051916 032_fix_feed_rpcs
20260926052629 033_feed_content_columns
20260926052709 034_create_post_images_table
20260926060538 035_update_library_media_scope
20260926065541 036_bible_dictionary_and_rpcs
20260926070009 038_seed_all_bible_books
20260926070224 039_seed_bible_sources
20260926070408 037_seed_full_bible_chapters
20260926074253 040_backup_restore_import_engine
20260926075510 041_backup_restore_trainee_bulk_rpc
20260926080305 042_fix_bulk_import_rpc_and_audit_rls
20260926080852 043_fix_bulk_import_columns
20260926081155 044_fix_auth_identities_columns
20260926085926 045_notification_engine_rpcs
20260928134021 046_group_and_profile_rpcs
20260928134139 047_servants_drilldown_rpc
20260928134507 048_seed_full_groups_data
20260928142358 049_fix_trainee_full_profile_rpc
20260928144739 050_fix_exam_grades_column_rpc
20260928145220 051_fix_marathon_in_trainee_profile_rpc
20260928145324 052_fix_marathon_status_rpc
20260930133128 close_self_escalation_v2
20260930133150 close_self_escalation_stage2
20261001141945 logical_restore_rpcs_patch_update_existing
20261001142008 logical_restore_rpcs_patch_update_existing
20261001142024 logical_restore_rpcs_patch_update_existing
```

---

## القرار

**المصالحة غير مكتملة؛ لا ترفع أو تطبق migrations اعتمادًا على هذا التقرير وحده.**

1. الملفات التاريخية الـ28 لها مقابل اسمي في ledger؛ لم تتم مقارنة نص SQL لكل الملفات. migration التاسعة المطابقة موجودة في ledger المشروع المطابق؛ تصنيف البيئة staging/production غير محسوم.
2. statements متاحة لـ61/69 سجلًا؛ قارنها محليًا، واستخدم ملفات المصدر للثمانية القديمة التي statements فيها NULL. ثم طابق الناتج مع schema حي موثوق؛ أسماء ledger وحدها لا تثبت الحالة النهائية.
3. `20261004120000_create_media_assets.sql` ملف مقترح محلي غير موجود في سجل Supabase؛ لا يُطبق قبل مراجعة واعتماد.
4. `015_rls_policies.sql` المحلي و`011_library_media.sql` المحلي بهما فروقات معروفة عن السلوك الحي؛ لا تُطبّق هذه الملفات قبل مراجعة تفصيلية.

**المرجع الحي:** لا يوجد كتالوج مؤكد لقاعدة التطبيق؛ كتالوج MCP يخص target غير مطابق. `supabase/schema_live_snapshot.sql` لقطة محلية غير مثبتة الاكتمال وليست مصدرًا بديلًا عن DDL حي كامل.
