# تقرير تنفيذ المرحلة 0 — خط أساس Google Drive

> **آخر تحديث:** 4 أكتوبر 2026 (يحتفظ التقرير بنتائج الفحص الأصلي بتاريخ 3 أكتوبر حيث يلزم).
> **الحالة:** `PARTIAL` — host Supabase MCP طابق `frontend/.env.local` والمضيف الذي أكده المالك. migration `20261004141649_phase0_post_image_and_reactor_visibility` موجودة في ledger؛ proposalا `media_assets` وRPC hardening غير مطبقين. تصنيف البيئة staging/production غير محسوم. direct/default ACL وDDL/RPC وHostinger وbytes verification ما زالت مفتوحة. لا نقل ملفات أو نشر.
> **النطاق:** فحص محلي للمستودع واختبارات محلية وقراءات MCP للقراءة فقط على المشروع المطابق. لا كتابة دائمة أو probe مؤقت في الجولة الأخيرة. لا يتضمن التقرير مفاتيح أو روابط ملفات كاملة أو بيانات شخصية.

## 1. حدود الفحص والبيئة (تم التحقق والتصنيف: STAGING)

- **تطابق الهوية والهدف:** طابق host الذي أعاده `get_project_url` (`kgqgnqjkrghvktymbimz.supabase.co`) مع إعداد `frontend/.env.local` ومع حزم JavaScript المنشورة فعليًا على Vercel (`https://elkaroozschool-seven.vercel.app`).
- **تصنيف البيئة (STAGING):** أثبت التدقيق الميداني لقاعدة البيانات أن جميع المستخدمين الـ50 هم حسابات اختبار نمطية (`trainee_g2_*`, `servant_g3_*`, `admin_user`, إلخ) وأن سجلات التدقيق والبيانات لا تحوي أي نشاط مستخدمين حقيقي بعد 28 سبتمبر 2026. تم توثيق التصنيف رسميًا في `docs/ENVIRONMENT_CLASSIFICATION.md`.
- **حالة الـ Migrations:** السجل الحي يحوي **69 إصدارًا فريدًا**؛ يقابله محليًا **31 ملف migration**: 28 تاريخيًا، و migration إصلاح Phase 0 (`20261004141649_phase0_post_image_and_reactor_visibility.sql`) المسجلة في الـ ledger، واثنان proposals محليان غير مطبقين (`create_media_assets` و `harden_marathon_and_audit_rpcs`).
- **نطاق النشر:** Vercel frontend منشور ويعمل بنجاح (HTTP 200 على `/login`). بوابة PHP على `is-best.net` محجوبة بتحدي الحماية المجاني `aes.js` وليست بيئة Hostinger الإنتاجية بعد؛ الكود البرمجي للـ PHP API مكتمل ومختبر محليًا بنسبة 100%.
- **ضوابط الأمان المعتمدة:** يُعامل المشروع المتصل كـ **STAGING** لاختبار ومصالحة التعديلات، مع حظر أي أمر تدميري (Destructive SQL)، وعدم إعلان الجاهزية الإنتاجية (Production Ready) إلا بعد اكتمال النقل والتحقق الفعلي.

## 2. نتائج قاعدة البيانات الحية (Staging) مقابل migrations المحلية

| المورد | الملاحظة الحية | الأثر |
|---|---|---|
| سجل migrations | MCP target غير المطابق: 69 إصدارًا مقابل 30 ملفًا محليًا (28 تاريخيًا + proposal + إصلاح MCP target): 9 تطابقات إصدار/اسم، و20 اسمًا بإصدارات مختلفة، و40 بلا اسم محلي مقابل؛ proposal `media_assets` غير مطبق. statements محفوظة لـ61/69 سجلًا. | هذه الأعداد لا تخص قاعدة التطبيق قبل تأكيد الهوية؛ mapping الأسماء/الإصدارات وحده لا يكفي، ولا يوجد canonical diff كامل. |
| `gallery_albums`, `gallery_items` | كلا الجدولين يحتوي `group_id` nullable في Supabase الحي، والسياسات تقيد القراءة/الإدارة بالمجموعة أو المسؤول مع السماح بـ`group_id IS NULL` كسجل عالمي. في البيانات المفحوصة: 5 ألبومات و5 عناصر، وكلها ذات مجموعة. هذا العمود/النطاق غير موجود في تعريفات `011_library_media.sql` المحلية؛ وسياسات `015_rls_policies.sql` المحلية لا تعكس نطاق المجموعة الحي. | يجب مطابقة المخطط والسياسات قبل النقل؛ التطبيق يرسل `profile.group_id` في إنشاء item ويعتمد عليه كقيمة عميل، بينما RLS الحي هو الضابط النهائي. |
| `post_images` | الجدول موجود حيًا ويحوي `post_id`, `storage_path`, `image_url` وحقول ترتيب/أبعاد/حجم؛ لا يوجد `feed_post_images` في catalog الحي أو migrations المحلية المفحوصة. | اسم الجدول ووجهة التدفق يجب أن يكونا موحدين قبل ربط رفع الصور. |
| `feed_posts` | المخطط الحي يحتوي `content_text` و`content`، لكنه لا يحتوي `post_type` أو `metadata` ضمن الأعمدة التي أعادها catalog. تعريف `009_feed_social.sql` المحلي يحتوي `content_text` و`images_metadata` فقط؛ `post_images` أضيف حيًا بلا ملف محلي مقابل. | بعض كود PHP الخاص بإعلان المحاضرات لا يطابق schema الحي؛ لا تُطبّق migrations المحلية على قاعدة حالية اعتمادًا على أسماء الجداول فقط. |
| `books`, `researches` | الحي يجعل `group_id` nullable، وسياسة القراءة للمصادقين عالمية دون شرط مجموعة، والإدارة تعتمد `MANAGE_LIBRARY` دون scope. محليًا `011_library_media.sql` يجعل `group_id NOT NULL` و`015_rls_policies.sql` يفرض المجموعة ويستخدم `MANAGE_BOOKS`. واجهة الكتب تحفظ `file_url` ولا ترسل `group_id`. | اختلاف فعلي في schema وRLS؛ تطبيق migration المحلي قد يكسر إضافة الكتب/الأبحاث، بينما تغيير السلوك إلى عزل مجموعات يبدل معنى المكتبة. يلزم قرار/تفسير قبل أي تعديل. |
| `profiles` | السياسة الحية `profiles_select_own_group` تقيد القراءة بالمجموعة أو المستخدم نفسه أو المسؤول ولا تفحص `deleted_at` في شرطها. المحلية `Authenticated users can read profiles` تسمح لكل مصادق بقراءة الصف غير المحذوف. | يختلف نطاق قراءة بيانات/صور الملف الشخصي؛ وقد يجعل join مؤلف منشور Feed العالمي بملف شخص من مجموعة أخرى غير متاح. يلزم اختبار السلوك المقصود، لا توسيع الوصول تلقائيًا. |
| `import_history` | الحي يحتوي عمود `checksum_sha256` nullable؛ غير موجود في تعريف `013_audit_backup_import.sql` المحلي. | metadata النسخ/الاستيراد الحي أحدث من الملف المحلي، ولا يثبت وجود ملف import فعلي. |
| RLS/ACL للموارد العامة | على MCP target فقط: RLS مفعّل على الجداول الـ50. فحص `relacl` و`has_table_privilege` أظهر أن `anon` و`authenticated` لديهما امتيازات الجداول (`SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN`) على 50/50؛ الهوية لا تطابق إعداد المستودع. | السياسات تحكم عمليات الصفوف؛ RLS لا يحكم `TRUNCATE`. لم يثبت أن PostgREST يتيح تنفيذه، ولم تُنفذ عملية مدمرة على MCP target. لا تختبر أي امتياز مدمر قبل تأكيد البيئة؛ يلزم تدقيق caller/policy/ACL على المشروع الصحيح. |
| ACL الافتراضي الحي | في `public`، `relacl` و`has_table_privilege` يؤكدان grants مباشرة لكل امتيازات الجداول لـ`anon` و`authenticated` على 50/50، ومنها `TRUNCATE` و`MAINTAIN`. كما أن default ACL لدى `postgres` و`supabase_admin` تمنح الأدوار نفسها grants للجداول والتسلسلات والدوال (`EXECUTE`). | migration `20260930120000_revoke_anon_security_definer.sql` تستخدم revoke على مستوى schema لـ`PUBLIC` فقط؛ لا تزيل direct grants لـ`anon`/`authenticated` ولا الـglobal `PUBLIC EXECUTE`. probe new-object على MCP target أكد ذلك سلوكيًا لمنشئ `postgres` فقط؛ mismatch يمنع نسب النتيجة للتطبيق: `anon` استدعى function جديدة، وأدخل/قرأ صفًا بجدول جديد؛ `PUBLIC EXECUTE` صريح وامتيازات `TRUNCATE`/`MAINTAIN` ظهرت catalogيًا. اختبرنا privileges فقط ولم ننفذ `TRUNCATE` أو `nextval`. إعداد `supabase_admin` لم يُختبر سلوكيًا لأن الاتصال ليس عضوًا فيه. |

