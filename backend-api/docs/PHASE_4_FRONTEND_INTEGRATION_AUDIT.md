# فحص وتدقيق تكامل الواجهة الأمامية (PHASE 4 — Frontend Integration Audit)

**التاريخ:** 2026-10-06  
**المشروع:** EL KAROOZ School  
**الهدف:** فحص حالة Next.js Frontend قبل ربطه بـ PHP Bible API الجديد والتأكد من العزل التام عن التخزين المباشر.

---

## 1. فحص صفحات ومكونات الموسوعة الحالية (Component Inventory)

| الملف (File Path) | الحجم | الدور البرمجي | حالة الاعتمادية الحالية |
|---|---:|---|---|
| `frontend/src/lib/api/bible.ts` | 5.8 KB | عميل الـ API لبيانات الموسوعة | يتصل عبر HTTP بـ `API_BASE/bible/*` (معزول تماماً عن التخزين المباشر) |
| `frontend/src/app/bible/page.tsx` | 31.9 KB | الصفحة الرئيسية للموسوعة (Hub) | يعرض الفئات الأربع، الإحصاءات، وآية اليوم عبر `getBibleCategories` و `getBibleStats` |
| `frontend/src/app/bible/reader/[id]/page.tsx` | 6.0 KB | قارئ المقالات المستقل | يجلب المقال الفردي عبر `getBibleArticle({ id })` مع التنقل السابق/التالي |
| `frontend/src/app/bible/section/[code]/page.tsx` | 7.0 KB | متصفح الأقسام | يجلب أقسام الفئة ويحتاج ربط قائمة مقالات القسم بالـ Endpoint الجديد `section-articles` |
| `frontend/src/components/Bible/WingSelector.tsx` | 4.6 KB | محدد الأجنحة والفئات | يعرض الفئات الـ 4 مع الأيقونات والوصف |
| `frontend/src/components/Bible/BibleSearchModal.tsx` | 6.7 KB | نافذة البحث السريع في الموسوعة | يستدعي `searchBibleEncyclopedia` مع إمكانية تحسين الـ Debounce وربط استجابة الـ Shards |

---

## 2. فحص العزل والتخزين (Storage & Credentials Isolation Audit)

- ✅ **Google Drive Direct Access:** تم التحقق من عدم وجود أي استدعاء مباشر لـ Google Drive API أو مكتبات Google Cloud SDK داخل كود الـ Frontend.
- ✅ **Google Credentials:** لا توجد أي مفاتيح، رموز سرية (Secrets)، أو Tokens خاصة بـ Google في حزم الـ Client Bundle أو ملفات `.env` الخاصة بالفرونت إند.
- ✅ **SQLite Access:** لا يوجد أي كود استعلام SQLite محلي أو WASM داخل Frontend؛ كل البيانات تأتي عبر REST API من خادم PHP.
- ✅ **Static Blobs:** لا توجد ملفات JSON ضخمة مدمجة في حزمة الفرونت إند (فقط 15 صورة أطلس ثابتة في `public/bible-images/`).

---

## 3. تدقيق توافق الـ API Contract (API Contract Alignment)

| العملية | الـ Endpoint في PHP (Phase 3) | استجابة الـ PHP API | متطلبات عميل الـ Frontend | حالة التوافق والتعديل المطلوب |
|---|---|---|---|---|
| **الأقسام والفئات** | `GET /api/bible/sections?grouped=1` | `{ status: "success", data: [...] }` | `getBibleCategories()` | ✅ متوافق 100% |
| **المقال الفردي** | `GET /api/bible/article?id=X` | `{ status: "success", data: { id, title, content, ... } }` | `getBibleArticle({ id })` | ⚠️ ضبط فك استجابة `data` مباشرة |
| **البحث** | `GET /api/bible/search?q=X&limit=20` | `{ status: "success", data: { query, total, items: [...] } }` | `searchBibleEncyclopedia()` | ⚠️ ضبط خريطة الحقول `items` / `results` |
| **مقالات القسم** | `GET /api/bible/section-articles?id=X` | `{ status: "success", data: { total, items: [...] } }` | إضافة `getBibleSectionArticles()` | 🔄 إضافة الدالة للاستفادة من الفهرس السريع |
| **الإحصاءات** | `GET /api/bible/stats` | `{ status: "success", data: { total_articles, daily_verse, ... } }` | `getBibleStats()` | ✅ متوافق 100% |

---

## 4. خطة التعديل الدقيقة (Execution Plan)

1. **تحديث `frontend/src/lib/api/bible.ts`:**
   - ضبط استخراج `json.data` للتعامل مع معايير استجابة PHP `status: "success"` و `success: true`.
   - إضافة دالة `getBibleSectionArticles(sectionId, page, limit)` لتصفح مقالات الأقسام الكبيرة بمرونة وترقيم صفحات.
   - دعم موحد لنتائج البحث عبر حقل `items` و `results`.
2. **تحسين `BibleSearchModal.tsx`:**
   - إصلاح مؤقت الـ Debounce باستخدام `useRef` لمنع إرسال طلبات متعددة غير ضرورية أثناء الكتابة السريعة.
   - تحسين عرض مقتطفات البحث وحالات التحميل والنتائج الفارغة.
3. **تحديث `frontend/src/app/bible/section/[code]/page.tsx`:**
   - دعم استعراض مقالات القسم مع التبديل بين Grid/List وترقيم الصفحات.
4. **إجراء الاختبارات والتحقق الشامل (Build & Regression Tests).**
