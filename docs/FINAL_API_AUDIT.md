# تقرير تدقيق واجهات البرمجة الخلفية PHP API (API Audit)
## مشروع: مدرسة الكاروز للكتاب المقدس — EL KAROOZ School

**تاريخ التدقيق:** 2026-09-26  
**الإصدار:** v1.0.0-PROD  
**الخادم الخلفي:** PHP 8.x MVC API on Hostinger  

---

### 1. تدقيق نقاط النهاية والتحكم (Endpoints & Controllers)

| Endpoint | Method | Controller | الغرض والوظيفة | الحماية والـ Middleware |
|:---|:---:|:---|:---|:---|
| `/api/auth/verify` | POST | `AuthController` | التحقق من التوكن وجلب الأدوار والصلاحيات | `JwtAuthMiddleware` |
| `/api/storage/upload` | POST | `StorageController` | رفع الملفات والوسائط والكتب والصوتيات | `JwtAuth`, `Rbac`, `FileSecurity` |
| `/api/storage/stream` | GET | `StorageController` | بث الملفات الصوتية وعرض المستندات | `JwtAuth`, `GroupScopeMiddleware` |
| `/api/backups/create` | POST | `BackupController` | توليد نسخة احتياطية مشفرة بـ AES-256 | `JwtAuth`, `Rbac (Admin/Super)` |
| `/api/backups/list` | GET | `BackupController` | استعراض قائمة النسخ وسجلاتها | `JwtAuth`, `Rbac (Admin/Super)` |
| `/api/backups/download`| GET | `BackupController` | تنزيل ملف الـ ZIP المشفر | `JwtAuth`, `Rbac (Admin/Super)` |
| `/api/backups/delete` | DELETE | `BackupController` | حذف نسخة احتياطية من التخزين وسجلاتها | `JwtAuth`, `Rbac (Admin/Super)` |
| `/api/restore/execute` | POST | `RestoreController` | تنفيذ الاستعادة الذرية مع نقطة أمان | `JwtAuth`, `Rbac (Admin/Super)` |
| `/api/import/trainees` | POST | `ImportController` | تحليل واستيراد ملفات الطلاب الذري | `JwtAuth`, `Rbac (Admin/Super)` |
| `/api/export/data` | GET | `ExportController` | تصدير بيانات الطلاب والدرجات والتقارير | `JwtAuth`, `Rbac`, `GroupScope` |

---

### 2. تدقيق طبقات الحماية والوسائط (Middleware Pipeline)
1. **`CorsMiddleware`:** ضبط الترويسات وحصر النطاقات المسموحة للواجهة الأمامية ومنع طلبات الأصول المجهولة.
2. **`JwtAuthMiddleware`:** فحص توكن Supabase وتفريغه والتحقق من صلاحيته.
3. **`RbacMiddleware`:** فحص مصفوفة الأدوار والصلاحيات المفوضة ومنع غير المصرح لهم من الوصول للوظائف الإدارية.
4. **`GroupScopeMiddleware`:** فرض نطاق الفرقة الدراسية على كافة طلبات جلب الملفات والصوتيات لمنع التسلل بين الفرق.
5. **`FileSecurityMiddleware`:** فحص الملفات المرفوعة وحظر الملفات التنفيذية أو الامتدادات الخطرة.

---

### 3. تدقيق معالجة الأخطاء ومخرجات الإنتاج (Production Error Handling)
- **إخفاء تفاصيل الأخطاء:** ضبط `display_errors = Off` في بيئة الإنتاج، لمنع كشف أي مسارات داخلية للخادم أو تفاصيل اتصال.
- **التسجيل الآمن (Secure Logging):** تسجيل الأخطاء في ملفات سجلات معزولة على الخادم لا يمكن الوصول إليها عبر الويب.
- **صيغة الاستجابة الموحدة (Standard JSON Response):**
  - عند النجاح: `{"success": true, "data": {...}, "message": "..."}`
  - عند الخطأ: `{"success": false, "error": "...", "code": 403}`
- **النتيجة:** ✅ PASS.
