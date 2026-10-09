# مصفوفة صلاحيات المسارات والواجهات (Route Permission Matrix)
## مشروع: مدرسة الكاروز للكتاب المقدس — EL KAROOZ School

**تاريخ التدقيق:** 2026-09-26  
**الإصدار:** v1.0.0-PROD  
**المرجع:** `frontend/src/app/` (21 Routes) و `backend-api/src/Controllers/` و `supabase/migrations/`  

---

### جدول مصفوفة الصلاحيات والعزل لكافة المسارات

| المسار (Route) | Public (عام) | Trainee (متدرب) | Servant (خادم) | Secretariat (سكرتارية) | Admin (مسؤول) | Super User | Group Scope | Backend/RLS Enforced? |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `/` (الحائط العام) | ❌ | ✅ (تفاعل وتعليق) | ✅ (نشر وإدارة) | ✅ (نشر وإدارة) | ✅ (إدارة كاملة) | ✅ (إدارة كاملة) | Global (مشترك) | ✅ محمي RLS و JWT |
| `/about` (عن المدرسة) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Global | ✅ Static Content |
| `/login` (تسجيل الدخول) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Global | ✅ Auth Rate-Limited |
| `/bible` (الكتاب والتفاسير) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Global | ✅ RLS Public Read |
| `/books` (مكتبة الكتب) | ❌ | ✅ (قراءة فقط) | ✅ (قراءة / إدارة مفوضة) | ✅ (قراءة فقط) | ✅ (إدارة كاملة) | ✅ (إدارة كاملة) | Global | ✅ محمي RLS و PHP |
| `/research` (الأبحاث) | ❌ | ✅ (قراءة فقط) | ✅ (قراءة / إدارة مفوضة) | ✅ (قراءة فقط) | ✅ (إدارة كاملة) | ✅ (إدارة كاملة) | Global | ✅ محمي RLS و PHP |
| `/favorites` (المفضلة) | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | User-Owned (شخصي) | ✅ RLS User Scope |
| `/gallery` (معرض الصور) | ❌ | ✅ (فرقة الطالب) | ✅ (فرقة الخادم) | ✅ (فرقة السكرتارية) | ✅ (كافة الفرق) | ✅ (كافة الفرق) | Group Isolated | ✅ محمي RLS و Hostinger |
| `/mp3` (المكتبة الصوتية) | ❌ | ✅ (فرقة الطالب) | ✅ (فرقة الخادم) | ✅ (فرقة السكرتارية) | ✅ (كافة الفرق) | ✅ (كافة الفرق) | Group Isolated | ✅ محمي RLS و Hostinger |
| `/curriculum` (المناهج) | ❌ | ✅ (فرقة الطالب) | ✅ (فرقة الخادم) | ✅ (فرقة السكرتارية) | ✅ (كافة الفرق) | ✅ (كافة الفرق) | Group Isolated | ✅ محمي RLS |
| `/attendance` (الحضور) | ❌ | ✅ (عرض شخصي) | ✅ (فرقة الخادم) | ✅ (تسجيل فرقتها) | ✅ (كافة الفرق) | ✅ (كافة الفرق) | Group Isolated | ✅ محمي Trigger و RLS |
| `/exams` (الامتحانات) | ❌ | ✅ (أداء وعرض) | ✅ (تصحيح مفوض) | ❌ (ممنوع التعديل) | ✅ (كافة الفرق) | ✅ (كافة الفرق) | Group Isolated | ✅ محمي RLS و Functions |
| `/marathon` (الماراثون) | ❌ | ✅ (حل وتدرج) | ✅ (استعراض نتائج) | ❌ (ممنوع التعديل) | ✅ (كافة الفرق) | ✅ (كافة الفرق) | Group Isolated | ✅ محمي RPC و RLS |
| `/marathon/[id]` (حل الماراثون) | ❌ | ✅ (فرقة الطالب) | ❌ | ❌ | ✅ (معاينة) | ✅ (معاينة) | Group + Sequential | ✅ محمي RPC و 100 Eq |
| `/marathon/manage` (إدارة الماراثون) | ❌ | ❌ | ✅ (إذا مفوض) | ❌ | ✅ | ✅ | Group Isolated / All | ✅ محمي RLS و Granular |
| `/trainees` (شؤون المتدربين) | ❌ | ❌ | ✅ (عرض فرقة) | ✅ (إدارة فرقتها) | ✅ (كافة الفرق) | ✅ (كافة الفرق) | Group Isolated / All | ✅ محمي RLS و Security |
| `/admin/notifications` (الإشعارات) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | System Admin | ✅ محمي RLS و Admin RPC |
| `/admin/backups` (النسخ المشفر) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | System Admin | ✅ محمي PHP Controller |
| `/admin/imports` (استيراد الطلاب) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | System Admin | ✅ محمي Atomic RPC |

---

### تطابق الرؤية في الواجهة مع الحماية الخلفية (UI Visibility vs Backend Authorization):
- **حماية المسارات الحساسة:** مسارات `/admin/backups` و `/admin/imports` و `/admin/notifications` لا تظهر مطلقاً في واجهة المتدربين أو الخدام أو السكرتارية، وحتى في حال محاولة الدخول المباشر بالرابط (Direct URL Navigation)، يتم اعتراض الطلب وفحصه على مستويين:
  1. **مستوى الـ Client Component:** فحص `role_id` وتحويل المستخدم غير المصرح له فوراً أو إظهار شاشة الحظر `ShieldAlert`.
  2. **مستوى الـ Backend / RLS / PHP Middleware:** رفض الاستعلامات البرمجية ورد خطأ `403 Forbidden` أو إرجاع مصفوفة فارغة `[]` منعاً لأي تجاوز.
