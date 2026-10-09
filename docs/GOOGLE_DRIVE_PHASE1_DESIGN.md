# المرحلة 1 — وثيقة التصميم المعماري ونموذج التهديدات لتكامل Google Drive

> **الحالة:** مكتملة وجاهزة للمراجعة والاعتماد المعماري.  
> **التاريخ:** 4 أكتوبر 2026.  
> **المرجع:** [خطة نقل تخزين الملفات إلى Google Drive](GOOGLE_DRIVE_STORAGE_PLAN.md) — مهام 1.1 إلى 1.8.

---

## 1. ملخص المعمارية المستهدفة (Architecture Overview)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Next.js 15 Client / PWA                         │
│   (No Google SDK / No Google Credentials / Supabase Auth JWT Only)          │
└──────────────────────┬───────────────────────────────┬──────────────────────┘
                       │                               │
       [1] Metadata / Auth Direct                      │ [2] File Upload / Stream
                       │                               │     (with Bearer JWT)
                       ▼                               ▼
┌─────────────────────────────────────────┐  ┌────────────────────────────────┐
│      Supabase PostgreSQL + RLS          │  │       PHP 8.3 Backend API      │
│  - Profiles, Groups, Roles, Permissions │  │          (Hostinger)           │
│  - Media Metadata Records (Asset IDs)   │  │  - JWT Signature & Role Check  │
│  - Audit Logs & Security Triggers       │  │  - Group Isolation Enforcement │
└─────────────────────────────────────────┘  │  - File Type & MIME Signature  │
                                             │  - Stream / Range 206 Proxy    │
                                             └───────────────┬────────────────┘
                                                             │
                                              [3] Server-to-Server Private API
                                                  (Google Service Account JWT)
                                                             │
                                                             ▼
                                             ┌────────────────────────────────┐
                                             │       Google Drive API         │
                                             │   (Private Storage Root)       │
                                             │  - Scope: drive.file (Strict)  │
                                             │  - Non-public files & folders  │
                                             └────────────────────────────────┘
```

---

## 2. القرارات المعمارية (Architectural Decision Records - ADRs)

### ADR 1.1: نوع حساب Google وإدارة استمرارية الخدمة (1.1 & 1.3)
- **القرار:** استخدام **Google Cloud Service Account** تابع لمشروع مخصص على Google Cloud Platform (GCP) مملوك للمؤسسة/المدرسة، مرتبط بمجلد رئيسي (`Drive Root Folder`) مشترك مع بريد إدارة المدرسة.
- **أسباب الاختيار:**
  1. استقلالية تامة عن حسابات الأفراد: لا يتعطل التخزين إذا غادر أحد الخدام أو المسؤولين.
  2. لا يحتاج إلى جلسات تجديد تفاعلية (Interactive Consent Screens) أو Refresh Tokens قد تنتهي صلاحيتها كل فترة.
  3. إدارة الصلاحيات محصورة بسيرفر PHP الخلفي فقط دون أي وصول مباشر من المتصفح.

### ADR 1.2: آلية المصادقة والربط السحابي (1.2)
- **القرار:** استخدام **Server-to-Server OAuth 2.0 with JWT Bearer Token** (RFC 7523) المعتمد من Google.
- **التنفيذ:** 
  - يتم تحميل الـ Service Account Key (JSON) من مسار آمن وخاص على السيرفر (خارج `public_html/`) أو عبر متغير بيئة مشفر ومحصن.
  - يقوم محرك PHP بإنشاء JWT موقع بـ `RS256` باستخدام المفتاح الخاص للخدمة وطلبه من نقطة `https://oauth2.googleapis.com/token` للحصول على Access Token صالح لمدة ساعة، مع تخزينه مؤقتاً (Cache) في الذاكرة/الملفات المؤقتة المحمية حتى انتهاء مدته.
- **البدائل المرفوضة:** 
  - *User OAuth 2.0 (3-Legged):* مرفوض لأنه يتطلب تسجيل دخول كل مستخدم بحساب Google ويفضح هيكل الملفات ويشتت التحكم الأمني.
  - *API Keys العامة:* مرفوضة لأنها لا توفر وصولاً للملفات الخاصة وتمنع الرفع الآمن.

### ADR 1.3: نطاق الصلاحيات الأمني الأدنى (Least-Privilege OAuth Scope) (1.4)
- **القرار:** استخدام Scope الحصري: `https://www.googleapis.com/auth/drive.file`
- **التعليل الأمني:**
  - يمنح السيرفر صلاحية القراءة والكتابة فقط للملفات والمجلدات التي أنشأها التطبيق نفسه أو التي تمت مشاركتها صراحة مع الـ Service Account.
  - يمنع تماماً وصول التطبيق إلى أي ملفات شخصية أو خارجية أخرى في حساب Google، محققاً مبدأ الامتياز الأدنى (Least Privilege).