### 2.1 خطة ACL/RPC — مسودة غير مطبقة

أُعيد فحص default ACL وملكية الكائنات على MCP target فقط؛ host لا يطابق `frontend/.env.local`، فلا تُنسب النتائج لقاعدة التطبيق:

- لكل من منشئي الكائنات `postgres` و`supabase_admin` في `public`، سجل `pg_default_acl` grants مباشرة لـ`anon` و`authenticated` على الجداول والتسلسلات والدوال؛ grants الجداول تشمل `TRUNCATE` و`MAINTAIN`. لم تظهر entries عامة `<all schemas>` لهذين الدورين في اللقطة.
- فحص read-only مؤكد: `current_user=session_user=postgres`, و`rolsuper=false`؛ لا membership edge إلى `supabase_admin` و`pg_has_role(...,'SET')=false`. `supabase_admin` نفسه login/superuser/createrole ويملك 31 public functions و0 public relations. لذلك لا يستطيع اتصال MCP الحالي الانتحال إلى هذا الدور أو تعديل default ACL الخاصة به. لا تطلب/تمنح membership شاملة لـ`postgres` كاختصار؛ المسار المتبقي هو أن يراجع وينفذ مشغل قاعدة البيانات/مالك المشروع المخوّل معالجة defaults لهذا الدور بعد مصالحة DDL، ثم يوفّر نتيجة تحقق staging. لم تُجر محاولة `SET ROLE` أو أي تغيير.
- دليل PostgreSQL 17 يوضح أن privileges لكل schema تُضاف إلى global defaults، وأن revoke لكل schema لا يستطيع إلغاء privilege ممنوحًا عالميًا. لذلك `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ... FROM PUBLIC` في migration المحلية لا يغلق default `PUBLIC EXECUTE` العالمي؛ كما لا يزيل direct grants لـ`anon` و`authenticated`. كان هذا استنتاجًا من catalog وقاعدة PostgreSQL الموثقة قبل probe new-object أدناه؛ نتيجة الاختبار تؤكده الآن لمنشئ `postgres` فقط (مرجع: PostgreSQL 17 manual، `ALTER DEFAULT PRIVILEGES`، أقسام Description وExamples؛ تمت المراجعة 3 أكتوبر 2026).
- أُنشئ وشُغّل `scripts/verify_phase0_default_acl_staging.sql` على PostgreSQL `17.6` باستخدام منشئ `postgres` داخل transaction تنتهي بـ`ROLLBACK`. probe أنشأ sequence/table و`SECURITY DEFINER` function تجريبية بأسماء فريدة؛ لـ`anon` و`authenticated` ظهرت امتيازات table/sequence/function المباشرة، و`anon` امتلك أيضًا `TRUNCATE` و`MAINTAIN` كامتيازين (لم ينفذهما). `explicit_public_execute_acl=true`، واستدعاء anon للدالة رجع `73`، وإدخال/قراءة anon أعاد صفًا واحدًا. read-only post-check أكد غياب probe table/sequence/function. لذلك هذه لم تعد مجرد inference لمنشئ `postgres`؛ لا تشمل المنشئ `supabase_admin`.

**التصميم المقترح بعد استكمال artifact catalog ومصالحة ledger الـ68/29 ومحتوى migrations:**

1. **Defaults للمستقبل، منشئًا بمنشئ:** ابدأ بـ`postgres` فقط بعد مراجعة الـmigration ledger. اسحب grants المباشرة غير المطلوبة لـ`anon`/`authenticated` من defaults للجداول والتسلسلات والدوال في `public`، واسحب `PUBLIC EXECUTE` من global default للدوال (بلا `IN SCHEMA`). اجعل grants المطلوبة لكل جدول/sequence/RPC صريحة في migration نفسها. لا تمس `service_role` أو schemas النظام في هذه الجولة قبل إثبات حاجة التطبيق. لا تطبق هذا على `supabase_admin` حتى يتوفر owner/provider path أو تُحصر كل DDL العامة على منشئ يمكن إدارته.
2. **ACL للكائنات القائمة منفصل عن defaults:** لا يغير default ACL حقوق الجداول والدوال الحالية. أنشئ matrix لكل جدول/function/sequence من `relacl`/`proacl` و`has_*_privilege` مع caller/UI/RPC الفعلي؛ لا تسحب `SELECT/INSERT/UPDATE/DELETE` جماعيًا قبل توثيق التدفقات. حدد وأزل grants غير اللازمة، خصوصًا امتيازات تجاوز RLS مثل `TRUNCATE`/`MAINTAIN`، مع إبقاء الاختبار catalog/allow-deny فقط؛ لا تنفذ عملية مدمرة.
3. **RPCs الحالية:** لا يكفي تغيير defaults. صنّف كل دالة `SECURITY DEFINER` حسب caller موثق؛ لا تمنح `authenticated` إلا عند وجود guard خادمي واختبار scope. `get_post_reactors` أظهر bypass على MCP target غير المطابق؛ لا تُنسب النتيجة للتطبيق قبل تأكيد الهوية: يعيد بيانات تفاعل لمنشور محذوف غير مرئي للمستدعي؛ أصلحه ليطابق رؤية `feed_posts` ثم أعد اختبار allow/deny. راجع أيضًا RPCs الإشعارات، `get_trainee_marathon_state`، حراس NULL/`is_active`، و`log_operational_event`. عالج `post_images` كسياسة RLS مستقلة؛ صلاحية anon الظاهرة لا تزول بتعديل default ACL مستقبلية.
4. **Middleware والاستيراد خارج DDL ACL:** أُزيل محليًا fallback `user_metadata.role_id`؛ الاختبارات تؤكد تجاهله مع غياب claim أو تعارضه مع `app_metadata.role`. يلزم اختبار JWT/deployment فعلي. تبقى إزالة fallback كلمة المرور الثابتة ومسار import الذي يسجل `p_file_storage_path` بلا رفع بايتات بعد تثبيت عقد الاستيراد والصلاحيات.

