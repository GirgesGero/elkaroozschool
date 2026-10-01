# وثيقة التصميم الفني والمعماري الشامل (Technical Design Document)
## مشروع: مدرسة الكاروز — EL KAROOZ School

**الإصدار:** 1.0.0-FINAL-DESIGN  
**الحالة:** Approved & Ready for Implementation (معتمد وجاهز للتنفيذ البرمجي)  
**المرجعية الصارمة:** `SRS v2.0.0-OFFICIAL-SPEC — REQUIREMENTS COMPLETE`  
**القرارات المعلقة (Pending Decisions):** `NONE` (0 معلق)  
**المؤلف:** Senior Software Architect & Technical Lead  
**تاريخ التصميم:** سبتمبر 2026  

---

## الفهرس العام

1. [1. نظرة عامة على المعمارية (Architecture Overview)](#1-نظرة-عامة-على-المعمارية-architecture-overview)
2. [2. مكونات النظام (System Components)](#2-مكونات-النظام-system-components)
3. [3. تدفق البيانات (Data Flow Diagrams & Specifications)](#3-تدفق-البيانات-data-flow-diagrams--specifications)
4. [4. المخطط الشامل لقاعدة البيانات (Database Schema & Table Specifications)](#4-المخطط-الشامل-لقاعدة-البيانات-database-schema--table-specifications)
5. [5. وصف العلاقات البيانية (Entity Relationship Description - ERD)](#5-وصف-العلاقات-البيانية-entity-relationship-description---erd)
6. [6. محرك الأدوار والصلاحيات (Roles & Permissions Engine)](#6-محرك-الأدوار-والصلاحيات-roles--permissions-engine)
7. [7. مواصفات سياسات أمان البيانات (Supabase RLS Policies Specification)](#7-مواصفات-سياسات-أمان-البيانات-supabase-rls-policies-specification)
8. [8. معمارية خادم PHP الخلفي على Hostinger (PHP Backend Architecture)](#8-معمارية-خادم-php-الخلفي-على-hostinger-php-backend-architecture)
9. [9. عقود واجهات البرمجة (API Endpoint Contracts)](#9-عقود-واجهات-البرمجة-api-endpoint-contracts)
10. [10. معمارية وهيكل التخزين على Hostinger (Hostinger Storage Architecture)](#10-معمارية-وهيكل-التخزين-على-hostinger-hostinger-storage-architecture)
11. [11. معمارية النسخ الاحتياطي الشامل (Backup Architecture)](#11-معمارية-النسخ-الاحتياطي-الشامل-backup-architecture)
12. [12. معمارية الاستعادة الذرية (Restore Architecture)](#12-معمارية-الاستعادة-الذرية-restore-architecture)
13. [13. منطق التراجع التلقائي للأمان (Atomic Rollback Mechanism)](#13-منطق-التراجع-التلقائي-للأمان-atomic-rollback-mechanism)
14. [14. معمارية الاستيراد الجماعي للمتدربين (Bulk Import Architecture)](#14-معمارية-الاستيراد-الجماعي-للمتدربين-bulk-import-architecture)
15. [15. معمارية تصدير البيانات (Export Architecture)](#15-معمارية-تصدير-البيانات-export-architecture)
16. [16. معمارية سجل التدقيق والمراقبة (Audit Log Architecture)](#16-معمارية-سجل-التدقيق-والمراقبة-audit-log-architecture)
17. [17. معمارية الحذف المؤقت والاسترجاع (Soft Delete Architecture)](#17-معمارية-الحذف-المؤقت-والاسترجاع-soft-delete-architecture)
18. [18. معمارية محرك الإشعارات (Notifications Architecture)](#18-معمارية-محرك-الإشعارات-notifications-architecture)
19. [19. معمارية قسم الكتاب المقدس والتفاسير (Local Bible Architecture)](#19-معمارية-قسم-الكتاب-المقدس-والتفاسير-local-bible-architecture)
20. [20. المعمارية الأمنية الشاملة (Security Architecture)](#20-المعمارية-الأمنية-الشاملة-security-architecture)
21. [21. عزل بيانات الفرق (Data Isolation & Year Scope)](#21-عزل-بيانات-الفرق-data-isolation--year-scope)
22. [22. استراتيجية معالجة واستجابة الأخطاء (Error Handling Strategy)](#22-استراتيجية-معالجة-واستجابة-الأخطاء-error-handling-strategy)
23. [23. المراقبة وسجلات التشغيل (Monitoring & Logging)](#23-المراقبة-وسجلات-التشغيل-monitoring--logging)
24. [24. معمارية النشر والبيئات (Deployment Architecture)](#24-معمارية-النشر-والبيئات-deployment-architecture)
25. [25. مصفوفة المخاطر الفنية واستراتيجيات تفاديها (Technical Risks & Mitigation)](#25-مصفوفة-المخاطر-الفنية-واستراتيجيات-تفاديها-technical-risks--mitigation)
26. [26. الاعتماديات البرمجية والحزم (Implementation Dependencies)](#26-الاعتماديات-البرمجية-والحزم-implementation-dependencies)
27. [27. الترتيب التسلسلي للتنفيذ (Implementation Order & Roadmap)](#27-الترتيب-التسلسلي-للتنفيذ-implementation-order--roadmap)
28. [28. قائمة التحقق والاعتماد للتصميم الفني (Technical Design Approval Checklist)](#28-قائمة-التحقق-والاعتماد-للتصميم-الفني-technical-design-approval-checklist)

---

## 1. نظرة عامة على المعمارية (Architecture Overview)

تعتمد منصة **«الكاروز سكول — EL KAROOZ School»** على معمارية سحابية هجينة ثلاثية الطبقات (Three-Tier Hybrid Architecture) تضمن الأداء العالي، الأمان الصارم، وعزل المسؤوليات:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT LAYER (Next.js 14+ PWA)                           │
│  - React UI / Tailwind CSS / RTL Direction / TypeScript                                 │
│  - Service Worker (Offline Cache, Web Push Notifications)                               │
│  - Optimistic UI Updates / Realtime Subscriptions via Supabase Client                   │
└──────────────────────────────┬──────────────────────────────────────────┬───────────────┘
                               │ Direct Read Queries (RLS Protected)      │ Sensitive Actions / Uploads
                               │ & Realtime WebSockets                     │ Backup / Restore / Imports
                               ▼                                          ▼
┌──────────────────────────────────────────────────────┐  ┌───────────────────────────────┐
│               DATA & IDENTITY LAYER                  │  │     BACKEND SERVICES LAYER    │
│                     (Supabase)                       │  │      (PHP 8.2+ on Hostinger)  │
├──────────────────────────────────────────────────────┤  ├───────────────────────────────┤
│ • Supabase Auth (Username+Password Auth / JWT)       │  │ • JWT Authentication / Claims │
│ • PostgreSQL 15+ Engine                              │◄─┼─►• RBAC & Group Scope Enforcer │
│ • Row Level Security (RLS) Policies                  │  │ • Hostinger Storage Bridge    │
│ • Local Bible & Commentaries Database                │  │ • Encrypted ZIP Backup Engine │
│ • Realtime Engine (Postgres Changes via WSS)         │  │ • Atomic Restore & Rollback   │
│ • Resource Metadata & Audit Log Persistence          │  │ • Trainee Bulk Import Engine  │
└──────────────────────────────────────────────────────┘  └───────────────┬───────────────┘
                                                                          │ File I/O
                                                                          ▼
                                                          ┌───────────────────────────────┐
                                                          │    PHYSICAL STORAGE LAYER     │
                                                          │     (Hostinger Web Storage)   │
                                                          │  /users/ /academic/ /backups/ │
                                                          └───────────────────────────────┘
```

### المبادئ المعمارية الحاكمة:
1. **الوصول المباشر للقراءة (Direct Read Strategy):** استعلامات القراءة العادية وتغذية البيانات (Feed, Bible, Attendance, Curriculum, Notifications) تتم مباشرة بين Next.js و Supabase PostgreSQL، محمية بسياسات RLS الصارمة لتحقيق أقصى سرعة استجابة وأقل زمن تأخير (Latency).
2. **الوساطة الخلفية للعمليات الحساسة (Backend Mediation for Critical Ops):** كافة العمليات المتعلقة برفع وتعديل الملفات، النسخ الاحتياطي، الاستعادة، والاستيراد الجماعي تمر حصرياً عبر **خادم PHP Backend** على Hostinger مع فحص إجباري لـ Supabase JWT وصلاحيات المستخدم.
3. **أحادية التخزين الفعلي (Decoupled Storage):** Supabase لا تخزن الملفات الفيزيائية أو الثقيلة إطلاقاً، وتقتصر على تخزين البيانات الوصفية (Metadata, File Size, Mime Type, Relative/Absolute URLs)، بينما تُخزن كافة الملفات الفيزيائية على Hostinger Storage.
4. **الاستقلالية في قسم الكتاب المقدس (Offline-First Local Content):** تضمين كافة نصوص وتفاسير وقواميس موقع الأنبا تكلا في جداول علائقية محلية داخل PostgreSQL مع فهرسة نصية سريعة.

---

## 2. مكونات النظام (System Components)

### 2.1 تطبيق الواجهة الأمامية (Frontend App - Next.js)
- **Framework:** Next.js (App Router, Server & Client Components).
- **Styling & UI:** Tailwind CSS, Lucide React Icons, Radix UI Primitives, مع دعم كامل للغة العربية واتجاه RTL.
- **State & Data Fetching:** TanStack React Query (Server State, Caching, Optimistic Updates) + Supabase JS Client.
- **PWA Integration:** Next-PWA / Web App Manifest + Custom Service Worker لاستقبال Web Push Notifications والعمل دون اتصال للمحتوى الثابت.

### 2.2 منصة قواعد البيانات والهوية (Database & Auth - Supabase)
- **PostgreSQL Database:** تخزين كافة الكيانات العلائقية، نصوص الكتاب المقدس، سجلات الحضور، الدرجات، والميتاداتا.
- **Supabase Auth Engine:** إدارة حسابات المستخدمين وجلسات العمل وإصدار توكنات JWT المشفرة.
- **Realtime Engine:** بث أحداث الجداول (INSERT, UPDATE, DELETE) عبر WebSockets لقنوات Feed، الإشعارات، والتفاعلات.

### 2.3 خادم الخدمات الخلفية (Backend API - PHP on Hostinger)
- **Environment:** PHP 8.2+ (FastCGI / Apache or Nginx).
- **Core Modules:**
  - `JWT Verifier & Guard`: التحقق من توقيع JWT واستخراج claims.
  - `Storage Manager`: إدارة ملفات Hostinger Storage، الفحص الأمني للملفات، وإعادة التسمية المشفرة.
  - `Backup & ZIP Engine`: تفريغ البيانات وضغط وتشفير ملفات ZIP بكلمة مرور AES-256.
  - `Atomic Restore Controller`: إدارة مراحل فك التشفير، المعاينة، النسخة الوقائية، والـ Rollback.
  - `Bulk Import Processor`: معالجة ملفات Excel/CSV مع تطبيق قاعدة الرفض الشامل (All-or-Nothing).
  - `Audit Log Dispatcher`: تسجيل كافة العمليات الحساسة في جدول `audit_logs` في Supabase عبر `service_role`.

### 2.4 التخزين الفيزيائي (Hostinger File Storage)
- مساحة تخزين منظمة شجرياً تعتمد نظام UUID وتفصل بين الوسائط العامة والملفات الأكاديمية والنسخ الاحتياطية الدائمة.

---

## 3. تدفق البيانات (Data Flow Diagrams & Specifications)

### 3.1 تدفق المصادقة والجلسات (Authentication Flow)
```
[User] ──► (Username + Password) ──► [Next.js Client]
                                             │
                                             ▼
                                   [Supabase Auth Engine]
                                             │
                        ┌────────────────────┴────────────────────┐
                        ▼                                         ▼
                [Invalid Credentials]                     [Valid Credentials]
                        │                                         │
                        ▼                                         ▼
                [Return 401 Error]                        [Generate JWT + Session]
                                                                  │
                                                                  ▼
                                                      [Extract Custom Claims]
                                                      (user_id, role, group_id)
                                                                  │
                                                                  ▼
                                                      [Store in HTTP-only Cookie]
```

### 3.2 تدفق رفع الملفات وتحديث الميتاداتا (File Upload Flow)
```
[Next.js Client] ──► [Multipart Request + Supabase JWT] ──► [PHP Backend API]
                                                                    │
                                                                    ▼
                                                        [Verify JWT & Permissions]
                                                                    │
                                                        [Validate MIME / Magic Bytes]
                                                                    │
                                                        [Generate UUID File Name]
                                                                    │
                                                        [Save to Hostinger Storage]
                                                                    │
                                                                    ▼
                                                        [Insert Metadata in Supabase]
                                                                    │
                                                                    ▼
                                                        [Log Action in Audit Log]
                                                                    │
                                                                    ▼
                                                        [Return File URL & Metadata]
```

### 3.3 تدفق النسخ الاحتياطي الكامل (Full Backup Flow)
```
[Admin / Super User] ──► [Trigger Backup + Enter Password] ──► [PHP Backup API]
                                                                      │
                                                                      ▼
                                                          [Verify JWT & Admin Role]
                                                                      │
                                                          [Extract PostgreSQL Dump]
                                                                      │
                                                          [Collect Storage Files]
                                                                      │
                                                          [Generate manifest.json]
                                                                      │
                                                          [Create Password-Protected ZIP]
                                                          (AES-256 Encryption)
                                                                      │
                                        ┌─────────────────────────────┴─────────────────────────────┐
                                        ▼                                                           ▼
                            [Option 1: Stream to Client]                                [Option 2: Save to Storage]
                                        │                                               (/backups/full/{filename})
                                        │                                                           │
                                        └─────────────────────────────┬─────────────────────────────┘
                                                                      ▼
                                                          [Insert into backup_records]
                                                                      │
                                                          [Record Audit Log Entry]
```

---

## 4. المخطط الشامل لقاعدة البيانات (Database Schema & Table Specifications)

### 4.1 الجداول الأساسية والمستخدمين (Core & Auth Entities)

#### 1. `groups` (الفرق الدراسية)
- **الوصف:** الفرق الدراسية الثلاث الثابتة في مدرسة الكاروز.
- **الحقول:**
  - `id` (SMALLINT, PK): معرف الفرقة (1, 2, 3).
  - `name_ar` (VARCHAR(50), NOT NULL): الاسم بالعربية ("الفرقة الأولى", "الفرقة الثانية", "الفرقة الثالثة").
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
- **القيود:** `id IN (1, 2, 3)`.

#### 2. `roles` (الأدوار)
- **الوصف:** الأدوار الخمسة المعتمدة في النظام.
- **الحقول:**
  - `id` (VARCHAR(30), PK): معرف الدور (`admin`, `super_user`, `servant`, `secretariat`, `trainee`).
  - `name_ar` (VARCHAR(50), NOT NULL): اسم الدور بالعربية.
  - `description` (TEXT, NULL).
- **البيانات الثابتة:** 5 أدوار معتمدة حصراً.

#### 3. `permissions` (الصلاحيات المفوضة)
- **الوصف:** الصلاحيات الذرية المستقلة التي تفوض للخدام.
- **الحقول:**
  - `id` (VARCHAR(50), PK): معرف الصلاحية:
    - `MANAGE_LECTURES` (إدارة المحاضرات)
    - `MANAGE_CURRICULUM` (إدارة المناهج)
    - `MANAGE_MARATHON` (إنشاء وإدارة الماراثون)
    - `GRADE_EXAMS` (إدخال وتصحيح درجات الامتحانات)
    - `MANAGE_BOOKS` (إدارة الكتب والأبحاث)
  - `name_ar` (VARCHAR(100), NOT NULL).
  - `description` (TEXT, NULL).

#### 4. `profiles` (الملفات الشخصية للمستخدمين)
- **الوصف:** الكيان المركزي لكافة مستخدمي المنصة والمرتبط بـ `auth.users`.
- **الحقول:**
  - `id` (UUID, PK, FK -> `auth.users.id` ON DELETE CASCADE).
  - `username` (VARCHAR(50), NOT NULL, UNIQUE): اسم المستخدم لتسجيل الدخول.
  - `full_name` (VARCHAR(150), NOT NULL): الاسم الثلاثي/الرباعي.
  - `avatar_url` (TEXT, NULL): رابط الصورة الشخصية المخزنة على Hostinger.
  - `birth_date` (DATE, NOT NULL): تاريخ الميلاد (مستخدم لإشعارات أعياد الميلاد).
  - `phone` (VARCHAR(20), NULL): رقم الهاتف.
  - `address` (TEXT, NULL): العنوان.
  - `church` (VARCHAR(100), NULL): كنيسة المستخدم.
  - `confession_father` (VARCHAR(100), NULL): أب الاعتراف.
  - `role_id` (VARCHAR(30), NOT NULL, FK -> `roles.id`): دور المستخدم.
  - `group_id` (SMALLINT, NOT NULL, FK -> `groups.id`): الفرقة التي ينتمي إليها.
  - `is_active` (BOOLEAN, NOT NULL, DEFAULT TRUE): حالة الحساب.
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `deleted_at` (TIMESTAMPTZ, NULL): وقت الحذف المؤقت (Soft Delete).
  - `deleted_by` (UUID, NULL, FK -> `profiles.id`): المستخدم القائم بالحذف.
- **الفهارس (Indexes):**
  - `idx_profiles_username` (UNIQUE on `username`).
  - `idx_profiles_group_role` on `(group_id, role_id) WHERE deleted_at IS NULL`.
  - `idx_profiles_birth_date` on `(EXTRACT(MONTH FROM birth_date), EXTRACT(DAY FROM birth_date))`.
  - `idx_profiles_deleted_at` on `(deleted_at)`.

#### 5. `secretariats` (سكرتارية الفرق)
- **الوصف:** تعيين أعضاء السكرتارية للفرق (من 1 إلى 3 لكل فرقة).
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `profile_id` (UUID, NOT NULL, UNIQUE, FK -> `profiles.id` ON DELETE CASCADE).
  - `group_id` (SMALLINT, NOT NULL, FK -> `groups.id`).
  - `appointed_by` (UUID, NOT NULL, FK -> `profiles.id`).
  - `appointed_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
- **القيود:** قيد تحقق بعدم تجاوز 3 سكرتارية لكل فرقة عبر Trigger / Function.

#### 6. `servant_permissions` (تفويض صلاحيات الخدام)
- **الوصف:** ربط الصلاحيات المستقلة المفوضة للخادم.
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `profile_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE CASCADE).
  - `permission_id` (VARCHAR(50), NOT NULL, FK -> `permissions.id` ON DELETE CASCADE).
  - `granted_by` (UUID, NOT NULL, FK -> `profiles.id`).
  - `granted_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
- **القيود:** `UNIQUE (profile_id, permission_id)`.

---

### 4.2 الجداول الأكاديمية والتقييم (Academic & Grading Entities)

#### 7. `terms` (الفصول الدراسية)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `group_id` (SMALLINT, NOT NULL, FK -> `groups.id`).
  - `name` (VARCHAR(50), NOT NULL): مثل "الترم الأول 2026".
  - `is_current` (BOOLEAN, NOT NULL, DEFAULT FALSE).
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).

#### 8. `lecturers` (المحاضرون والأساتذة)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `full_name` (VARCHAR(150), NOT NULL).
  - `title` (VARCHAR(100), NULL): مثل "دياكون / قس / أستاذ مادة".
  - `avatar_url` (TEXT, NULL).
  - `bio` (TEXT, NULL).
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `deleted_at` (TIMESTAMPTZ, NULL).
  - `deleted_by` (UUID, NULL, FK -> `profiles.id`).

#### 9. `lectures` (المحاضرات والدروس)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `group_id` (SMALLINT, NOT NULL, FK -> `groups.id`).
  - `term_id` (UUID, NOT NULL, FK -> `terms.id`).
  - `lecturer_id` (UUID, NOT NULL, FK -> `lecturers.id`).
  - `title` (VARCHAR(200), NOT NULL).
  - `description` (TEXT, NULL).
  - `lecture_date` (DATE, NOT NULL).
  - `audio_url` (TEXT, NULL): رابط ملف MP3 على Hostinger.
  - `attachments_metadata` (JSONB, DEFAULT '[]'::jsonb): مصفوفة روابط وتفاصيل الملفات الملحقة.
  - `created_by` (UUID, NOT NULL, FK -> `profiles.id`).
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `deleted_at` (TIMESTAMPTZ, NULL).
  - `deleted_by` (UUID, NULL, FK -> `profiles.id`).
- **الفهارس:** `idx_lectures_group_term` on `(group_id, term_id) WHERE deleted_at IS NULL`.

#### 10. `curriculums` (المناهج الدراسية)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `group_id` (SMALLINT, NOT NULL, FK -> `groups.id`).
  - `term_id` (UUID, NOT NULL, FK -> `terms.id`).
  - `title` (VARCHAR(200), NOT NULL).
  - `description` (TEXT, NULL).
  - `file_url` (TEXT, NOT NULL): مسار ملف الـ PDF.
  - `file_size_bytes` (BIGINT, NOT NULL).
  - `created_by` (UUID, NOT NULL, FK -> `profiles.id`).
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `deleted_at` (TIMESTAMPTZ, NULL).
  - `deleted_by` (UUID, NULL, FK -> `profiles.id`).

#### 11. `attendance_sessions` (جلسات الحضور الأسبوعية)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `group_id` (SMALLINT, NOT NULL, FK -> `groups.id`).
  - `session_date` (DATE, NOT NULL): تاريخ يوم الجمعة للجلسة.
  - `status` (VARCHAR(20), NOT NULL, DEFAULT 'OPEN'): `OPEN` أو `LOCKED`.
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `closed_at` (TIMESTAMPTZ, NULL).
- **القيود:** `UNIQUE (group_id, session_date)`.

#### 12. `attendance_records` (سجلات حضور المتدربين)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `session_id` (UUID, NOT NULL, FK -> `attendance_sessions.id` ON DELETE CASCADE).
  - `group_id` (SMALLINT, NOT NULL, FK -> `groups.id`).
  - `trainee_id` (UUID, NOT NULL, FK -> `profiles.id`).
  - `status` (VARCHAR(20), NOT NULL): `PRESENT`, `ABSENT`, `LATE`.
  - `recorded_by` (UUID, NOT NULL, FK -> `profiles.id`).
  - `recorded_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `deleted_at` (TIMESTAMPTZ, NULL).
  - `deleted_by` (UUID, NULL, FK -> `profiles.id`).
- **القيود:** `UNIQUE (session_id, trainee_id)`.
- **الفهارس:** `idx_attendance_trainee` on `(trainee_id, status)`.

#### 13. `exams` (الامتحانات الفصلية)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `group_id` (SMALLINT, NOT NULL, FK -> `groups.id`).
  - `term_id` (UUID, NOT NULL, FK -> `terms.id`).
  - `title` (VARCHAR(200), NOT NULL).
  - `max_score` (NUMERIC(5,2), NOT NULL): الدرجة العظمى المحددة من الإدارة.
  - `exam_date` (DATE, NOT NULL).
  - `created_by` (UUID, NOT NULL, FK -> `profiles.id`).
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `deleted_at` (TIMESTAMPTZ, NULL).
  - `deleted_by` (UUID, NULL, FK -> `profiles.id`).
- **القيود:** `UNIQUE (group_id, term_id)` (امتحان واحد فقط لكل فرقة في كل ترم).

#### 14. `exam_grades` (درجات امتحانات المتدربين)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `exam_id` (UUID, NOT NULL, FK -> `exams.id` ON DELETE CASCADE).
  - `group_id` (SMALLINT, NOT NULL, FK -> `groups.id`).
  - `trainee_id` (UUID, NOT NULL, FK -> `profiles.id`).
  - `numeric_score` (NUMERIC(5,2), NOT NULL): الدرجة المرصودة.
  - `percentage` (NUMERIC(5,2), NOT NULL): النسبة المئوية المحسوبة تلقائياً.
  - `appreciation_grade` (VARCHAR(30), NOT NULL): (ضعيف، مقبول، جيد، جيد جداً، ممتاز).
  - `graded_by` (UUID, NOT NULL, FK -> `profiles.id`).
  - `graded_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `deleted_at` (TIMESTAMPTZ, NULL).
  - `deleted_by` (UUID, NULL, FK -> `profiles.id`).
- **القيود:** `UNIQUE (exam_id, trainee_id)`.

#### 15. `marathons` (الماراثونات والمسابقات)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `group_id` (SMALLINT, NOT NULL, FK -> `groups.id`).
  - `term_id` (UUID, NOT NULL, FK -> `terms.id`).
  - `title` (VARCHAR(200), NOT NULL).
  - `description` (TEXT, NULL).
  - `total_score` (NUMERIC(5,2), NOT NULL, DEFAULT 100.00): 100 درجة ثابتة.
  - `start_date` (TIMESTAMPTZ, NOT NULL).
  - `end_date` (TIMESTAMPTZ, NOT NULL).
  - `is_active` (BOOLEAN, NOT NULL, DEFAULT TRUE).
  - `created_by` (UUID, NOT NULL, FK -> `profiles.id`).
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `deleted_at` (TIMESTAMPTZ, NULL).
  - `deleted_by` (UUID, NULL, FK -> `profiles.id`).

#### 16. `marathon_sections` (أقسام الماراثون)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `marathon_id` (UUID, NOT NULL, FK -> `marathons.id` ON DELETE CASCADE).
  - `title` (VARCHAR(150), NOT NULL).
  - `order_index` (INT, NOT NULL, DEFAULT 0).

#### 17. `marathon_questions` (أسئلة الماراثون)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `marathon_id` (UUID, NOT NULL, FK -> `marathons.id` ON DELETE CASCADE).
  - `section_id` (UUID, NULL, FK -> `marathon_sections.id` ON DELETE SET NULL).
  - `question_text` (TEXT, NOT NULL).
  - `question_type` (VARCHAR(20), NOT NULL): `MCQ`, `TRUE_FALSE`.
  - `score_weight` (NUMERIC(6,3), NOT NULL, DEFAULT 0): تحسب وتحدث آلياً كـ `(100.00 / total_questions)`.
  - `order_index` (INT, NOT NULL, DEFAULT 0).
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).

#### 18. `marathon_answers` (خيارات إجابات الأسئلة)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `question_id` (UUID, NOT NULL, FK -> `marathon_questions.id` ON DELETE CASCADE).
  - `answer_text` (TEXT, NOT NULL).
  - `is_correct` (BOOLEAN, NOT NULL, DEFAULT FALSE).
  - `order_index` (INT, NOT NULL, DEFAULT 0).

#### 19. `marathon_trainee_submissions` (تسليمات ونتائج الماراثون)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `marathon_id` (UUID, NOT NULL, FK -> `marathons.id` ON DELETE CASCADE).
  - `group_id` (SMALLINT, NOT NULL, FK -> `groups.id`).
  - `trainee_id` (UUID, NOT NULL, FK -> `profiles.id`).
  - `total_score` (NUMERIC(5,2), NOT NULL): مجموع الدرجات المحرزة من 100.
  - `appreciation_grade` (VARCHAR(30), NOT NULL): (ضعيف، مقبول، جيد، جيد جداً، ممتاز).
  - `submitted_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
- **القيود:** `UNIQUE (marathon_id, trainee_id)`.

#### 20. `marathon_trainee_answers` (تفاصيل إجابات المتدرب في الماراثون)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `submission_id` (UUID, NOT NULL, FK -> `marathon_trainee_submissions.id` ON DELETE CASCADE).
  - `question_id` (UUID, NOT NULL, FK -> `marathon_questions.id`).
  - `selected_answer_id` (UUID, NOT NULL, FK -> `marathon_answers.id`).
  - `is_correct` (BOOLEAN, NOT NULL).
  - `score_awarded` (NUMERIC(6,3), NOT NULL).

---

### 4.3 مجتمع الـ Feed والتفاعل والوسائط (Feed & Social Entities)

#### 21. `feed_posts` (المنشورات المجتمعية)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `author_id` (UUID, NOT NULL, FK -> `profiles.id`).
  - `content_text` (TEXT, NOT NULL).
  - `images_metadata` (JSONB, NOT NULL, DEFAULT '[]'::jsonb): مصفوفة كائنات الصور `[{url, width, height, size}]`.
  - `reactions_count` (INT, NOT NULL, DEFAULT 0).
  - `comments_count` (INT, NOT NULL, DEFAULT 0).
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `deleted_at` (TIMESTAMPTZ, NULL).
  - `deleted_by` (UUID, NULL, FK -> `profiles.id`).
- **الفهارس:** `idx_feed_posts_created` on `(created_at DESC) WHERE deleted_at IS NULL`.

#### 22. `post_comments` (التعليقات)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `post_id` (UUID, NOT NULL, FK -> `feed_posts.id` ON DELETE CASCADE).
  - `author_id` (UUID, NOT NULL, FK -> `profiles.id`).
  - `comment_text` (TEXT, NOT NULL).
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `deleted_at` (TIMESTAMPTZ, NULL).
  - `deleted_by` (UUID, NULL, FK -> `profiles.id`).
- **الفهارس:** `idx_post_comments_post` on `(post_id, created_at ASC) WHERE deleted_at IS NULL`.

#### 23. `reactions` (التفاعلات على المنشورات والتعليقات)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `target_type` (VARCHAR(10), NOT NULL): `POST` أو `COMMENT`.
  - `target_id` (UUID, NOT NULL).
  - `user_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE CASCADE).
  - `reaction_type` (VARCHAR(20), NOT NULL): `LIKE`, `LOVE`, `PRAY`, `AMEN`.
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
- **القيود:** `UNIQUE (target_type, target_id, user_id)`.
- **الفهارس:** `idx_reactions_target` on `(target_type, target_id)`.

---

### 4.4 الإشعارات والآيات (Notifications & Verses Entities)

#### 24. `notification_templates` (قوالب الإشعارات التلقائية)
- **الحقول:**
  - `id` (VARCHAR(50), PK): `PASTORAL_ABSENCE`, `BIRTHDAY_GREETING`, `BIRTHDAY_BROADCAST`.
  - `template_body` (TEXT, NOT NULL).
  - `updated_by` (UUID, NOT NULL, FK -> `profiles.id`).
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).

#### 25. `notifications` (الإشعارات وسجل التسليم)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `recipient_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE CASCADE).
  - `category` (VARCHAR(30), NOT NULL): `PASTORAL`, `BIRTHDAY`, `DAILY_VERSE`, `SYSTEM`.
  - `title` (VARCHAR(150), NOT NULL).
  - `body` (TEXT, NOT NULL).
  - `action_url` (TEXT, NULL).
  - `is_read` (BOOLEAN, NOT NULL, DEFAULT FALSE).
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
- **الفهارس:** `idx_notifications_recipient` on `(recipient_id, is_read, created_at DESC)`.

#### 26. `push_subscriptions` (اشتراكات Web Push Notifications)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `profile_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE CASCADE).
  - `endpoint` (TEXT, NOT NULL, UNIQUE).
  - `keys_p256dh` (TEXT, NOT NULL).
  - `keys_auth` (TEXT, NOT NULL).
  - `user_agent` (TEXT, NULL).
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).

#### 27. `daily_verses` (بنك الآيات اليومية)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `verse_text` (TEXT, NOT NULL).
  - `reference` (VARCHAR(100), NOT NULL): مثل "يوحنا 3: 16".
  - `display_order` (INT, NOT NULL, DEFAULT 0).
  - `is_sent` (BOOLEAN, NOT NULL, DEFAULT FALSE).
  - `last_sent_date` (DATE, NULL).
  - `created_by` (UUID, NOT NULL, FK -> `profiles.id`).
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `deleted_at` (TIMESTAMPTZ, NULL).
  - `deleted_by` (UUID, NULL, FK -> `profiles.id`).

#### 28. `daily_verse_dispatch_state` (حالة جدولة الآيات)
- **الحقول:**
  - `id` (SMALLINT, PK, DEFAULT 1): سجل أحادي Singleton.
  - `last_dispatch_date` (DATE, NULL).
  - `last_verse_id` (UUID, NULL, FK -> `daily_verses.id`).
  - `dispatch_mode` (VARCHAR(20), NOT NULL, DEFAULT 'SEQUENTIAL'): `SEQUENTIAL`, `RANDOM`.
  - `cycle_count` (INT, NOT NULL, DEFAULT 1).

---

### 4.5 المكتبة، المعرض والصوتيات (Media & Library Entities)

#### 29. `categories` (تصنيفات الكتب والأبحاث والمعرض)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `name` (VARCHAR(100), NOT NULL).
  - `type` (VARCHAR(20), NOT NULL): `BOOK`, `RESEARCH`, `GALLERY`.
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).

#### 30. `books` (الكتب والمراجع)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `group_id` (SMALLINT, NOT NULL, FK -> `groups.id`).
  - `category_id` (UUID, NOT NULL, FK -> `categories.id`).
  - `title` (VARCHAR(200), NOT NULL).
  - `author` (VARCHAR(150), NULL).
  - `file_url` (TEXT, NOT NULL).
  - `cover_url` (TEXT, NULL).
  - `file_size_bytes` (BIGINT, NOT NULL).
  - `created_by` (UUID, NOT NULL, FK -> `profiles.id`).
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `deleted_at` (TIMESTAMPTZ, NULL).
  - `deleted_by` (UUID, NULL, FK -> `profiles.id`).

#### 31. `researches` (الأبحاث والدراسات)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `group_id` (SMALLINT, NOT NULL, FK -> `groups.id`).
  - `category_id` (UUID, NOT NULL, FK -> `categories.id`).
  - `title` (VARCHAR(200), NOT NULL).
  - `author` (VARCHAR(150), NULL).
  - `file_url` (TEXT, NOT NULL).
  - `file_size_bytes` (BIGINT, NOT NULL).
  - `created_by` (UUID, NOT NULL, FK -> `profiles.id`).
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `deleted_at` (TIMESTAMPTZ, NULL).
  - `deleted_by` (UUID, NULL, FK -> `profiles.id`).

#### 32. `gallery_albums` (ألبومات المعرض)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `category_id` (UUID, NULL, FK -> `categories.id`).
  - `title` (VARCHAR(200), NOT NULL).
  - `description` (TEXT, NULL).
  - `cover_url` (TEXT, NULL).
  - `event_date` (DATE, NULL).
  - `created_by` (UUID, NOT NULL, FK -> `profiles.id`).
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `deleted_at` (TIMESTAMPTZ, NULL).
  - `deleted_by` (UUID, NULL, FK -> `profiles.id`).

#### 33. `gallery_items` (صور المعرض)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `album_id` (UUID, NOT NULL, FK -> `gallery_albums.id` ON DELETE CASCADE).
  - `image_url` (TEXT, NOT NULL).
  - `title` (VARCHAR(150), NULL).
  - `order_index` (INT, NOT NULL, DEFAULT 0).
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `deleted_at` (TIMESTAMPTZ, NULL).
  - `deleted_by` (UUID, NULL, FK -> `profiles.id`).

#### 34. `mp3_tracks` (مكتبة الصوتيات والمحاضرات الصوتية)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `group_id` (SMALLINT, NOT NULL, FK -> `groups.id`).
  - `title` (VARCHAR(200), NOT NULL).
  - `lecturer_id` (UUID, NULL, FK -> `lecturers.id`).
  - `audio_url` (TEXT, NOT NULL).
  - `duration_seconds` (INT, NOT NULL, DEFAULT 0).
  - `file_size_bytes` (BIGINT, NOT NULL).
  - `created_by` (UUID, NOT NULL, FK -> `profiles.id`).
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `deleted_at` (TIMESTAMPTZ, NULL).
  - `deleted_by` (UUID, NULL, FK -> `profiles.id`).

#### 35. `user_favorites` (المفضلة الشخصية)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `user_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE CASCADE).
  - `item_type` (VARCHAR(20), NOT NULL): `BOOK`, `RESEARCH`, `MP3`, `LECTURE`.
  - `item_id` (UUID, NOT NULL).
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
- **القيود:** `UNIQUE (user_id, item_type, item_id)`.

---

### 4.6 قاعدة بيانات الكتاب المقدس والتفاسير المحلية (Local Bible Database)

#### 36. `bible_testaments` (العهدين)
- **الحقول:**
  - `id` (SMALLINT, PK): `1` (العهد القديم)، `2` (العهد الجديد).
  - `code` (VARCHAR(10), NOT NULL, UNIQUE): `OT`, `NT`.
  - `name_ar` (VARCHAR(50), NOT NULL).
  - `order_index` (INT, NOT NULL).

#### 37. `bible_books` (أسفار الكتاب المقدس)
- **الحقول:**
  - `id` (SMALLINT, PK): 1 إلى 73 (وفق الأسفار القانونية الكاملة بموقع الأنبا تكلا).
  - `testament_id` (SMALLINT, NOT NULL, FK -> `bible_testaments.id`).
  - `code` (VARCHAR(20), NOT NULL, UNIQUE): مثل `GEN`, `MAT`, `REV`.
  - `name_ar` (VARCHAR(100), NOT NULL): اسم السفر ("تكوين", "متى", إلخ).
  - `chapters_count` (INT, NOT NULL).
  - `order_index` (INT, NOT NULL).
  - `source_url` (TEXT, NOT NULL): رابط صفحة السفر بموقع الأنبا تكلا.

#### 38. `bible_chapters` (الإصحاحات)
- **الحقول:**
  - `id` (INT, PK, DEFAULT gen_random_uuid()): أو متسلسل.
  - `book_id` (SMALLINT, NOT NULL, FK -> `bible_books.id`).
  - `chapter_number` (INT, NOT NULL).
  - `verses_count` (INT, NOT NULL).
  - `source_url` (TEXT, NOT NULL).
- **القيود:** `UNIQUE (book_id, chapter_number)`.

#### 39. `bible_verses` (الآيات)
- **الحقول:**
  - `id` (BIGINT, PK): معرف تسلسلي للآية.
  - `chapter_id` (INT, NOT NULL, FK -> `bible_chapters.id`).
  - `book_id` (SMALLINT, NOT NULL, FK -> `bible_books.id`).
  - `verse_number` (INT, NOT NULL).
  - `text_ar` (TEXT, NOT NULL): نص الآية بالعربية بالتشكيل.
  - `text_clean` (TEXT, NOT NULL): نص الآية بدون تشكيل لتسريع البحث.
  - `source_url` (TEXT, NOT NULL).
- **القيود:** `UNIQUE (book_id, chapter_id, verse_number)`.
- **الفهارس:** `idx_bible_verses_search` USING gin(to_tsvector('arabic', text_clean)).

#### 40. `bible_verse_words` (كلمات ومفردات الآيات للتفاعل)
- **الحقول:**
  - `id` (BIGINT, PK): معرف الكلمة.
  - `verse_id` (BIGINT, NOT NULL, FK -> `bible_verses.id` ON DELETE CASCADE).
  - `word_position` (INT, NOT NULL): ترتيب الكلمة داخل الآية (1, 2, 3...).
  - `word_text` (VARCHAR(100), NOT NULL): الكلمة كما وردت.
  - `clean_word` (VARCHAR(100), NOT NULL): الكلمة مجردة من التشكيل والزوائد.
  - `has_commentary` (BOOLEAN, NOT NULL, DEFAULT FALSE): مؤشر وجود شرح تفاعلي للكلمة.
- **الفهارس:** `idx_verse_words_verse` on `(verse_id, word_position)`.

#### 41. `bible_commentary_sources` (مصادر ومؤلفو التفاسير)
- **الحقول:**
  - `id` (VARCHAR(50), PK): مثل `TAKLA_GENERAL`, `FR_TADROS_MALATY`, `FR_ANTONIOS_FAKRY`.
  - `author_name` (VARCHAR(150), NOT NULL).
  - `source_name` (VARCHAR(200), NOT NULL).
  - `source_base_url` (TEXT, NOT NULL).
  - `description` (TEXT, NULL).

#### 42. `bible_verse_commentaries` (تفاسير الآيات)
- **الحقول:**
  - `id` (BIGINT, PK, DEFAULT gen_random_uuid()): أو متسلسل.
  - `verse_id` (BIGINT, NOT NULL, FK -> `bible_verses.id` ON DELETE CASCADE).
  - `source_id` (VARCHAR(50), NOT NULL, FK -> `bible_commentary_sources.id`).
  - `commentary_title` (VARCHAR(200), NULL).
  - `commentary_text` (TEXT, NOT NULL).
  - `source_url` (TEXT, NOT NULL): رابط التفسير الدقيق بموقع الأنبا تكلا.
- **الفهارس:** `idx_verse_commentary_verse` on `(verse_id, source_id)`.

#### 43. `bible_word_commentaries` (شروحات ومعاني الكلمات التفاعلية)
- **الحقول:**
  - `id` (BIGINT, PK): معرف الشرح.
  - `word_id` (BIGINT, NOT NULL, FK -> `bible_verse_words.id` ON DELETE CASCADE).
  - `source_id` (VARCHAR(50), NOT NULL, FK -> `bible_commentary_sources.id`).
  - `explanation_title` (VARCHAR(150), NULL).
  - `explanation_text` (TEXT, NOT NULL): الشرح التفسيري/اللغوي المنبثق عند النقر على الكلمة.
  - `source_url` (TEXT, NOT NULL).
- **الفهارس:** `idx_word_commentary_word` on `(word_id)`.

---

### 4.7 الإدارة، النسخ، الاستيراد والتدقيق (Admin, Backup & Audit Entities)

#### 44. `audit_logs` (سجل التدقيق غير القابل للتعديل)
- **الحقول:**
  - `id` (BIGINT, PK, GENERATED ALWAYS AS IDENTITY).
  - `actor_id` (UUID, NULL, FK -> `profiles.id`): المنفذ للعملية (NULL في العمليات التلقائية).
  - `actor_name` (VARCHAR(150), NOT NULL): اسم المنفذ المسجل لحظة العملية.
  - `actor_role` (VARCHAR(30), NOT NULL): دور المنفذ لحظة العملية.
  - `action` (VARCHAR(50), NOT NULL): `CREATE`, `UPDATE`, `SOFT_DELETE`, `RESTORE`, `HARD_DELETE`, `PERMISSION_CHANGE`, `GRADE_CHANGE`, `BULK_IMPORT`, `BACKUP_CREATE`, `RESTORE_EXECUTE`, `ROLLBACK`.
  - `entity_type` (VARCHAR(50), NOT NULL): اسم الجدول/الكيان المتأثر (`posts`, `attendance`, `profiles`, `exams`...).
  - `entity_id` (VARCHAR(100), NOT NULL): المعرف الفريد للكيان المتأثر.
  - `old_values` (JSONB, NULL): لقطة البيانات قبل التعديل.
  - `new_values` (JSONB, NULL): لقطة البيانات بعد التعديل.
  - `ip_address` (VARCHAR(45), NULL).
  - `user_agent` (TEXT, NULL).
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
- **الفهارس:**
  - `idx_audit_logs_actor` on `(actor_id)`.
  - `idx_audit_logs_entity` on `(entity_type, entity_id)`.
  - `idx_audit_logs_action_date` on `(action, created_at DESC)`.

#### 45. `backup_records` (سجل النسخ الاحتياطية)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `filename` (VARCHAR(200), NOT NULL).
  - `file_size_bytes` (BIGINT, NOT NULL).
  - `storage_type` (VARCHAR(20), NOT NULL): `HOSTINGER` أو `DOWNLOAD_ONLY`.
  - `storage_path` (TEXT, NULL): المسار الفيزيائي على Hostinger إذا خُزن هناك.
  - `status` (VARCHAR(20), NOT NULL): `COMPLETED`, `FAILED`.
  - `checksum_sha256` (VARCHAR(64), NOT NULL): التوقيع الرقمي للتحقق من سلامة الملف.
  - `created_by` (UUID, NOT NULL, FK -> `profiles.id`).
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).
  - `deleted_at` (TIMESTAMPTZ, NULL).
  - `deleted_by` (UUID, NULL, FK -> `profiles.id`).

#### 46. `import_history` (سجل الاستيراد الجماعي للمتدربين)
- **الحقول:**
  - `id` (UUID, PK, DEFAULT gen_random_uuid()).
  - `filename` (VARCHAR(200), NOT NULL).
  - `original_file_storage_path` (TEXT, NOT NULL): مسار حفظ الملف الأصلي على Hostinger للتحميل لاحقاً.
  - `file_size_bytes` (BIGINT, NOT NULL).
  - `total_rows` (INT, NOT NULL).
  - `new_accounts_count` (INT, NOT NULL).
  - `updated_accounts_count` (INT, NOT NULL).
  - `status` (VARCHAR(20), NOT NULL): `SUCCESS`, `FAILED`.
  - `error_details` (JSONB, NULL): تفاصيل الأخطاء في حال الفشل.
  - `created_by` (UUID, NOT NULL, FK -> `profiles.id`).
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()).

---

## 5. وصف العلاقات البيانية (Entity Relationship Description - ERD)

| الجدول الأصل (Parent Entity) | الجدول التابع (Child Entity) | نوع العلاقة (Cardinality) | الحقل الرابط (Foreign Key) | سبب العلاقة والغرض منها |
| :--- | :--- | :---: | :--- | :--- |
| `auth.users` | `profiles` | **1 : 1** | `profiles.id = auth.users.id` | ربط هوية المصادقة مع بيانات الحساب بالمنصة |
| `groups` | `profiles` | **1 : N** | `profiles.group_id` | انتماء كل مستخدم لفرقة دراسية واحدة فقط |
| `roles` | `profiles` | **1 : N** | `profiles.role_id` | تحديد الدور الرئيسي للمستخدم |
| `profiles` | `secretariats` | **1 : 1** | `secretariats.profile_id` | تعيين المستخدم في سكرتارية فرقة (بحد أقصى 3 للفرقة) |
| `profiles` | `servant_permissions`| **1 : N** | `servant_permissions.profile_id`| تفويض صلاحيات مستقلة متعددة للخادم |
| `groups` | `attendance_sessions`| **1 : N** | `attendance_sessions.group_id`| إنشاء جلسة حضور أسبوعية لكل فرقة |
| `attendance_sessions`| `attendance_records` | **1 : N** | `attendance_records.session_id`| رصد سجل حضور كل طالب في جلسة محددة |
| `groups` | `terms` | **1 : N** | `terms.group_id` | تقسيم المنهج الدراسي للفرقة إلى فصول دراسية |
| `terms` | `exams` | **1 : 1 (Per Group)**| `exams.term_id` | امتحان واحد فقط لكل فرقة في الفصل الدراسي |
| `exams` | `exam_grades` | **1 : N** | `exam_grades.exam_id` | درجات طلاب الفرقة في الامتحان |
| `marathons` | `marathon_questions` | **1 : N** | `marathon_questions.marathon_id`| أسئلة الماراثون وتوزيع الدرجات الـ 100 بالتساوي |
| `marathon_questions`| `marathon_answers` | **1 : N** | `marathon_answers.question_id`| خيارات الإجابة للسؤال (متعدد / صح وخطأ) |
| `marathons` | `marathon_trainee_submissions` | **1 : N** | `submissions.marathon_id` | نتائج وحساب درجات المتدربين في الماراثون |
| `feed_posts` | `post_comments` | **1 : N** | `post_comments.post_id` | تعليقات المجتمع على المنشور |
| `feed_posts` / `comments` | `reactions` | **1 : N (Polymorphic)** | `reactions.target_id` | تفاعلات المستخدمين على المنشورات والتعليقات |
| `bible_testaments` | `bible_books` | **1 : N** | `bible_books.testament_id` | تصنيف أسفار الكتاب المقدس (عهد قديم / جديد) |
| `bible_books` | `bible_chapters` | **1 : N** | `bible_chapters.book_id` | إصحاحات السفر |
| `bible_chapters` | `bible_verses` | **1 : N** | `bible_verses.chapter_id` | آيات الإصحاح |
| `bible_verses` | `bible_verse_words` | **1 : N** | `bible_verse_words.verse_id` | مفردات الآية للتفاعل والربط بالقاموس |
| `bible_verses` | `bible_verse_commentaries` | **1 : N** | `commentaries.verse_id` | التفاسير المعتمدة للآية من مصادر الأنبا تكلا |
| `bible_verse_words`| `bible_word_commentaries` | **1 : N** | `word_commentaries.word_id`| شروحات الكلمة المنبثقة عند النقر |

---

## 6. محرك الأدوار والصلاحيات (Roles & Permissions Engine)

### 6.1 هيكل الأدوار العامة (Global Roles)
1. `admin`: مسؤول النظام الأعلى (Singleton - صلاحيات مطلقة لكافة الفرق والوحدات).
2. `super_user`: المستخدم المتميز (Singleton - متطابق 100% مع المسؤول، باستثناء تعديل رسالة الافتقاد).
3. `secretariat`: سكرتارية الفرقة (صلاحيات إدارية كاملة محصورة بفرقتها الدراسية).
4. `servant`: خادم الفرقة (صلاحيات أساسية بالنشر والتفاعل + الصلاحيات المفوضة).
5. `trainee`: دارس / متدرب (تفاعل، قراءة، أداء ماراثونات، ومتابعة درجاته وحضوره فقط).

### 6.2 مصفوفة التحقق من الصلاحيات والـ Scope
```sql
-- وظيفة قاعدة البيانات للتحقق من امتلاك الصلاحية (Security Definer Function)
CREATE OR REPLACE FUNCTION public.has_permission(
    p_user_id UUID,
    p_permission_key VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    v_role VARCHAR;
BEGIN
    SELECT role_id INTO v_role FROM public.profiles WHERE id = p_user_id AND is_active = TRUE AND deleted_at IS NULL;
    
    -- المسؤول و Super User يملكون كافة الصلاحيات
    IF v_role IN ('admin', 'super_user') THEN
        RETURN TRUE;
    END IF;
    
    -- الخادم: التحقق من جدول الصلاحيات المفوضة
    IF v_role = 'servant' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.servant_permissions
            WHERE profile_id = p_user_id AND permission_id = p_permission_key
        );
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

```sql
-- وظيفة قاعدة البيانات للتحقق من تطابق الفرقة (Group Scope Guard)
CREATE OR REPLACE FUNCTION public.is_in_same_group(
    p_user_id UUID,
    p_target_group_id SMALLINT
) RETURNS BOOLEAN AS $$
DECLARE
    v_role VARCHAR;
    v_group SMALLINT;
BEGIN
    SELECT role_id, group_id INTO v_role, v_group 
    FROM public.profiles 
    WHERE id = p_user_id AND is_active = TRUE AND deleted_at IS NULL;
    
    IF v_role IN ('admin', 'super_user') THEN
        RETURN TRUE;
    END IF;
    
    RETURN v_group = p_target_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

---

## 7. مواصفات سياسات أمان البيانات (Supabase RLS Policies Specification)

### 7.1 جدول `profiles`
- **SELECT:**
  - متاح للجميع (Authenticated) لعرض أسماء وصور زملائهم وخدامهم في الـ Feed والتعليقات.
  - البيانات الحساسة (الهاتف، العنوان، تاريخ الميلاد) تُحجب عن المخدومين الآخرين وتظهر فقط للإدارة وسكرتارية/خدام نفس الفرقة وصاحب الحساب نفسه.
- **INSERT:**
  - مقتصر حصرياً على `admin` و `super_user` وعبر محرك الاستيراد الجماعي (Bulk Import Service Role).
- **UPDATE:**
  - صاحب الحساب: يستطيع تعديل الصورة الشخصية `avatar_url` وكلمة المرور فقط.
  - `admin` و `super_user`: تعديل كافة الحقول ونقل الفرق وتغيير الأدوار.
- **DELETE:**
  - يمنع الحذف الفيزيائي نهائياً. التحديث إلى `deleted_at = NOW()` متاح حصراً لـ `admin` و `super_user`.

### 7.2 جدول `feed_posts`
- **SELECT:**
  - متاح لجميع المستخدمين المسجلين (Authenticated) لجميع المنشورات غير المحذوفة (`deleted_at IS NULL`).
- **INSERT:**
  - مسموح فقط لـ: `admin`, `super_user`, `servant`, `secretariat`.
  - **ممنوع منعاً باتاً لـ `trainee`**.
- **UPDATE:**
  - مسموح لصاحب المنشور (`author_id = auth.uid()`) أو لـ `admin` / `super_user`.
- **DELETE (Soft Delete):**
  - مسموح لصاحب المنشور أو لـ `admin` / `super_user`.

### 7.3 جدول `post_comments`
- **SELECT:**
  - متاح لجميع المستخدمين المسجلين للمنشورات غير المحذوفة.
- **INSERT:**
  - متاح لجميع المستخدمين المسجلين بما فيهم `trainee`.
- **UPDATE:**
  - مسموح فقط لصاحب التعليق (`author_id = auth.uid()`).
- **DELETE (Soft Delete):**
  - مسموح لصاحب التعليق، أو لصاحب المنشور الأصلي المعلق عليه، أو لـ `admin` / `super_user`.

### 7.4 جدول `attendance_records`
- **SELECT:**
  - `admin`, `super_user`: وصول لجميع الفرق.
  - `secretariat`, `servant`: وصول لسجلات فرقتهم فقط (`group_id = user_group_id`).
  - `trainee`: وصول لسجلاته الشخصية فقط (`trainee_id = auth.uid()`).
- **INSERT / UPDATE:**
  - مسموح لـ `admin`, `super_user`، ولسكرتارية نفس الفرقة (`secretariat` مع مطابقة `group_id`).
  - **ممنوع منعاً باتاً من يوم الخميس (نافذة القفل الأسبوعي) إلا بأمر خاص**.
- **DELETE:**
  - `admin` و `super_user` فقط.

### 7.5 جدول `exams` و `exam_grades`
- **SELECT (Exams):**
  - متاح لجميع طلاب وخدام الفرقة المعنية والإدارة.
- **SELECT (Exam Grades):**
  - `admin`, `super_user`: الجميع.
  - الخادم المفوض بـ `GRADE_EXAMS`: درجات فرقته.
  - `trainee`: درجته الشخصية فقط.
- **INSERT / UPDATE (Exam Grades):**
  - `admin`, `super_user`، أو الخادم الحاصل على تفويض `GRADE_EXAMS` لفرقة الامتحان.

### 7.6 جدول `marathons`, `questions`, `submissions`
- **SELECT (Marathons & Questions):**
  - متاح لطلاب وخدام الفرقة التابع لها الماراثون والإدارة.
- **INSERT / UPDATE (Marathon & Questions):**
  - `admin`, `super_user`، أو الخادم المفوض بـ `MANAGE_MARATHON` لفرقته.
- **INSERT (Submissions):**
  - `trainee` التابع لنفس فرقة الماراثون لمرة واحدة فقط (`UNIQUE (marathon_id, trainee_id)`).
- **SELECT (Submissions):**
  - الإدارة والخادم المفوض: كافة التسليمات. المتدرب: تسليمه ودرجته الشخصية فقط.

### 7.7 جداول الكتاب المقدس والتفاسير (`bible_*`)
- **SELECT:**
  - `anon` (العامة قبل تسجيل الدخول) و `authenticated` (بعد تسجيل الدخول) لجميع الجداول.
- **INSERT / UPDATE / DELETE:**
  - محجوبة بالكامل عن كافة المستخدمين عبر الواجهة؛ تدار حصرياً من قِبل الـ Backend / Migration Scripts عبر `service_role`.

### 7.8 جدول `audit_logs` و `backup_records`
- **SELECT:**
  - مقتصر حصرياً على `admin` و `super_user`.
- **INSERT:**
  - عبر خادم PHP الخلفي باستخدام `service_role`.
- **UPDATE / DELETE:**
  - **ممنوع ومحجوب تماماً عن كافة الأدوار بما فيها المسؤول** (سجلات غير قابلة للتلاعب أو الحذف).

---

## 8. معمارية خادم PHP الخلفي على Hostinger (PHP Backend Architecture)

### 8.1 البنية الهيكلية للمجلدات (Directory Tree)
```text
/backend-api/
│
├── config/
│   ├── app.php                # إعدادات الخادم والبيئة
│   ├── supabase.php           # إعدادات الربط ومفاتيح Supabase Service Role
│   └── storage.php            # مسارات وإعدادات Hostinger Storage
│
├── src/
│   ├── Middleware/
│   │   ├── JwtAuthMiddleware.php       # فك وتدقيق توكن Supabase JWT
│   │   ├── RbacMiddleware.php          # فحص الأدوار والصلاحيات المفوضة
│   │   ├── GroupScopeMiddleware.php    # التحقق من نطاق الفرقة
│   │   ├── RateLimitMiddleware.php     # حماية Endpoints من الإغراق
│   │   └── FileSecurityMiddleware.php  # فحص نوع وحجم وامتدادات الملفات
│   │
│   ├── Controllers/
│   │   ├── AuthController.php          # التحقق من JWT وإرجاع الصلاحيات
│   │   ├── StorageController.php       # رفع وتنزيل وحذف الملفات
│   │   ├── BackupController.php        # توليد وتشفير وإدارة الـ ZIP
│   │   ├── RestoreController.php       # الاستعادة الذرية والـ Rollback
│   │   ├── ImportController.php        # الاستيراد الجماعي للمتدربين
│   │   └── ExportController.php        # تصدير ملفات Excel و PDF
│   │
│   ├── Services/
│   │   ├── SupabaseClient.php          # العميل الوسيط لـ Supabase REST/RPC
│   │   ├── ZipEncryptionService.php    # ضغط وفك تشفير AES-256 للنسخ
│   │   ├── ExcelParserService.php      # قراءة وفحص ملفات Excel/CSV
│   │   ├── AuditLogService.php         # تسجيل العمليات الحساسة
│   │   └── StorageBridgeService.php    # وسيط التعامل مع مساحة الملفات
│   │
│   └── Utils/
│       ├── Response.php                # توحيد استجابات JSON
│       └── Security.php                # فحص Magic Bytes وتوليد UUIDs
│
├── storage/                            # مساحة التخزين الفعلية المنظمة
│   ├── users/
│   ├── academic/
│   ├── backups/
│   │   ├── full/
│   │   └── pre_restore/
│   └── imports/history/
│
└── public/
    ├── index.php                       # نقطة الدخول الموحدة (Front Controller)
    └── .htaccess                       # حماية المجلدات وتوجيه الطلبات
```

### 8.2 خوارزمية التحقق من Supabase JWT
```php
<?php
// Middleware/JwtAuthMiddleware.php
namespace App\Middleware;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use App\Utils\Response;

class JwtAuthMiddleware {
    public static function authenticate(): array {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            Response::json(['error' => 'Unauthorized: Missing or invalid token'], 401);
            exit;
        }

        $jwt = $matches[1];
        $supabaseJwtSecret = getenv('SUPABASE_JWT_SECRET');

        try {
            // فك وتدقيق توكن Supabase المشفر
            $decoded = JWT::decode($jwt, new Key($supabaseJwtSecret, 'HS256'));
            
            // استخراج Claims الأساسية
            return [
                'user_id'  => $decoded->sub,
                'role'     => $decoded->app_metadata->role ?? 'trainee',
                'group_id' => $decoded->app_metadata->group_id ?? null,
                'claims'   => (array)$decoded
            ];
        } catch (\Exception $e) {
            Response::json(['error' => 'Unauthorized: ' . $e->getMessage()], 401);
            exit;
        }
    }
}
```

---

## 9. عقود واجهات البرمجة (API Endpoint Contracts)

### 9.1 وحدة المصادقة والتحقق (Authentication Module)
- **Endpoint:** `POST /api/auth/verify-session`
  - **Auth:** Bearer Supabase JWT.
  - **Response 200:**
    ```json
    {
      "status": "success",
      "data": {
        "user_id": "uuid-v4",
        "username": "girges_admin",
        "role": "admin",
        "group_id": 1,
        "permissions": ["MANAGE_LECTURES", "MANAGE_CURRICULUM", "MANAGE_MARATHON", "GRADE_EXAMS", "MANAGE_BOOKS"]
      }
    }
    ```

### 9.2 وحدة التخزين والملفات (Storage Module)
- **Endpoint:** `POST /api/storage/upload`
  - **Auth:** Bearer JWT (Roles: `admin`, `super_user`, `servant`, `secretariat`).
  - **Request:** `multipart/form-data` (`file`: binary, `folder_type`: 'users'|'feed'|'curriculum'|'lectures'|'mp3'|'books'|'research'|'gallery'|'general', `group_id`: 1|2|3, `user_role`: 'trainees'|'servants'|'secretariat'|'admins' (مطلوب عند `folder_type=users` فقط), `album_id`: 'general'|'gallery' (مطلوب عند `folder_type=gallery` فقط)).
  - **ملاحظة (2026-10-01):** `folder_type` متاح بحكم allowlist في `StorageController.php` (`$ALLOWED_FOLDERS`، 9 قيم). أي قيمة خارجها **ترد 400** ولا تُوجَّه لأي مجلد. القيمتان `lectures` و`general` كانتا خارج قاموس TD القديم؛ أُضيفتا لأن جداول الإنتاج فيهما فعلًا (`lectures.audio_url`، `gallery_items` + `gallery_albums.album_id`).
  - **Response 200:**
    ```json
    {
      "status": "success",
      "data": {
        "file_url": "https://storage.elkarooz-school.com/academic/group_1/curriculum/a1b2c3d4.pdf",
        "relative_path": "/academic/group_1/curriculum/a1b2c3d4.pdf",
        "file_size_bytes": 1048576,
        "mime_type": "application/pdf",
        "sha256": "checksum_hash"
      }
    }
    ```
- **Endpoint:** `DELETE /api/storage/delete`
  - **Auth:** Bearer JWT (`admin`, `super_user`).
  - **Request:** `{"file_path": "/academic/group_1/curriculum/a1b2c3d4.pdf"}`.

### 9.3 وحدة النسخ الاحتياطي (Backup Module)
- **Endpoint:** `POST /api/backup/create`
  - **Auth:** Bearer JWT (`admin`, `super_user` حصراً).
  - **Request:**
    ```json
    {
      "encryption_password": "UserEnteredStrongPassword!",
      "storage_option": "HOSTINGER" // أو "DOWNLOAD_ONLY"
    }
    ```
  - **Response 200 (HOSTINGER):**
    ```json
    {
      "status": "success",
      "data": {
        "backup_id": "uuid-v4",
        "filename": "elkarooz_backup_2026-09-26_14-30-00.zip",
        "file_size_bytes": 157286400,
        "checksum_sha256": "checksum_hash",
        "storage_path": "/backups/full/elkarooz_backup_2026-09-26_14-30-00.zip",
        "created_at": "2026-09-26T14:30:00Z"
      }
    }
    ```
- **Endpoint:** `GET /api/backup/list`
  - **Auth:** Bearer JWT (`admin`, `super_user`).
  - **Response 200:** قائمة بكافة النسخ مع الميتاداتا وحالة التخزين.
- **Endpoint:** `DELETE /api/backup/{backup_id}`
  - **Auth:** Bearer JWT (`admin`, `super_user` مع تأكيد صريح).

### 9.4 وحدة الاستعادة الذرية (Restore Module)
- **Endpoint:** `POST /api/backup/validate-zip`
  - **Auth:** Bearer JWT (`admin`, `super_user`).
  - **Request:** `multipart/form-data` (`backup_zip`: file) أو `{"backup_id": "uuid"}` + `{"encryption_password": "string"}`.
  - **Response 200 (Preview Summary):**
    ```json
    {
      "status": "success",
      "data": {
        "is_valid": true,
        "manifest": {
          "system_version": "2.0.0",
          "created_at": "2026-09-26T10:00:00Z",
          "db_size_bytes": 15420000,
          "files_count": 450,
          "files_total_size": 141866400,
          "tables_included": ["profiles", "posts", "attendance_records", "exams", "bible_verses"]
        },
        "available_restore_modes": ["FULL", "DATABASE_ONLY", "FILES_ONLY"]
      }
    }
    ```
- **Endpoint:** `POST /api/backup/restore`
  - **Auth:** Bearer JWT (`admin`, `super_user`).
  - **Request:**
    ```json
    {
      "backup_id": "uuid-or-temp-token",
      "encryption_password": "UserEnteredStrongPassword!",
      "restore_mode": "FULL",
      "confirm_execution": true
    }
    ```
  - **Response 200:** `{"status": "success", "message": "System restored successfully without errors."}`.

### 9.5 وحدة الاستيراد الجماعي للمتدربين (Bulk Import Module)
- **Endpoint:** `POST /api/import/trainees`
  - **Auth:** Bearer JWT (`admin`, `super_user` حصراً).
  - **Request:** `multipart/form-data` (`file`: Excel/CSV).
  - **Response 200 (Success):**
    ```json
    {
      "status": "success",
      "data": {
        "import_id": "uuid-v4",
        "total_rows": 120,
        "new_accounts_created": 35,
        "existing_accounts_updated": 85,
        "original_file_url": "https://storage.elkarooz-school.com/imports/trainees/history/import_123.xlsx"
      }
    }
    ```
  - **Response 422 (All-or-Nothing Validation Error):**
    ```json
    {
      "status": "error",
      "code": "IMPORT_VALIDATION_FAILED",
      "message": "تم إلغاء الاستيراد بالكامل بسبب وجود أخطاء في الملف. يرجى تصحيح الأخطاء وإعادة المحاولة.",
      "errors": [
        {"row": 14, "column": "GroupID", "value": "4", "error": "رقم الفرقة يجب أن يكون 1 أو 2 أو 3 فقط."},
        {"row": 29, "column": "BirthDate", "value": "1999-13-45", "error": "صيغة تاريخ الميلاد غير صحيحة."},
        {"row": 52, "column": "Username", "value": "", "error": "اسم المستخدم حقل إلزامي."}
      ]
    }
    ```

### 9.6 وحدة التصدير (Export Module)
- **Endpoint:** `POST /api/export/data`  
- **الصيغة:** CSV فقط في النسخة الحالية (رُصد أن Excel/PDF غير منفَّذين في مراجعة 2026-09-30).
  - **Auth:** Bearer JWT (حسب صلاحيات الدور ونطاق الفرقة).
  - **Request:** `{"entity": "attendance"|"grades"|"trainees", "group_id": 1, "format": "xlsx"|"csv"|"pdf", "filters": {}}`.
  - **Response 200:** Binary Stream مع `Content-Disposition: attachment`.

---

## 10. معمارية وهيكل التخزين على Hostinger (Hostinger Storage Architecture)

### 10.1 الهيكلية الشجرية للمجلدات (Folder Hierarchy)

> **تعديل 2026-10-01 — العزل بين المجموعات.** الأشجار في النسخة الأولى من هذه الوثيقة كانت
> تضع `feed/{year}/{month}` و`gallery/{album_id}` **من غير `group_N`**، وهو ما يجعل ملفات
> المجموعات الثلاث تشترك في نفس المجلد على القرص. ده يخالف مبدأ العزل (§4.1: «بيانات كل
> مجموعة ومستخدميها ومحتواها خاص بها») لأن الفصل بيكون منطقيًا في قاعدة البيانات فقط، بينما
> المسار المشترك يبقى قابلًا للافتراض بين المجموعات على مستوى الخادم. الشكل المطبَّق في
> `StorageController.php` يضيف `group_N` لكل مسار متاح للكتابة، وتُبقي الأشجار أدناه كمرجع
> للقارئ مع تصحيحها.
>
> **الشكل المطبَّق فعليًا** (مصدر الحقيقة: `scripts/verify_storage_routing_runtime.php`):
>
> | `folder_type` | المسار الفعلي |
> |---|---|
> | `curriculum` / `lectures` / `books` / `research` / `mp3` | `academic/group_{N}/{type}` |
> | `users` | `users/{user_role}/group_{N}` |
> | `feed` | `feed/group_{N}/{YYYY}/{MM}` |
> | `gallery` / `general` | `gallery/group_{N}/{album_id}` |
>
> **انحرافان متبقّيان عن هذه الشجرة، موثّقان في `CODE_REVIEW_2026-09-30.md`:**
> 1. `books` و`research` كانا في الشجرة على مستوى الجذر (`books/group_1/`)، والكود يرفعهما
>    تحت `academic/group_{N}/`. الشكل المطبَّق هو المختار (**قرار 2026-10-01**): توحيد
>    الملفات المرفوعة تحت `academic/` مع إبقاء `group_N` في المسار. تم التحقق أن **لا يوجد أي
>    ملف production على الشكل القديم** — انظر «التحقق من البيانات الموجودة» أدناه.
> 2. الشجرة تسمّي مجلد الصوتيات `audio_mp3`، والكود يرفعه `academic/group_{N}/mp3` مع
>    `lectures` مستقل. الشكل المطبَّق هو المختار؛ `audio_mp3` لم يُنشأ على القرص.
>
> ### التحقق من البيانات الموجودة (2026-10-01)
>
> قبل تثبيت الشكل المطبَّق، فُحصت كل الأعمدة الحاملة لمسارات ملفات على الإنتاج
> (`gallery_items.image_url`، `post_images.storage_path/image_url`، `gallery_albums.cover_url`،
> `books.file_url/cover_url`، `curriculums.file_url`، `lectures.audio_url`،
> `mp3_tracks.audio_url`، `researches.file_url`، `profiles.avatar_url`،
> `lecturers.avatar_url`، `import_history.original_file_storage_path`).
>
> **النتيجة: صفر مراجع على أي شكل قديم.**
>
> | الفحص | العدد |
> |---|---|
> | `books/group_` (الجذر) | **0** |
> | `research/group_` (الجذر) | **0** |
> | `feed/{YYYY}/{MM}/` (بلا group) | **0** |
> | `gallery/{album}` (بلا group) | **0** |
> | `academic/group_` (الشكل الجديد) | 8 — كلها `curriculums.file_url` Demo |
> | مسارات خارج نظام EL KAROOZ | 71 (روابط خارجية / Bible / غير مرتبطة بتخطيط التخزين) |
> | `post_images.storage_path` | 10 — كلها `feed/{post_id}_{idx}.jpg`، تُكتب من الواجهة لا من `StorageController` |
>
> **خلاصة:** **لا حاجة لهجرة ملفات.** الخطر الأكبر في التقرير الأصلي («أي ملفات مرفوعة قبل
> التغيير تبقى في مسار قديم») **غير مُثبت على الإنتاج** — الاستعلام أعلاه هو سبب اعتماد الشكل
> المطبَّق وتحديث الـ TD عليه، وليس العكس.

```text
/hostinger_storage_root/
│
├── users/
│   ├── trainees/
│   │   ├── group_1/
│   │   ├── group_2/
│   │   └── group_3/
│   ├── servants/
│   ├── secretariat/
│   └── lecturers/
│
├── feed/
│   └── group_{N}/              # ← مُضاف: العزل بين المجموعات
│       └── {year}/
│           └── {month}/
│
├── academic/
│   ├── group_1/
│   │   ├── curriculum/
│   │   ├── lectures/
│   │   └── mp3/                # ← كان audio_mp3 في الشجرة الأولى
│   ├── group_2/
│   │   ├── curriculum/
│   │   ├── lectures/
│   │   └── mp3/
│   └── group_3/
│       ├── curriculum/
│       ├── lectures/
│       └── mp3/
│
├── books/                      # مُستخدَم كـ folder_type داخل academic/ لا كجذر مستقل
│   ├── group_1/
│   ├── group_2/
│   └── group_3/
│
├── research/                   # مُستخدَم كـ folder_type داخل academic/ لا كجذر مستقل
│   ├── group_1/
│   ├── group_2/
│   └── group_3/
│
├── gallery/
│   └── group_{N}/              # ← مُضاف: العزل بين المجموعات
│       └── {album_id}/
│
├── backups/
│   ├── full/                   # النسخ الدائمة المشفرة (حذف يدوي فقط بتأكيد)
│   └── pre_restore/            # النسخ الوقائية قبل الاستعادة
│
└── imports/
    └── trainees/
        └── history/            # الملفات الأصلية لعمليات الاستيراد (غير قابلة للحذف)
```

### 10.2 قواعد تسمية وأمان الملفات
1. **توليد الأسماء:** كافة الملفات المرفوعة يتم استبدال اسمها الأصلي بـ UUIDv4 فريد مع الحفاظ على الامتداد بعد تدقيقه (مثال: `e7b1a9f0-281b-4d3b-9e4a-9b7123456789.webp`).
2. **فحص الـ MIME و Magic Bytes:** الفحص لا يعتمد على امتداد الملف فقط، بل على فحص البايتات الأولى للترويسة (Magic Bytes) عبر `finfo_file()` لمنع رفع ملفات تنفيذية ملغمة (`.php`, `.exe`, `.sh`).
3. **الحدود القصوى للأحجام (Size Caps):**
   - الصور الشخصية ومعرض الصور: بحد أقصى `10 MB` (يتم ضغطها وتحويلها لـ WebP).
   - ملفات الكتب والأبحاث والمناهج (PDF): بحد أقصى `50 MB`.
   - التسجيلات الصوتية (MP3): بحد أقصى `150 MB`.
   - ملفات النسخ الاحتياطي (ZIP): بدون حد أقصى (مدارة بنظام التجزئة عند الحاجة).

---

## 11. معمارية النسخ الاحتياطي الشامل (Backup Architecture)

### 11.1 مكونات ومحتوى ملف الـ ZIP المشفر
```text
elkarooz_backup_2026-09-26_14-30-00.zip (Encrypted AES-256)
│
├── manifest.json               # وثيقة البيانات الوصفية، الإصدار، والتوقيع الرقمي
├── database_dump.sql           # كامل قاعدة بيانات PostgreSQL (الهيكل والبيانات)
└── files/                      # كامل ملفات مساحة Hostinger Storage
    ├── users/
    ├── feed/
    ├── academic/
    ├── books/
    ├── research/
    └── gallery/
```

### 11.2 مواصفات ملف `manifest.json`
```json
{
  "system_name": "EL KAROOZ School",
  "system_version": "2.0.0",
  "backup_id": "uuid-v4",
  "created_at": "2026-09-26T14:30:00Z",
  "created_by_user_id": "uuid-admin-id",
  "db_engine": "PostgreSQL 15+",
  "database_tables_count": 46,
  "files_count": 1280,
  "total_uncompressed_bytes": 358400000,
  "checksums": {
    "database_dump_sha256": "hash...",
    "manifest_sha256": "hash..."
  }
}
```

---

## 12. معمارية الاستعادة الذرية (Restore Architecture)

### 12.1 المخطط الانسيابي لمراحل الاستعادة
```text
[1. رفع / اختيار ملف ZIP]
          │
          ▼
[2. فحص سلامة الملف وفك التشفير بكلمة المرور المدخلة]
          │
          ▼
[3. قراءة وفحص manifest.json ومطابقة توافق إصدار النظام]
          │
          ▼
[4. عرض شاشة المعاينة التلخيصية للمسؤول وطلب التأكيد الصريح]
          │
          ▼
[5. إنشاء النسخة الوقائية التلقائية Pre-Restore Safety Backup]
          │
          ▼
[6. فتح معاملة قاعدة البيانات (BEGIN TRANSACTION)]
          │
          ▼
[7. استعادة وتفريغ جداول PostgreSQL]
          │
          ▼
[8. استبدال وتزامن ملفات التخزين بنمط Staging Directory]
          │
          ├───────────────────────────────┐
          ▼ (نجاح تام 100%)              ▼ (حدوث أي فشل)
[9. تثبيت المعاملة (COMMIT)]       [9. إلغاء المعاملة (ROLLBACK)]
          │                               │
          ▼                               ▼
[10. اعتماد ملفات التخزين]         [10. استرجاع الـ Safety Backup تلقائياً]
          │                               │
          ▼                               ▼
[11. تسجيل النجاح في Audit Log]   [11. تسجيل الفشل والـ Rollback في Audit Log]
```

---

## 13. منطق التراجع التلقائي للأمان (Atomic Rollback Mechanism)

لتحقيق السلوك الذري الشامل عبر قاعدة البيانات وملفات التخزين الفيزيائية معاً:
1. **آلية تخزين الملفات المرحلية (Staging Area):** يتم فك ضغط ملفات النسخة في مجلد مؤقت معزول `/storage_staging/`.
2. **عزل التخزين الحي (Atomic Directory Swap):**
   - عند نجاح استعادة قاعدة البيانات داخل المعاملة، يُعاد تسمية المجلد الحي الحالي إلى `/storage_old_safety/`.
   - يتم نقل `/storage_staging/` ليصبح المجلد الحي `/storage/`.
3. **في حالة حدوث أي خطأ (On Failure / Exception):**
   - يتم التراجع الفوري عن معاملة قاعدة البيانات (`ROLLBACK`).
   - يُعاد المجلد `/storage_old_safety/` فوراً ليكون المجلد الحي `/storage/`.
   - يتم حذف مجلد `/storage_staging/`.
   - يتم استرجاع وتطبيق الـ `Pre-Restore Safety Backup` للتأكد التام من استقرار وتناسق النظام بنسبة 100%.

---

## 14. معمارية الاستيراد الجماعي للمتدربين (Bulk Import Architecture)

### 14.1 الأعمدة المعتمدة في ملف Excel / CSV
| اسم العمود بالإنجليزية | اسم العمود بالعربية | النوع (Type) | إلزامي؟ | شروط وقواعد التحقق (Validation Rules) |
| :--- | :--- | :--- | :---: | :--- |
| `Username` | اسم المستخدم | String | **نعم** | فريد، حروف إنجليزية وأرقام ونقاط فقط، بدون مسافات |
| `Password` | كلمة المرور | String | **نعم** | لا تقل عن 6 خانات، تشفر بـ bcrypt وتخزن بـ Supabase Auth |
| `FullName` | الاسم الكامل | String | **نعم** | نص ثلاثي أو رباعي بالعربية |
| `GroupID` | رقم الفرقة | Integer | **نعم** | قيمة محصورة بين (1, 2, 3) فقط |
| `BirthDate` | تاريخ الميلاد | Date (YYYY-MM-DD) | **نعم** | تاريخ ميلاد صحيح |
| `Phone` | رقم الهاتف | String | لا | صيغة هاتف صحيحة |
| `Address` | العنوان | String | لا | نص اختياري |
| `Church` | الكنيسة | String | لا | اسم كنيسة المستخدم |
| `ConfessionFather`| أب الاعتراف | String | لا | اسم أب الاعتراف |

### 14.2 استراتيجية التنفيذ الذري والإلغاء الشامل (All-or-Nothing Execution)
```php
// خوارزمية معالجة الاستيراد الجماعي في PHP
public function processImport(string $filePath, string $adminId): array {
    $rows = ExcelParser::parse($filePath);
    $errors = [];
    
    // 1. فحص شامل لكافة الصفوف أولاً قبل تنفيذ أي تعديل
    foreach ($rows as $index => $row) {
        $rowNumber = $index + 2; // تخطي الترويسة
        $rowErrors = Validator::validateTraineeRow($row);
        if (!empty($rowErrors)) {
            $errors[] = ['row' => $rowNumber, 'errors' => $rowErrors];
        }
    }

    // إذا وُجد أي خطأ في أي صف -> إلغاء تام للعملية وإرجاع الأخطاء
    if (!empty($errors)) {
        return ['status' => 'FAILED', 'errors' => $errors];
    }

    // 2. إذا كان الملف سليم 100% -> تنفيذ الإنشاء والتحديث
    $createdCount = 0;
    $updatedCount = 0;

    foreach ($rows as $row) {
        if ($this->userExists($row['Username'])) {
            $this->updateExistingTrainee($row);
            $updatedCount++;
        } else {
            $this->createNewTraineeAccount($row);
            $createdCount++;
        }
    }

    // 3. حفظ نسخة من الملف الأصلي في سجل الاستيراد الدائم
    $savedPath = $this->archiveOriginalImportFile($filePath);
    
    // 4. تسجيل العملية في Audit Log
    AuditLogger::log($adminId, 'BULK_IMPORT', 'profiles', 'bulk', [
        'new' => $createdCount,
        'updated' => $updatedCount,
        'file_path' => $savedPath
    ]);

    return [
        'status' => 'SUCCESS',
        'new_accounts' => $createdCount,
        'updated_accounts' => $updatedCount
    ];
}
```

---

## 15. معمارية تصدير البيانات (Export Architecture)

- **الاستقلالية:** محرك التصدير منفصل تماماً عن النسخ الاحتياطي ومصمم لتوليد تقارير تشغيلية للمستخدمين.
- **التوافق مع الصلاحيات ونطاق الفرقة:**
  - **المسؤول (Admin) و Super User فقط:** الطلبات من بقية الأدوار تُرفض بـ `403` قبل إصدار أي استعلام لقاعدة البيانات.
  - `admin`: إمكانية تصدير بيانات فرقة محددة أو كافة الفرق مجمعة.
  - `super_user`: وصول عالمي، ويصدّر كل المجموعات بلا تضييق.
  - `secretariat` / `servant` / `trainee`: **مرفوضة صراحةً** — لا تضييق صامت لبيانات الفرق.
  > **قرار تجاري — 2026-09-30:** يحل تعارضًا مع نصّ TD السابق الذي كان يفرض `WHERE group_id = user_group_id` للخدام والسكرتارية.
- **المكتبات المستخدمة:**
  - `PhpSpreadsheet` لتوليد ملفات Excel (.xlsx) و CSV بجداول منسقة وتجميد الصف الأول وعناوين عربية.
  - `mPDF / Dompdf` لتوليد تقارير PDF متوافقة تماماً مع النصوص العربية واتجاه RTL.

---

## 16. معمارية سجل التدقيق والمراقبة (Audit Log Architecture)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           سجل التدقيق (Audit Log Schema)                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│ • log_id: BIGINT (Identity PK)                                                  │
│ • actor_id: UUID (Foreign Key -> profiles.id)                                   │
│ • actor_name: VARCHAR(150) (Snapshotted at execution)                           │
│ • actor_role: VARCHAR(30) (Snapshotted at execution)                            │
│ • action: VARCHAR(50) (CREATE, UPDATE, SOFT_DELETE, RESTORE, HARD_DELETE, ...)  │
│ • entity_type: VARCHAR(50) (posts, comments, attendance, exams, grades, ...)    │
│ • entity_id: VARCHAR(100)                                                       │
│ • old_values: JSONB (Snapshot before alteration)                                │
│ • new_values: JSONB (Snapshot after alteration)                                 │
│ • ip_address: VARCHAR(45)                                                       │
│ • user_agent: TEXT                                                              │
│ • created_at: TIMESTAMPTZ (UTC)                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```
- **الحماية:** غير قابل للتعديل أو الحذف برمجياً عبر RLS ومنع صلاحيات UPDATE/DELETE على الجدول.
- **استثناء تسجيل الدخول والخروج:** عمليات Login/Logout مستثناة من التسجيل لتقليل الضغط وحفظ السجل للعمليات التغييرية الحساسة.

---

## 17. معمارية الحذف المؤقت والاسترجاع (Soft Delete Architecture)

```
[حذف عنصر] ──► [تحديث deleted_at = NOW() و deleted_by = auth.uid()]
                      │
                      ▼
[إخفاء العنصر تلقائياً من الاستعلامات العادية عبر RLS: WHERE deleted_at IS NULL]
                      │
                      ▼
[ظهور العنصر في سلة المحذوفات للإدارة مع عداد تنازلي: متبقي (60 - أيام الحذف)]
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
[استرجاع فردي أو جماعي]       [مرور 60 يوماً]
        │                           │
        ▼                           ▼
[تصفير deleted_at و deleted_by] [مهمة مجدولة يومية: الحذف النهائي Hard Delete]
[إعادة العنصر لحالته الأصلية]   [حذف السجل نهائياً + حذف الملف الفيزيائي من Hostinger]
                                    │
                                    ▼
                        [تسجيل الحذف النهائي في Audit Log]
```

---

## 18. معمارية محرك الإشعارات (Notifications Architecture)

```
                                    ┌────────────────────────────────────┐
                                    │     محرك الإشعارات الموحد          │
                                    └─────────────────┬──────────────────┘
                                                      │
                       ┌──────────────────────────────┼──────────────────────────────┐
                       ▼                              ▼                              ▼
             ┌───────────────────┐          ┌───────────────────┐          ┌───────────────────┐
             │ 1. إشعار الافتقاد │          │ 2. أعياد الميلاد  │          │  3. الآيات اليومية│
             └─────────┬─────────┘          └─────────┬─────────┘          └─────────┬─────────┘
                       │                              │                              │
         [حدث غياب في كشف الحضور]       [مهمة Cron يومية 08:00 AM]     [مهمة Cron يومية 07:00 AM]
                       │                              │                              │
         [توليد بالاسم {{student}}]     [فحص مطابقة اليوم والشهر]      [فحص جدول يوم إرسال / يوم راحة]
                       │                              │                              │
         [توجيه: للطالب + خدام         [توجيه: تهنئة لصاحب العيد      [توجيه: آية موحدة لكافة]
          وسكرتارية فرقته متزامناً]      + إشعار لكافة المستخدمين]      [المستخدمين ترتيبي/عشوائي]
                       │                              │                              │
                       └──────────────────────────────┼──────────────────────────────┘
                                                      │
                                                      ▼
                                       ┌──────────────────────────────┐
                                       │   قنوات التسليم المتزامنة    │
                                       ├──────────────────────────────┤
                                       │ 1. حفظ في جدول notifications │
                                       │ 2. بث لحظي عبر Realtime WSS │
                                       │ 3. إرسال Push Notification   │
                                       │    عبر Web Push (VAPID)     │
                                       └──────────────────────────────┘
```

---

## 19. معمارية قسم الكتاب المقدس والتفاسير (Local Bible Architecture)

### 19.1 التسلسل الهرمي للبيانات المحلية
```text
bible_testaments (1=العهد القديم, 2=العهد الجديد)
   └── bible_books (1 إلى 73 سفر مع التوثيق والمصدر)
        └── bible_chapters (الإصحاحات)
             └── bible_verses (نصوص الآيات المشكولة والمجردة)
                  ├── bible_verse_commentaries (التفاسير المرتبطة بالآية + Source URL)
                  └── bible_verse_words (كلمات ومفردات الآية)
                       └── bible_word_commentaries (شروحات الألفاظ التفاعلية المنبثقة)
```

### 19.2 منطق التفاعل في الواجهة (Interactive Word Lookup)
1. يتم تحميل نص الآية ومفرداتها عبر استعلام موحد يربط `bible_verses` بـ `bible_verse_words`.
2. الكلمات التي تحمل `has_commentary = true` تظهر بخط مميز (Dotted Underline أو لون تفاعلي).
3. عند نقر المستخدم على الكلمة:
   - يفتح Modal / Bottom Sheet سريع يجلب الشرح التفسيري من `bible_word_commentaries` فورياً مع عرض المصدر ورابط موقع الأنبا تكلا `Source URL`.
4. البحث النصي: استعلام نصي سريع ومفهرس ضد حقل `text_clean` وتفاسير الآيات.

---

## 20. المعمارية الأمنية الشاملة (Security Architecture)

1. **حماية التوكنات (JWT Security):** توكنات Supabase موقعة بخوارزمية `HS256` مع مدة صلاحية محددة وتجديد آلي بالخلفية عبر Refresh Token المخزن في `HttpOnly Secure SameSite=Lax` Cookie.
2. **عزل الصلاحيات المزدوج (Dual-Layer Authorization):**
   - الطبقة الأولى: RLS على قاعدة البيانات لاستعلامات القراءة والمزامنة المباشرة.
   - الطبقة الثانية: Middleware على خادم PHP للتحقق من هوية المنفذ وصلاحياته قبل تنفيذ أي عملية ملفات أو نسخ أو استيراد.
3. **تشفير النسخ الاحتياطية (AES-256 Encryption):** ملفات ZIP الاحتياطية مشفرة بكلمة مرور يدوية يدخلها المسؤول ولا يقوم النظام بحفظها في قاعدة البيانات نهائياً.
4. **حماية التخزين والـ Web Shells:** منع تنفيذ أي ملفات برمجية داخل مجلدات التخزين بتعطيل PHP Execution عبر `.htaccess`:
   ```apache
   # حماية مجلدات التخزين من تنفيذ السكريبتات
   <FilesMatch "\.(php|phtml|php3|php4|php5|php7|phps|cgi|pl|py)$">
       Order Deny,Allow
       Deny from all
   </FilesMatch>
   ```

---

## 21. عزل بيانات الفرق (Data Isolation & Year Scope)

- **عزل المخدومين:** كل مخدوم مقيد بفرقته الدراسية المسجلة بـ `profiles.group_id`. لا يستطيع استعراض محاضرات أو مناهج أو ماراثونات أو كشوف حضور الفرق الأخرى.
- **عزل السكرتارية:** تقتصر صلاحيات رصد وتعديل الحضور على طلاب فرقتهم فقط.
- **عزل الخدام:** تقتصر صلاحيات الخادم الأساسية والمفوضة على فرقة الخادم التابع لها.
- **شمولية الإدارة:** المسؤول و Super User هما الفئة الوحيدة التي تملك صلاحية الوصول والتبديل والإشراف على كافة الفرق.

---

## 22. استراتيجية معالجة واستجابة الأخطاء (Error Handling Strategy)

توحيد بنية استجابة الأخطاء عبر كافة الـ APIs لضمان تجربة مستخدم واضحة:
```json
{
  "status": "error",
  "code": "ERROR_CODE_IDENTIFIER",
  "message": "رسالة الخطأ باللغة العربية الواضحة للمستخدم",
  "details": null,
  "timestamp": "2026-09-26T14:30:00Z"
}
```
- **رموز الاستجابة القياسية:**
  - `400 Bad Request`: بيانات غير صالحة أو غير مكتملة.
  - `401 Unauthorized`: توكن غير صالح أو منتهي.
  - `403 Forbidden`: المستخدم لا يمتلك الصلاحية أو خارج نطاق فرقته.
  - `404 Not Found`: العنصر غير موجود أو محذوف مؤقتاً.
  - `422 Unprocessable Entity`: فشل فحص الاستيراد (مع قائمة الأخطاء التفصيلية).
  - `500 Internal Server Error`: خطأ داخلي في الخادم مسجل في السجلات.

---

## 23. المراقبة وسجلات التشغيل (Monitoring & Logging)

1. **سجلات التطبيق الخلفي (PHP Error & Access Logs):** تسجيل الأخطاء البرمجية واستثناءات فك التشفير ورفع الملفات في مسار محمي `/backend-api/logs/app_{date}.log`.
2. **سجلات تدقيق العمليات (Database Audit Trail):** استعلامات وعمليات المستخدمين الحساسة مخزنة ومفهرسة في جدول `audit_logs` في Supabase.
3. **مراقبة الاتصال بالأجهزة:** متابعة فشل إرسال إشعارات Web Push وحذف الاشتراكات المنتهية (Dead Subscriptions) تلقائياً عند استلام رمز `410 Gone`.

---

## 24. معمارية النشر والبيئات (Deployment Architecture)

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          PRODUCTION DEPLOYMENT                         │
├────────────────────────────────┬───────────────────────────────────────┤
│ Frontend Hosting               │ Vercel / Node.js Host                 │
│ Framework & Build              │ Next.js 14+ (App Router) PWA          │
│ Domain & SSL                   │ Cloudflare CDN / SSL TLS 1.3          │
├────────────────────────────────┼───────────────────────────────────────┤
│ Backend API & Storage          │ Hostinger Cloud / Web Hosting         │
│ Runtime                        │ PHP 8.2+ FastCGI + Apache/Nginx       │
│ Physical Storage Root          │ /home/user/public_html/storage/       │
├────────────────────────────────┼───────────────────────────────────────┤
│ Database, Auth & Realtime      │ Supabase Cloud Platform (Managed)     │
│ Database Engine                │ PostgreSQL 15+                        │
└────────────────────────────────┴───────────────────────────────────────┘
```

---

## 25. مصفوفة المخاطر الفنية واستراتيجيات تفاديها (Technical Risks & Mitigation)

| المخاطر الفنية (Technical Risk) | مستوى التأثير | استراتيجية التفادي المعتمدة (Mitigation Strategy) |
| :--- | :---: | :--- |
| انقطاع الاتصال أثناء استعادة النسخ الاحتياطية | **حرج (Critical)** | تطبيق **معمارية الاستعادة الذرية (Atomic Restore)** مع النسخة الوقائية والـ Rollback التلقائي المعزول. |
| رفع ملفات تنفيذية خبيثة في المرفقات | **عالي (High)** | فحص البايتات السحرية (Magic Bytes)، إعادة التسمية بـ UUID، وتعطيل تنفيذ السكريبتات عبر `.htaccess`. |
| محاولة التلاعب بالصلاحيات من الواجهة الأمامية | **عالي (High)** | عدم الاعتماد على الواجهة وفحص Supabase JWT وسياسات RLS وقواعد PHP Middleware عند كل طلب. |
| فقدان كلمة مرور النسخة الاحتياطية المشفرة | **متوسط (Medium)** | توضيح وإلزام المسؤول بتأكيد حفظ كلمة المرور مع تنبيهه بأن النظام لا يخزنها نهائياً. |
| أخطاء في ملف استيراد المتدربين الجماعي | **متوسط (Medium)** | تطبيق **قاعدة الرفض الشامل (All-or-Nothing)**؛ أي خطأ في أي صف يوقف العملية بالكامل مع تقرير أخطاء مرقم. |

---

## 26. الاعتماديات البرمجية والحزم (Implementation Dependencies)

### 26.1 بيئة الواجهة الأمامية (Frontend - Next.js)
- `next`: 14.2+
- `react`, `react-dom`: 18.3+
- `@supabase/supabase-js`: 2.45+
- `@supabase/ssr`: 0.4+
- `@tanstack/react-query`: 5.50+
- `tailwindcss`, `lucide-react`: Latest
- `xlsx`: قراءة وتصدير ملفات Excel على العميل
- `framer-motion`: حركات تفاعلية سلسة
- `zod`: فحص وتدقيق المدخلات على مستوى النماذج والواجهات

### 26.2 بيئة الخادم الخلفي (Backend - PHP on Hostinger)
- `PHP`: >= 8.2
- `firebase/php-jwt`: فك وتدقيق توكنات JWT
- `phpoffice/phpspreadsheet`: معالجة وتدقيق ملفات Excel و CSV
- `mpdf/mpdf`: توليد وتصدير ملفات PDF باللغة العربية
- `ext-zip`, `ext-openssl`, `ext-fileinfo`, `ext-pdo_pgsql`, `ext-curl`: إضافات PHP الأساسية

---

## 27. الترتيب التسلسلي للتنفيذ (Implementation Order & Roadmap)

```text
المرحلة 1: بناء قاعدة البيانات في Supabase (Database Schema & Migration Scripts)
  ├── تنفيذ الجداول، العلاقات، القيود، والفهارس
  ├── إعداد وتفعيل سياسات الأمان RLS لكافة الجداول
  └── تضمين وفهرسة بيانات ونصوص وتفاسير الكتاب المقدس وقاموس الألفاظ

المرحلة 2: بناء خادم PHP Backend على Hostinger (Backend API & Storage Bridge)
  ├── إعداد Middleware للتحقق من Supabase JWT والصلاحيات وعزل الفرق
  ├── بناء وحدة التخزين وإدارة الملفات والأمان
  ├── بناء محرك النسخ الاحتياطي المشفر والاستعادة الذرية والـ Rollback
  └── بناء محرك الاستيراد الجماعي للمتدربين وقاعدة الرفض الشامل

المرحلة 3: بناء تطبيق Next.js والواجهات التفاعلية (Frontend & PWA Integration)
  ├── إعداد نظام المصادقة، الجلسات، والـ Middleware
  ├── بناء صفحات مجتمع الـ Feed، المنشورات، التفاعلات، والتعليقات الحية
  ├── بناء وحدات الحضور والغياب، المناهج، المحاضرات، الامتحانات، والماراثون
  ├── بناء مستكشف الكتاب المقدس التفاعلي وقاموس الألفاظ المنبثق
  ├── بناء لوحات تحكم الإدارة: سلة المحذوفات، سجل التدقيق، النسخ الاحتياطي، والاستيراد
  └── تفعيل Service Worker و PWA و Web Push Notifications

المرحلة 4: الاختبارات الشاملة وضمان الجودة (QA & Verification)
  ├── اختبارات أمان RLS وعزل الفرق
  ├── اختبارات ذرية النسخ والاستعادة والـ Rollback
  └── اختبارات الاستيراد الجماعي وسيناريوهات الخطأ
```

---

## 28. قائمة التحقق والاعتماد للتصميم الفني (Technical Design Approval Checklist)

- [x] **تغطية كافة الكيانات والجداول:** 46 جدولاً وقيداً وفهرساً تغطي 100% من متطلبات SRS المعتمدة.
- [x] **مواصفات سياسات RLS:** مكتوبة ومحددة بدقة متناهية لكل جدول وعملية ونطاق فرقة.
- [x] **معمارية خادم PHP:** هيكلة الـ Endpoints، الـ Middleware، والـ JWT Verification محددة بالكامل.
- [x] **معمارية التخزين على Hostinger:** هيكل المجلدات وتسمية الـ UUID وفحص الـ MIME موثق بدقة.
- [x] **النسخ الاحتياطي المشفر والاستعادة الذرية:** مسار التشفير بـ AES-256 والمعاينة والـ Rollback التلقائي موصوف بدقة.
- [x] **الاستيراد الجماعي للمتدربين:** قواعد فحص Excel/CSV وقاعدة الرفض الشامل (All-or-Nothing) محددة هندسياً.
- [x] **قسم الكتاب المقدس المحلي:** هيكل وتفاعل الأسفار، الإصحاحات، الآيات، التفاسير، والكلمات التفاعلية موثق بالكامل.
- [x] **نظام التقييم الرقمي:** معادلات الماراثون (100 درجة بالتساوي) والامتحانات وسلم التقديرات الخماسي مضمنة بالكامل.
- [x] **القرارات الفنية المعلقة (Pending Technical Decisions):** `NONE` (صفر قرارات معلقة).
- [x] **المخاطر والاعتماديات وخارطة الطريق:** موثقة ومنظمة وجاهزة للانتقال إلى التنفيذ الفعلي المباشر فور اعتمادك.

---
*تم إعداد وتوثيق هذا التصميم الفني الشامل وحفظه كمرجع هندسي نهائي في مسار المشروع: `E:\drive progect\ELKAROOZ SCHOOL\docs\TECHNICAL_DESIGN_ELKAROOZ_SCHOOL.md`.*