### ADR 1.4: نموذج الوصول للملفات الخاصة (Private Access & Streaming) (1.5)
- **القرار:** **PHP Streaming Proxy مع دعم ترويسات HTTP Range (206 Partial Content)**.
- **التفاصيل:**
  1. لا يتم توليد روابط عامة (`public share links`) للملفات على الإطلاق.
  2. تطلب الواجهة الملف عبر مسار موثق في الـ API: `GET /api/storage/file/{asset_id}` مرفقاً بـ Supabase Access Token.
  3. يتحقق الـ Middleware من:
     - صحة الـ JWT وتاريخ صلاحيته.
     - مطابقة `group_id` للمستخدم مع المورد المطلوب (أو صلاحية المسؤول/الخادم المخول).
  4. يقوم PHP بسحب بايتات الملف من Google Drive وبثها مباشرة للمتصفح مع ترويسات الأمان (`Content-Type`, `Content-Security-Policy`, `Cache-Control: private, max-age=3600`).
  5. يدعم مسار الصوت (MP3) والمستندات الكبيرة طلبات `Range: bytes=...` لتمكين التقديم والتأخير (Seek) داخل المشغل دون تحميل كامل الملف.

---

## 3. الهيكل الشجري المنطقي للمجلدات على Google Drive (1.6)

يتم تنظيم المجلدات باستخدام معرفات Drive الثابتة (`Folder IDs`) المسجلة في إعدادات النظام بدلاً من الاعتماد على الأسماء النصية:

```text
📁 [ELKAROOZ_STORAGE_ROOT] (Folder ID: env/config)
│
├── 📁 global/                      (مجلد الموارد العامة لجميع الفرق)
│   ├── 📁 library_books/           (كتب وأبحاث المكتبة العامة)
│   ├── 📁 audio_tracks/            (التسجيلات والترانيم العامة)
│   ├── 📁 bible_media/             (خرائط وصور تفسير الكتاب المقدس)
│   └── 📁 templates/               (قوالب الشهادات والإعلانات)
│
├── 📁 groups/                      (مجلدات الفرق الدراسية المعزولة)
│   ├── 📁 group_1/                 (الفرقة الأولى)
│   │   ├── 📁 curriculums/         (المناهج والمذكرات)
│   │   ├── 📁 lecture_audio/       (تسجيلات المحاضرات الأسبوعية)
│   │   ├── 📁 lecture_attachments/ (عروض ومرفقات المحاضرات)
│   │   └── 📁 gallery/             (ألبومات صور الفرقة الأولى)
│   │
│   ├── 📁 group_2/                 (الفرقة الثانية)
│   │   └── ...
│   │
│   └── 📁 group_3/                 (الفرقة الثالثة)
│       └── ...
│
├── 📁 feed/                        (وسائط المنشورات والتواصل الاجتماعي)
│   └── 📁 post_images/             (صور منشورات الـ Feed)
│
└── 📁 system/                      (المجلدات الإدارية المحمية للمسؤول فقط)
    ├── 📁 backups/                 (حزم النسخ الاحتياطي المشفرة)
    └── 📁 imports/                 (ملفات كشوف الاستيراد المؤقتة)
```

---

## 4. سياسة إدارة النسخ الاحتياطية والاستيراد والاحتفاظ (1.7)

| نوع العملية | مسار التخزين | سياسة الاحتفاظ (Retention) | آلية التشفير والحماية |
|-------------|--------------|-----------------------------|-----------------------|
| **DB Backup (JSON/SQL)** | `system/backups/db/` | آخر 30 نسخة يومية، 12 شهرية | تشفير AES-256 + Checksum SHA-256 |
| **Media Manifest** | `system/backups/manifests/` | متطابقة مع كل نسخة DB | توثيق كامل للـ File IDs والأحجام |
| **Import Files** | `system/imports/` | حذف تلقائي بعد 7 أيام من التنفيذ | معالجة مؤقتة مقصورة على Admin فقط |
| **Orphan Media Files** | `system/quarantine/` | مراجعة دورية كل 30 يوماً | رصد عبر Cronjob ومطابقة دورية |

---

## 5. نموذج التهديدات وتحليل المخاطر (STRIDE Threat Model) (1.8)

### 5.1 تحليل المخاطر والإجراءات المضادة