**نموذج SQL للمراجعة فقط — لم يُنفذ، ولا يُنشأ به migration قبل مصالحة الأرشيف:**

```sql
-- فقط لمنشئ public objects المثبت، وبعد مطابقة كل migration/caller.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
    REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
```

**بوابة staging قبل أي تطبيق دائم:** بعد DDL reconciliation، أنشئ أسماء probe فريدة في `public` داخل transaction واحدة تنتهي بـ`ROLLBACK`، واختبر effective privileges لـ`anon`/`authenticated`/`service_role` عبر `has_table_privilege`, `has_sequence_privilege`, `has_function_privilege` وسلوك REST/RPC؛ أكد عدم بقاء probe objects بعد rollback. اختبر مسارات التطبيق المسموح بها أيضًا، ولا تختبر `TRUNCATE`. لا يُقبل الإغلاق حتى تختفي defaults غير المقصودة، وتنجح allow/deny matrices، وتبقى التدفقات الشرعية تعمل.

**حواجز حالية:** أرشيف DDL الموعود لم يصل؛ لا يمكن تصنيف grants اللازمة للـ40 live-only والـ20 version drift. اختبار new-object أكد الخطر لمنشئ `postgres` فقط؛ اتصال MCP غير superuser وليس عضوًا في `supabase_admin`، لذا مسار defaults لهذا المنشئ و31 function يملكها لم يُختبر/يُعالج. لم تُنشأ migration دائمة ولم تُطبق تغييرات ACL. لذلك هذا design review فقط، وليس موافقة تطبيق أو ملف migration جاهزًا.

### تفاصيل مطابقة migration ledger

المقارنة استخدمت نسخة migration واسمها المنطقي بعد إزالة أي بادئة رقمية من الاسم الحي. الملفات المحلية التي تشترك في الاسم لكن تختلف في الإصدار:

| الإصدار المحلي | الاسم | الإصدار الحي |
|---|---|---|
| `001` | `extensions` | `20260926042302` |
| `002` | `core_roles_groups` | `20260926042315` |
| `003` | `profiles_auth_mapping` | `20260926042328` |
| `004` | `permissions_secretariat` | `20260926042339` |
| `005` | `academic_terms_lectures` | `20260926042352` |
| `006` | `attendance` | `20260926042434` |
| `007` | `exams_grades` | `20260926042447` |
| `008` | `marathons` | `20260926042500` |
| `009` | `feed_social` | `20260926042514` |
| `010` | `notifications_verses` | `20260926042525` |
| `011` | `library_media` | `20260926042537` |
| `012` | `bible_local` | `20260926042557` |
| `013` | `audit_backup_import` | `20260926042609` |
| `014` | `indexes_functions_triggers` | `20260926042622` |
| `015` | `rls_policies` | `20260926042639` |
| `016` | `seed_data` | `20260926042652` |
| `20260930120000` | `revoke_anon_security_definer` | `20260930095254` |
| `20260930140000` | `close_self_escalation` | `20260930133048` |
| `20261001120000` | `fix_null_propagation_fail_open_authz` | `20261001112952` |
| `20261001170000` | `logical_restore_rpcs` | `20261001141907` |

الإصدارات المحلية الثمانية المطابقة حرفيًا: `20260930150000/rpc_group_scope_guards`, `20260930200000/pastoral_template_admin_only`, `20261001/revoke_anon_execute_on_group_rpcs`, `20261001130000/backfill_app_metadata_from_profiles`, `20261001140000/drop_create_test_user`, `20261001150000/sync_profile_app_metadata`, `20261001160000/logical_export_rpcs`, `20261002/revoke_public_execute_on_data_reading_rpcs`.

الـ40 migration الحية التي لا يقابلها ملف محلي (الإصدار ثم الاسم كما في السجل):

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

هذه قائمة ledger فقط؛ لا تعني أن محتوى SQL الحي لهذه الإصدارات قورن محليًا. في checkout الحالي عُثر على 37 ملف SQL: 30 migration، و6 verification scripts، و`supabase/schema_live_snapshot.sql` واحد؛ snapshot موجود لكنه غير كامل وغير صالح كبديل عن DDL. فحص `origin/main` بتاريخ 3 أكتوبر 2026 كان عن checkout أقدم (28 migration) ولا يثبت حالة remote الحالية. آخر `git status` المحلي يعرض `main...origin/main` بلا ahead/behind مقابل المرجع المخزن مؤقتًا؛ لم يُجر fetch أو push، والشجرة تحتوي تعديلات محلية. لا يُستنتج من ذلك أن remote محدث أو مطابق. migration `20261004120000_create_media_assets.sql` محلية مقترحة ولا تظهر في السجل الحي؛ migration `20261004141649_phase0_post_image_and_reactor_visibility.sql` طُبقت على staging فقط. التكرارات الحية مثل `logical_restore_rpcs_patch_update_existing` وامتدادات `close_self_escalation` تحتاج تفسيرًا من schema/RPC الحالي قبل أي كتابة. استعلام catalog للقراءة فقط بتاريخ 4 أكتوبر 2026 أثبت أن statements محفوظة لـ61/69 سجل migration وNULL لثمانية سجلات قديمة؛ المحتوى متاح للمقارنة الجزئية، لكن لم يُستخرج أو يقارن كله.

## 3. نطاق الصلاحيات المرصود من السياسات الحية

- `gallery_albums` و`gallery_items`: القراءة للمجموعة الحالية أو السجلات ذات `group_id IS NULL` أو المسؤول؛ الإدارة للمسؤول أو الخادم/السكرتارية ضمن المجموعة أو السجل العالمي.
- `curriculums`, `lectures`, `mp3_tracks`: سياسات قراءة/إدارة مرتبطة بالمجموعة الحالية أو المسؤول، مع صلاحيات الإدارة المفوضة حيث تنطبق.
- `books`, `researches`: قراءة مصادق عليها على مستوى المدرسة، وإدارة عبر `MANAGE_LIBRARY`؛ لا يوجد شرط مجموعة في التعبيرات المقروءة.
- `feed_posts`: القراءة للمستخدم المصادق؛ المنشور عالمي في السياسة المقروءة، والإنشاء لأدوار العاملين المحددة، والتعديل/الحذف للمالك أو المسؤول.
- **النتيجة السابقة على MCP target فقط:** سياسة `Public read post images` كانت `SELECT TO public USING (true)`، وأعاد probe anon عشرة صفوف metadata. طُبق الإصلاح بالـmigration `20261004141649` على target الذي وصفه المالك بأنه staging؛ mismatch يمنع ربط ذلك بقاعدة التطبيق أو تأكيد أثره على production. لا يثبت ذلك خصوصية bytes لدى المضيف الخارجي.
- **قرار المالك في 4 أكتوبر 2026:** صور المنشور والمتفاعلون يرثون صلاحية قراءة المنشور؛ و`group_id IS NULL` في المعرض يعني محتوى عالميًا مقصودًا. Probe allow/deny بعد الإصلاح سُجل على MCP target فقط؛ host mismatch يمنع نسب نتيجته للتطبيق. URLs والـbytes الخارجية لم تُختبر.
- `backup_records` و`import_history` محكومة بسياسات الإدارة في الكتالوج المقروء.
- فحص ACL عبر `aclexplode` أظهر لـ`anon` و`authenticated` امتيازات `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `TRIGGER`, `REFERENCES`, و`MAINTAIN` على كل واحدة من الجداول الـ14 المفحوصة؛ لم يجد البحث المناظر في migrations المحلية `GRANT` جداول يفسرها. RLS يحد عمليات الصفوف وفق السياسات، لكن `TRUNCATE` لا يخضع لـRLS. لم يُجر أي اختبار مدمر، ولا يوجد حتى الآن إثبات أن REST يتيح تنفيذ هذا الامتياز؛ يلزم تحديد مصدر ACL ومراجعة سطح RPC/SQL قبل اعتبار الوضع آمنًا.
- عدد الدوال العامة في catalog هو 79، منها 37 `SECURITY DEFINER`. يوجد 28 من هذه الدوال قابلة للتنفيذ بواسطة `authenticated` ولا واحدة منها قابلة لـ`anon`؛ أظهرت قراءة `proconfig` أن هذه الـ28 تثبت `search_path=public, pg_temp`. المسح الساكن لأجسام الدوال المتاحة لـ`anon`/`authenticated` لم يجد `TRUNCATE` أو dynamic `EXECUTE`/`format`، لكنه لا يعوض مراجعة تفويض كل RPC أو behavioral role-matrix.
- **RPC النسخ الاحتياطي الحي:** `export_manifest()` و`export_table(text, integer, integer)` هما `SECURITY INVOKER` مع `search_path` مثبت؛ `has_function_privilege` أكد أن التنفيذ متاح لـ`service_role` فقط وليس لـ`anon` أو `authenticated`. `restore_accounts`, `restore_database`, و`restore_table` هي `SECURITY DEFINER` ومتاح تنفيذها لـ`service_role` فقط؛ لم تُنفذ عملية export/restore فعلية، لذلك هذا فحص grant/definition لا إثبات round-trip.
- **RPC الاستيراد الحي:** `import_trainees_bulk_atomic` موجود في قاعدة الإنتاج لكن تعريفه المحلي لم يظهر في migrations المحلية؛ سجل ledger يربط تعريفاته/إصلاحاته الحية بالإصدارات `041`–`043` غير الموجودة محليًا. الدالة `SECURITY DEFINER`, مثبتة `search_path`, قابلة لـ`authenticated` فقط، وتتحقق من `is_admin_or_super_user()`؛ لم تُختبر سلوكيًا. عند غياب كلمة مرور الصف تستخدم كلمة مرور ثابتة مع إنشاء الحساب `is_active=true`.
- **اختلاف مساري الاستيراد:** `frontend/src/app/admin/imports/page.tsx` يقبل CSV ملصوقًا في textarea، يتحقق فقط من `username` و`full_name`، ثم يستدعي RPC مباشرةً ويرسل `p_file_storage_path = imports/${filename}` من غير رفع بايتات؛ يمكن بذلك إنشاء سجل مسار لا يثبت وجود ملف أرشيف، كما لا يمنع هذا المسار fallback كلمة المرور الثابتة في الدالة. بالمقابل `ImportController::importTrainees()` في PHP يشترط `Password`، ويحفظ الملف عبر `StorageBridgeService` ثم يمرر المسار الفعلي إلى RPC مع JWT المستخدم؛ لم يُعثر على caller أمامي لهذا المسار PHP. لم تُنفذ أي عملية استيراد.
- `log_operational_event` هو `SECURITY DEFINER` ومتاح لـ`authenticated`، بلا فحص دور داخل الجسم المقروء؛ هو يثبت `actor_id` من `auth.uid()` لكنه يقبل من المستدعي قيم `operation/entity/status/details`. عند غياب profile يملأ `actor_role='admin'` و`actor_name='النظام الآلي'`؛ لم يوجد حاليًا مستخدم Auth بلا profile (العدد 0)، لكن fallback يهدد نزاهة audit لو ظهر هذا المسار. لم يُستدع RPC ولم تُغيّر الصلاحيات.
- **مراجعة static لتفويض RPCs المتاحة لـ`authenticated`:** قُرئت أجسام الدوال الـ28 كاملة مع ACL الفعلي؛ جميعها لا تسمح لـ`anon` حاليًا وتثبت `search_path=public, pg_temp`. الدوال الداخلية الخمس `_unsafe_*` لا ينفذها إلا `service_role` (تم التحقق بـ`has_function_privilege`). دالة `dispatch_absence_notification()` من نوع trigger ومثبتة على `attendance_records`؛ لا أتعامل معها كمسار RPC مباشر.
  - `dispatch_daily_verse_notification`, `trigger_absence_notification`, `trigger_birthday_notifications`: لا يظهر فحص دور/هوية داخل الأجسام؛ `authenticated` يستطيع استدعاء وظائف تغيّر الحالة/تنشئ تنبيهات، والأولى تقبل `p_force_send` وتعيد إرسال إشعار عام وتغيّر حالة الآية. الثانية تقبل trainee/session IDs بلا التحقق من وجود غياب مسجل، ولا تستخدم `p_session_id` في الجسم؛ والثالثة تنشئ تنبيهات مدرسية متداخلة لكل صاحب عيد ميلاد ولكل المستخدمين النشطين، ويمكن تكرارها. لم يُنفذ أي استدعاء أو أثر كتابي.
  - `get_trainee_marathon_state`: لا يتحقق من أن `p_trainee_id` هو المستخدم الحالي أو داخل مجموعته؛ وبما أنها `SECURITY DEFINER` فالـRLS لا يعوض هذا الحارس. ترجع حالة وإجابات المتدرب، وتعرض صحة الإجابات بعد التسليم أو لأدوار بعينها؛ يلزم اختبار cross-group على staging.
  - `get_post_reactors`: كانت `SECURITY DEFINER` بلا تحقق لرؤية المنشور؛ probe السابق أكد bypass لمنشور محذوف. أصلحها migration `20261004141649` بإرجاع `[]` إذا لم يكن المنشور مرئيًا وفق شرط `feed_posts` الحي. إعادة probe staging: hidden reactor count=0، active reactor count=1، مع rollback cleanup=0. claims يدوية وليست JWT حية؛ لا يثبت ذلك JWT/deployment حيًا.
  - `search_bible_content`: `p_limit` يأتي بعد `jsonb_agg` في استعلام مجمّع، فلا يحد عدد صفوف الآيات الداخلة في التجميع؛ بحث فارغ/واسع قد يبني نتيجة كبيرة رغم قيمة الحد. هذا خطر أداء/استهلاك موارد static، ولم يُجر load probe.
  - `submit_marathon_answer` يربط الإجابة بـ`auth.uid()` ويطلب مصادقة، لكنه لا يتحقق من أن الدور `trainee` ولا من حالة/نافذة الماراثون في جسمه المقروء؛ يلزم حسم قواعد المجال واختبارها على staging.
  - `restore_deleted_post`, `soft_delete_post`, `soft_delete_comment`, `reopen_marathon_question`: بعض شروط الدور تستخدم `role NOT IN (...)` بلا معالجة صريحة لقيمة NULL. اختبار SQL scalar للمنطق أعاد NULL، وهو ما يجعل فرع `IF` يتجاوز الرفض. لم يوجد حاليًا أي مستخدم في `auth.users` بلا صف `profiles` (العدد 0)، لذلك هذه ملاحظة static لمسار غياب الملف/الدور وليست إثبات استغلال حالي؛ يلزم اختبار deny على staging وإغلاق fail-open قبل الاعتماد. كما أن تعليق `20261001120000_fix_null_propagation_fail_open_authz.sql` يقول إن `reopen_marathon_question` يبدأ بفحص `auth.uid()` ضد NULL، لكن جسم الدالة الحي المقروء لا يحتوي هذا الفحص؛ كما لا يظهر فحص مجموعة الهدف قبل إعادة فتح أي submission لمن لديه `MANAGE_MARATHON`.
  - `is_admin_or_super_user`, `get_current_user_group`, `get_current_user_role`, `has_servant_permission`, `is_servant_or_secretariat`, `is_secretariat_of_group` لا تضمن جميعها فحص `profiles.is_active=true` (بعضها يفحص حالة association فقط). الملخص الحي أظهر حسابات غير نشطة من دور `trainee` فقط. في probe staging، عند تمثيل حساب trainee غير نشط بclaims مصطنعة، ظهرت له 45 منشورًا و10 صور و5 ألبومات/5 عناصر للمجموعة 1، ووصل RPC إلى عنصرين؛ هذا اختبار RLS/claims، لا إثبات أن Auth ما زال يصدر أو يقبل token حقيقيًا لذلك الحساب. يجب فصل إبطال الجلسات الفعلية عن حراسة RLS واختبارهما على staging.
  - تعارض توثيق/ACL: `20261001120000_fix_null_propagation_fail_open_authz.sql` يمنح `authenticated` تنفيذ `get_trainee_full_profile` و`get_trainee_attendance_summary` وتستدعيهما الواجهة بعد تسجيل الدخول؛ أما تعليق `20261002_revoke_public_execute_on_data_reading_rpcs.sql` فيقول إنهما للخادم فقط لكنه لا يسحب `authenticated` صراحةً. ACL الحي يمنح التنفيذ لـ`authenticated`، وهو متسق مع caller الواجهة لكنه لا يطابق التعليق؛ يحتاج قرارًا وتوثيقًا موحدًا.
- **مصدر role في middleware — إصلاح محلي، غير منشور:** كان `frontend/src/lib/supabase/middleware.ts` يستخرج `app_metadata.role ?? user_metadata.role_id`؛ وهذا fallback غير آمن لأن `user_metadata` قابل لتعديل المستخدم ولا يصلح للتفويض. عُدّل محليًا لاستخدام `roleFromVerifiedClaims(data?.claims)` الذي يقرأ `app_metadata.role` فقط، ويترك القيمة غائبة إذا لم يوجد claim. أضيف اختباران: غياب app claim مع `user_metadata.role_id=admin` يُرفض على `/admin`، وتعارض trainee في app metadata مع admin في user metadata يبقى trainee. أُعيد fallback مؤقتًا كـmutation وتسبب في الفشل المتوقع للاختبار (`expected undefined, received admin`)، ثم استُعيد المصدر وأُعيدت suite كاملة بنجاح. تغطية البيانات الحية المجمعة ما زالت 50/50 app-metadata/profile role match، ولا `raw_user_meta_data.role_id` على الحسابات الـ50. تحقق signature لـ`getClaims()` موثق في مسار middleware؛ الاختبارات المحلية لا تثبت JWT حية أو deployment فعليًا، لذا يبقى اختبار ذلك بعد إتاحة مسار deployment/جلسة staging.
- **تتبع واجهات RPC مقابل حراسة الخادم:** `middleware.ts` يقيّد `/admin/notifications` إلى `admin/super_user` و`/marathon/manage` إلى staff roles؛ لكن الأولوية هنا هي authorization داخل RPC، لأن استدعاء PostgREST مباشرًا لا يمر عبر route middleware. صفحة الإشعارات تخفي اللوحة لغير admin وتستدعي `dispatch_daily_verse_notification` مع `p_force_send=true` و`trigger_birthday_notifications` دون فحص دور داخل bodies المقروءة؛ المنح الفعلي لـ`authenticated` يبقي الاستدعاء المباشر ممكنًا بحسب static review، ولم يُستدع أي RPC. واجهتا `/marathon` واللاعب تمرران `p_trainee_id` الخاص بالمستخدم نفسه إلى `get_trainee_marathon_state`، لكن الدالة نفسها لا تقيد الهدف بـ`auth.uid()`/المجموعة؛ هذا يحد caller الحالي في UI ولا يغلق direct RPC. صفحة Feed تستدعي `get_post_reactors` من معرف المنشور المختار، بينما RPC تقبل أي `p_post_id`؛ وواجهة Bible تمنع query الفارغ وترسل `p_limit=25` لكن ذلك حد عميل لا يحد التجميع داخل RPC. `/marathon/manage` محمية route-wise وتطلب reopen لمعرف submission/question مختارين؛ ما زال مطلوبًا تحقق الخادم من مجموعة الهدف، لا الاعتماد على middleware.
- لقطة Supabase Performance Advisors في `2026-10-03 11:53 UTC`: 8 تحذيرات `function_search_path_mutable` (الدوال المقروءة بلا `proconfig` كانت `SECURITY INVOKER`)، وتحذير واحد عن `pg_trgm` في `public`، و28 تحذيرًا عن `SECURITY DEFINER` قابلة لـ`authenticated`، وتحذير واحد عن تعطيل حماية كلمات المرور المسرّبة. هذه نتائج linter للمراجعة وليست إثبات استغلال؛ لم يُغيّر أي إعداد.

## 4. جرد metadata ومراجع الملفات — أعداد مجمعة فقط

| المصدر | الصفوف/المراجع المرصودة | المضيف/النمط (دون URL كامل) |
|---|---:|---|
| `books.file_url` | 5 | مضيف تخزين داخلي ينتهي بـ`.internal` |
| `books.cover_url` | 5 | مضيف صور خارجي |
| `researches.file_url` | 5 | مضيف تخزين داخلي ينتهي بـ`.internal` |
| `curriculums.file_url` | 8 | نطاق تخزين المدرسة |
| `mp3_tracks.audio_url` | 5 | مضيف تخزين داخلي ينتهي بـ`.internal` |
| `gallery_items.image_url` | 5 | مضيف صور خارجي |
| `feed_posts` | 45 منشورًا؛ 45/45 `images_metadata` من نوع array وجميعها فارغة؛ 5 منشورات لها صفوف في `post_images` | الصور الفعلية المشار لها محفوظة في الجدول المنفصل `post_images` ضمن العينة |
| `post_images` | 10؛ لكلها `storage_path` و`image_url` غير فارغين | مضيف صور خارجي |
| `lectures` | 21 صفًا؛ 21/21 `audio_url` فارغ و`attachments_metadata` array فارغ | لا تثبت هذه النتيجة عدم وجود ملفات خارج المراجع |
| `gallery_albums` / `gallery_items` | 5 / 5؛ كل الصفوف لها `group_id`; `gallery_albums.cover_url` فارغ 5/5 | لا توجد صفوف عالمية ضمن العينة؛ items تشير إلى parent موجود |
| `profiles.avatar_url` / `lecturers.avatar_url` | 50 profile بلا avatar؛ جدول lecturers فارغ (0 صف) | أعداد null/blank فقط |
| فحوص orphan للصور والمعرض | `post_images` بلا parent = 0؛ `gallery_items` بلا album = 0 | تحقق مرجعي داخل Supabase فقط، لا يثبت وجود البايتات |
| soft delete | 11 جدولًا يحمل `deleted_at`؛ 0 صف محذوف soft-delete في الجميع؛ `post_images` و`import_history` لا يحملان العمود | لقطة عددية لحالة الجداول الحالية فقط |
| `backup_records` | 10؛ لكلها `storage_path`، والقيمة `storage_type` هي `HOSTINGER` | يلزم التأكد من الملفات الفعلية ومكانها على Hostinger |
| `import_history` | 28؛ لكلها `original_file_storage_path` | يلزم التحقق من وجود الملفات فعليًا على Hostinger |

هذه استعلامات عددية وتجميع للمضيف فقط؛ لم تُقرأ قيم الروابط أو محتويات الملفات. query pack قابل لإعادة التشغيل للقراءة فقط في `scripts/verify_phase0_media_metadata_readonly.sql`. لا تكفي الأعداد لبناء manifest نقل؛ الحجم والـchecksum ووجود كل ملف لم تُتحقق من المصدر الفعلي.

## 5. مسارات الاستخدام الموجودة في المصدر

- واجهة Feed في `frontend/src/app/page.tsx` تطلب رابط الصورة من المستخدم، ثم تكتب صفًا في `post_images` وتولّد `storage_path` نصيًا؛ لا ترفع بايتات الصورة في هذا المسار.
- Gallery في `frontend/src/app/gallery/page.tsx` تستقبل `رابط الصورة` وتحفظ `image_url` مباشرة في Supabase.
- Books/Research في `frontend/src/app/books/page.tsx` تحفظ `cover_url` و`file_url` من حقول نصية مباشرة في Supabase؛ insert لا يرسل `group_id` رغم أن الملف المحلي يجعله `NOT NULL`، بينما المخطط الحي يسمح بـ`NULL` وسياسة الإدارة الحية لا تفرض مجموعة.
- MP3 في `frontend/src/app/mp3/page.tsx` تحفظ `audio_url` من قيمة نصية مباشرة وتعينه إلى مشغل الصوت؛ لا ترفع ملف الصوت.
- `curriculum/page.tsx` يقرأ `curriculums.file_url` و`lectures.audio_url` ويعرض روابط مباشرة، كما يقرأ `lecturers.avatar_url`؛ لم يظهر في هذا المسار إنشاء/تعديل لهذه الملفات.
- حقول `profiles.avatar_url` و`lecturers.avatar_url` تظهر في القراءة/العرض فقط ضمن المسارات المفحوصة؛ لم يظهر frontend writer أو اختيار ملف avatar. نتيجة البحث عن `type="file"` أظهرت اختيار ملف ZIP في صفحة النسخ الاحتياطي فقط.
- الصفحة `frontend/src/app/admin/imports/page.tsx` تستقبل CSV في `textarea`، وتعرض عبارات CSV/Excel، لكنها لا تستقبل ملفًا بايتياً؛ تستدعي `import_trainees_bulk_atomic` مباشرةً عبر Supabase وتبعث `p_file_storage_path = imports/${filename}`. هذا ليس أرشفة للملف، ولا يتحقق هذا المسار من حقل كلمة المرور قبل RPC. مسار PHP `/import/trainees` يقبل ملفًا حقيقيًا ويخزنه محليًا قبل استدعاء RPC، لكن البحث في `frontend/src` لم يجد caller له عبر `phpApi`. لذلك قيمة مسار import في DB لا تثبت وجود ملف مؤرشف.
- شاشة النسخ الاحتياطي تستدعي `/backup/create` و`/restore/execute` عبر `phpApi`. ملف ZIP للاستعادة يبقى في ذاكرة الصفحة ثم يرسل بـ`FormData` عند تأكيد الاستعادة، ويجب إرفاقه مجددًا بعد إعادة تحميل الصفحة. زر حذف النسخة في الواجهة ينفذ `backup_records.update({ deleted_at })` ويسجل حدثًا، ولا يستدعي `/backup/delete` رغم أن نص الواجهة يقول إن الملف سيُحذف. يوجد route PHP للحذف الفعلي؛ في `BackupController::delete()` يُستخدم `$storageRoot` دون تعيين ظاهر داخل الدالة (بينما التعيين الموجود في `create()` ضمن scope مختلف). لم يُشغّل هذا المسار المدمر؛ الحذف الفعلي غير مثبت ويجب إصلاح/اختبار المسار قبل اعتباره آمنًا.
- Feed يستخدم `soft_delete_post` و`soft_delete_comment`، مع `restore_deleted_post`؛ لم يظهر حذف/استبدال مستقل لصفوف صور المنشور. Gallery وBooks/Research وMP3 لا تعرض مسارات حذف/استبدال لوسائطها في الصفحات المفحوصة.
- `gallery_items` و`mp3_tracks` يرسلان `group_id` المأخوذ من profile في طلب العميل؛ السياسات الحية تربط الكتابة بـ`get_current_user_group()` أو دور المسؤول. قيمة العميل ليست مصدر التفويض، لكن اختبار منع التلاعب بالمجموعة في staging لم يُنفذ.
- البحث في `frontend/src` و`backend-api` لم يجد مراجع Google Drive SDK/API. استدعاءات `phpApi` الأمامية الموجودة هي إنشاء backup واستعادة backup؛ لا يوجد caller أمامي لـ`/storage/upload` أو`/storage/delete` أو`/import/trainees`، ولا يوجد `supabase.storage.from(...).upload(...)` في المصادر المفحوصة.
- `StorageController` المحلي يتحقق من JWT والدور ونطاق المجموعة عند الرفع، بينما الحذف محصور في `admin`/`super_user`. `StorageBridgeService` يكتب إلى `backend-api/storage` ويعيد `file_url` مركبًا من `STORAGE_PUBLIC_URL` مع المسار، إضافة إلى SHA-256. لم يظهر route لقراءة/بث ملف محمية بالـJWT في الراوتر؛ `.htaccess` يمنع تنفيذ السكربتات وفهرسة المجلد، لكنه لا يثبت منع قراءة الملفات. إعدادات subdomain/Hostinger الفعلية ما زالت غير مفحوصة.
- `LectureAnnouncementService::publishWeeklyAnnouncement()` يستخدم `feed_post_images` ويستعمل `post_type` و`metadata` في `feed_posts`، بينما الاسم والحقول غير موجودة في الكتالوج الحي. كذلك يستدعي `StorageBridgeService::getPublicUrl()` وهي غير معرّفة في الخدمة المحلية. لم يظهر call site آخر للدالة في بحث PHP؛ تعامل معها كمسار غير مثبت/غير متصل حتى إثبات خلاف ذلك، لا كتكامل عامل.
- `StorageController` يمرر `folder_type` إلى `FileSecurityMiddleware` كفئة الحجم. مفاتيح الحدود المحلية `avatar`, `feed`, `pdf`, `mp3`, `backup` لا تطابق كل أنواع المجلدات المقبولة؛ `feed` و`mp3` فقط يتطابقان مباشرة، والباقي يقع على fallback قدره 20 MiB. هذا وصف للكود المحلي فقط؛ حدود Hostinger الفعلية غير مقاسة.

## 6. تخزين PHP المحلي والتحقق البرمجي

- مجلد `backend-api/storage/` في checkout المحلي يحتوي `.htaccess` واحدًا بحجم 729 بايت؛ لم تظهر فيه ملفات وسائط محلية. القواعد المرئية تمنع تنفيذ السكربتات وفهرسة المجلد ولا تثبت حجب القراءة المباشرة. هذا **ليس** جردًا لمجلد Hostinger البعيد.
- `.gitignore` يستثني `.env.local` و`.next`; فحص الأسرار المحلي أبلغ أن `.env.example` هو ملف البيئة المتعقب الوحيد.
- من `frontend/`: `npm run typecheck`, `npm test`, و`npm run build` خرجت برمز 0 بعد إصلاح middleware المحلي. الاختبارات: **98/98 عبر 6 ملفات** (شمل `routeAccess.test.ts` عدد 16 اختبارًا). البناء نجح مع **9 تحذيرات lint** في صفحات/مكونات أخرى (اعتماديات `useEffect` وصور `<img>`).
- `php -l` شمل 61 ملف PHP من `backend-api/` و`scripts/`: 0 أخطاء صياغة.
- `node scripts/verify_no_fake_success.mjs`: **18/18**.
- `python scripts/verify_no_credential_leaks.py`: **4/4**؛ فُحصت 3 أرشيفات حسب خرج الأداة.
- ملخص Supabase Performance Advisors في `2026-10-03 11:53 UTC`: `unindexed_foreign_keys` عدد 77، `auth_rls_initplan` عدد 20، `unused_index` عدد 2، و`multiple_permissive_policies` عدد 29. هذه تنبيهات linter لم تُعالج أو تُختبر كأداء فعلي؛ من أمثلتها مفاتيح أجنبية غير مفهرسة في `backup_records`.
- في هذه الجولة: أول probe تسلسلي لقراءة REST انتهى بالمهلة؛ أُعيد بحدود زمنية متوازية واكتمل على 14 جدولًا: HTTP `200` للجميع، صفر صفوف مرئية على 13 جدولًا وصف واحد على `post_images`، دون طباعة أي ID. وطلب `GET /health` إلى عنوان PHP المحلي (`localhost`) فشل بـ`URLError`. لا يمثل ذلك فحصًا لـHostinger أو Google Drive.
- **ملاحظة تاريخية تخص MCP target:** نتائج probe التي تسجل `post_images=10` لـanon و`get_post_reactors` للمنشور المحذوف سبقت إصلاح migration على ذلك الهدف في 4 أكتوبر 2026؛ لا يمكن ربط أي من هذه النتائج بقاعدة التطبيق بعد اكتشاف mismatch.
- شُغّل `scripts/verify_phase0_scope_staging.sql` على MCP target الذي وصفه المالك بأنه staging. استخدم temp tables/function داخل `BEGIN ... ROLLBACK` وclaims يدوية؛ الأرقام المسجلة (`feed_posts` 45/0 و`post_images` 10/10 وغيرها) تخص ذلك الهدف فقط، ولا تثبت صلاحيات التطبيق أو JWT حية أو حالة production. لا تُكرر هذا probe قبل تأكيد هوية الهدف.
- شُغّل `scripts/verify_phase0_reactor_scope_staging.sql` على MCP target داخل transaction؛ نتائج المنشور المحذوف و`get_post_reactors` تخص ذلك الهدف فقط، والـclaims كانت يدوية. لا تُنسب النتائج للتطبيق ولا تُكرر قبل تأكيد الهوية.
- `scripts/verify_phase0_default_acl_staging.sql`: probe `postgres` المؤقت ونتائج ACL تخص MCP target فقط؛ mismatch يمنع نسبتها للتطبيق. لم يحدث `TRUNCATE` أو `nextval` في ذلك probe، وأُزيلت fixture عبر rollback.
- مراجعة static لبقية سكربتات التحقق: `scripts/verify_role_matrix.sql` يختبر `import_trainees_bulk_atomic` لـ`anon` بمدخل فارغ داخل transaction تنتهي بـ`ROLLBACK`؛ `scripts/verify_exploitation_suite.sql` يتضمن محاولات `UPDATE public.profiles` واسعة داخل transactions/rollback؛ و`verify_pastoral_template_rls.sql` ينشئ/يمنح `public._pastoral_probe` خارج transaction الاختبار ويحذفه في النهاية، لذا الانقطاع قد يترك دالة عامة. لم يُشغّل أي من هذه السكربتات؛ ليست مناسبة للإنتاج. يلزم تأكيد staging وعزل/تنظيف harness قبل أي استخدام لاحق.
- نتائج `npm`, PHP lint، وscripts الفحص أعلاه محلية على شجرة عمل معدلة؛ لا تثبت النشر أو نجاح تدفقات Google Drive أو Hostinger. probe staging منفصل وموثق في البند السابق.

## 7. حالة مهام المرحلة 0

| المهمة | الحالة | المتبقي |
|---|---|---|
| 0.1 جرد مسارات الملفات | `PARTIAL` | اكتمل تتبع مصادر الواجهة ومسارات URL/الرفع/الحذف المحلية؛ تبقى مطابقة المضيف والملفات الفعلية في Hostinger واختبار البايتات والحذف الآمن. |
| 0.2 مطابقة Supabase | `PARTIAL` | كل الأرقام هنا تخص MCP target غير المطابق لـ`frontend/.env.local`: 69 migrations، 61/69 statements، 37 `SECURITY DEFINER` (`anon=0`, `authenticated=28`, `service_role=37`), و20 version drift/40 live-only. مقارنة محتوى migration واحدة على MCP target فقط. لا تُنسب النتائج للتطبيق؛ snapshot غير كامل ومراجعة bodies/ACL/RPCs مفتوحة. |
| 0.3 جرد التخزين والملفات | `BLOCKED` جزئيًا | جرد checkout المحلي فقط؛ يلزم manifest read-only من Hostinger يتضمن العدد/الحجم/النوع دون تنزيل محتوى المستخدمين. |
| 0.4 scope والصلاحيات | `PARTIAL` | إصلاح `post_images`/`get_post_reactors` وفجوتا RPC المرصودتان تخص MCP target غير المطابق؛ لا يمكن تأكيد البيئة أو نسب النتائج للتطبيق أو الجزم بأثرها على production. لم يحدث اختبار استغلال أو إصلاح RPC إضافي. بعد تأكيد الهدف تبقى direct/default ACL، باقي RPCs، ومصالحة DDL. |
| 0.5 حدود الرفع | `PARTIAL` | حدود المصدر قُرئت؛ قياس PHP/Hostinger ورفع حقيقي آمن لم يحدث. |
| 0.6 روابط/أيتام/soft delete | `PARTIAL` | أعداد URL/JSON وorphan/soft-delete تخص MCP target غير المطابق لـ`frontend/.env.local`؛ لا تُنسب لقاعدة التطبيق. البايتات/الحجم/checksum غير متحققة. |
| 0.7 خط أساس الاختبارات المحلية | `COMPLETE` محليًا فقط | يجب إعادة تشغيله على commit نظيف/قبل كل تغيير كبير؛ لا يغطي تكامل Drive. |
| 0.8 الأسرار ومسارات النشر | `PARTIAL` | فحص Git والـarchives المحلي ناجح؛ عُرف أن Vercel MCP لا يتيح قراءة المشروع/النشر/env، ولا توجد أداة Hostinger أو قيمة هدف إنتاجي مثبتة؛ إعدادات Vercel/Hostinger وlogs الحية لم تُفحص. |

## 8. بوابات تمنع بدء تغيير التخزين

1. عولجت مشكلة صور Feed و`get_post_reactors` على MCP target فقط بعد إذن المالك. وصفه المالك بأنه staging، لكن host mismatch يمنع تأكيد ذلك؛ لا يُدّعى أن migration لمست production أو لم تمسه. لا migration إنتاجية أخرى قبل مصالحة schema/RPC والـledger وتأكيد target.
2. القرار موثق: صور المنشور وقائمة المتفاعلين ترثان صلاحية قراءة المنشور. probe بعد migration تاريخي ويخص MCP target فقط؛ افحص bytes لدى مضيف الملفات بشكل مستقل.
3. لا تغيّر ACL واسعة قبل معرفة مصدرها ومراجعة قنوات التنفيذ؛ لا تنفذ `TRUNCATE` أو أي اختبار كتابي/مدمر على المشروع الحي.
4. قرر المالك استخدام حساب Google شخصي وMy Drive وحفظ backup bytes على Drive الخاص؛ ما زالت ملكية/استرداد الحساب وOAuth scopes وطريقة المصادقة واختبار sandbox غير محسومة. Hostinger غير متاح حاليًا.
5. لا توصل واجهات الوسائط إلى upload/delete ولا تعتبر backup/import كاملين قبل تحديد العقدة النهائية للملف واختبار الرفع/القراءة/الحذف والـrollback على staging؛ الواجهات الحالية تحفظ URL أو path نصيًا في عدة مسارات.
6. لا تُغلق مراجعة صلاحيات Supabase قبل إصلاح/حسم فجوات RPC المذكورة (الإشعارات، `get_trainee_marathon_state`, NULL-role guards، و`log_operational_event`)، وحسم fallback كلمة المرور الثابتة ومسار `p_file_storage_path`، وتثبيت ACL الافتراضي في migrations ثم اختبار مصفوفة الأدوار على staging. fallback `user_metadata.role_id` أزيل من الشجرة محليًا واختُبر؛ يلزم تحقق JWT/deployment حي قبل اعتباره منشورًا. لا تُطبّق إصلاحًا أمنيًا مباشرًا على الإنتاج ضمن هذا التدقيق.
7. لا يُعلن المشروع جاهزًا: بنود Go-live الـ16 في الخطة ما زالت `NOT RUN`؛ الفحوص المحلية لا تغلقها.

**الخطوة التالية:** استكمال normalized SQL/DDL reconciliation للـ61 statements المتاحة في ledger المشروع المطابق وتصنيف الـ8 NULL rows، ثم مراجعة ACL وRPCs المتبقية و`supabase_admin` دون اختبارات مدمرة. migration `post_images`/`get_post_reactors` موجودة في ledger ومؤكدة read-only. proposal hardening لـRPCs اجتازت shape check محلي فقط ولم تُختبر على PostgreSQL أو تُطبق. يلزم حسم تصنيف البيئة (staging/production) قبل أي probe كتابي، وJWT حية واختبار البايتات على المضيف الخارجي. إصلاح middleware محلي ومختبر تاريخيًا (98/98 frontend tests، typecheck وbuild)؛ لم يُنشر. ما زال الوصول للقراءة من Hostinger/Vercel غير متاح؛ لا يبدأ تعديل adapter/metadata أو النقل قبل إغلاق بوابات المرحلة 0.