| نوع التهديد (STRIDE) | السيناريو المحتمل | الإجراء المضاد المنفذ في التصميم |
|----------------------|-------------------|----------------------------------|
| **Spoofing (انتحال الهوية)** | تزوير Supabase JWT أو انتحال مستخدم آخر | التحقق الإلزامي من توقيع JWT عبر `SUPABASE_JWT_SECRET` وفحص صلاحية الوقت `exp` وهوية المستخدم في كل طلب. |
| **Tampering (التلاعب بالبيانات)** | التلاعب بـ `group_id` أو `file_id` في الطلب للوصول لملفات فرقة أخرى | فحص الصلاحية في طبقة الـ Middleware بمقارنة `group_id` الحقيقي المستخرج من الـ Claims مع مالك السجل في Supabase. |
| **Repudiation (التنصل من الأفعال)** | قيام مستخدم بحذف أو استبدال ملف دون أثر | تسجيل كافة عمليات الرفع، الحذف، والاستبدال مع معرّف الطلب `request_id` وهوية الفاعل في جدول `audit_logs`. |
| **Information Disclosure (تسريب البيانات)** | تسريب روابط Google Drive أو ظهور مسارات السيرفر في الأخطاء | عدم استخدام روابط عامة نهائياً، وإخفاء جميع مسارات السيرفر وأخطاء الاستثناءات عبر معيار `SafeFailure::refuse()`. |
| **Denial of Service (حجب الخدمة)** | رفع ملفات ضخمة متكررة لاستنزاف الحصة أو الذاكرة | فرض حدود حجم صارمة حسب نوع المورد، وتطبيق Rate Limiting على نقاط الرفع، والتحقق من التوقيع الحقيقي للبايتات (Magic Bytes). |
| **Elevation of Privilege (تصعيد الصلاحيات)** | محاولة متدرب رفع مناهج أو حذف ألبومات الفرقة | التحقق الدقيق من مصفوفة الأدوار (Admin, Secretariat, Servant, Trainee) ومنع أي تعديل إلا بالأذونات الصريحة. |

---

## 6. تسلسل تدفق البيانات (Data Flow Sequence Diagrams)

### 6.1 تدفق رفع ملف جديد (Upload Flow)
```text
Client (Next.js)           PHP Backend (Hostinger)       Supabase DB          Google Drive
      │                               │                       │                    │
      │── 1. POST /api/storage/upload ─>│                       │                    │
      │      (Bearer JWT + File)      │                       │                    │
      │                               │── 2. Validate JWT ───>│                    │
      │                               │<─ 3. Claims / Role ───│                    │
      │                               │                                            │
      │                               │── 4. Verify MIME, Extension, Magic Bytes   │
      │                               │── 5. Check Group Scope Authorization       │
      │                               │                                            │
      │                               │── 6. Upload Stream (Service Account) ─────>│
      │                               │<─ 7. Return drive_file_id & size ──────────│
      │                               │                                            │
      │                               │── 8. Insert Metadata Record ─>│            │
      │                               │<─ 9. Record Saved OK ─────────│            │
      │                               │                                            │
      │                               │── 10. Log to audit_logs ─────>│            │
      │                               │                                            │
      │<─ 11. 201 Created (Asset ID) ─│                                            │
```

### 6.2 تدفق قراءة / بث ملف محمي (Private Stream Flow)
```text
Client (Next.js)           PHP Backend (Hostinger)       Supabase DB          Google Drive
      │                               │                       │                    │
      │── 1. GET /api/storage/file/{id} >│                    │                    │
      │      (Bearer JWT / Cookie)    │                       │                    │
      │                               │── 2. Validate JWT ───>│                    │
      │                               │<─ 3. User Identity ───│                    │
      │                               │                                            │
      │                               │── 4. Fetch Asset & Scope Info ────────────>│
      │                               │<─ 5. Return group_id & drive_file_id ──────│
      │                               │                                            │
      │                               │── 6. Enforce Group Scope Policy            │
      │                               │                                            │
      │                               │── 7. Request Stream (Range supported) ────>│
      │                               │<─ 8. Binary Stream Bytes ──────────────────│
      │                               │                                            │
      │<─ 9. 200/206 Stream Response ─│                                            │
```

---

## 7. متطلبات بيئة التشغيل والإعدادات (Environment Specifications)

المتغيرات الإضافية المطلوبة لتشغيل تكامل Google Drive داخل ملف `.env` على سيرفر PHP:

```env
# Google Cloud Service Account Integration
GOOGLE_DRIVE_ROOT_FOLDER_ID="1AbCdEfGhIjKlMnOpQrStUvWxYz..."
GOOGLE_SERVICE_ACCOUNT_JSON_PATH="/home/u123456789/secure_keys/google_service_account.json"
GOOGLE_DRIVE_CLIENT_TIMEOUT=30
```

> **ملاحظة أمنية:** لا يتم تخزين مفتاح الـ JSON داخل مجلد الويب `public_html/` نهائياً، بل يوضع في مجلد محمي فوق الـ web root أو يتم تحميله من متغير بيئة آمن.
