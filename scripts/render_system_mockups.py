import os
from playwright.sync_api import sync_playwright

dest_assets = os.path.abspath('presentation/assets')

attendance_html = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Cairo', sans-serif; background-color: #040918; color: #fff; }
  </style>
</head>
<body class="p-8 bg-[#040918] text-white">
  <!-- Top App Navigation Bar -->
  <header class="flex items-center justify-between pb-6 border-b border-amber-500/20 mb-8">
    <div class="flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-400 text-xl font-bold">
        ✟
      </div>
      <div>
        <h1 class="text-xl font-bold text-white">مدرسة الكاروز للكتاب المقدس</h1>
        <p class="text-xs text-amber-400/80">نظام رصد الحضور الذكي والافتقاد الرعوي — كنيسة مارمرقس</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <span class="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        الجلسة نشطة: الجمعة 24 أكتوبر 2026
      </span>
      <button class="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold rounded-lg text-sm shadow-lg shadow-amber-500/20 flex items-center gap-2">
        📷 مسح QR الحضور السريع
      </button>
    </div>
  </header>

  <!-- Controls & Stats Bar -->
  <div class="grid grid-cols-4 gap-4 mb-6">
    <div class="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
      <p class="text-xs text-slate-400">إجمالي طلاب الفرقة</p>
      <p class="text-2xl font-black text-white mt-1">128 طالب</p>
      <span class="text-[11px] text-amber-400">الفرقة الأولى — مسائي</span>
    </div>
    <div class="bg-slate-900/80 border border-emerald-500/30 p-4 rounded-xl">
      <p class="text-xs text-slate-400">نسبة الحضور الفعلي</p>
      <p class="text-2xl font-black text-emerald-400 mt-1">118 (92.2%)</p>
      <span class="text-[11px] text-emerald-400/80">مكتمل الرصد</span>
    </div>
    <div class="bg-slate-900/80 border border-rose-500/30 p-4 rounded-xl">
      <p class="text-xs text-slate-400">الغياب المستحق للافتقاد</p>
      <p class="text-2xl font-black text-rose-400 mt-1">10 طلاب</p>
      <span class="text-[11px] text-rose-400/80">جاهز للإرسال الآلي</span>
    </div>
    <div class="bg-slate-900/80 border border-cyan-500/30 p-4 rounded-xl">
      <p class="text-xs text-slate-400">الافتقاد الرعوي</p>
      <p class="text-2xl font-black text-cyan-400 mt-1">10 رسائل</p>
      <span class="text-[11px] text-cyan-400/80">توليد رسائل واتساب فورية</span>
    </div>
  </div>

  <!-- Table Section -->
  <div class="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
    <div class="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="text-sm font-bold text-amber-400">كشف الحضور التفاعلي:</span>
        <button class="px-3 py-1 rounded-md text-xs bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">الكل (128)</button>
        <button class="px-3 py-1 rounded-md text-xs bg-slate-800 text-slate-400">حاضر (118)</button>
        <button class="px-3 py-1 rounded-md text-xs bg-slate-800 text-slate-400">غائب (10)</button>
      </div>
      <div class="text-xs text-slate-400">
        حفظ فوري في Supabase Cloud مع مزامنة سحابية
      </div>
    </div>

    <table class="w-full text-right text-sm">
      <thead class="bg-slate-950 text-slate-400 text-xs border-b border-slate-800">
        <tr>
          <th class="p-3.5">#</th>
          <th class="p-3.5">اسم الطالب</th>
          <th class="p-3.5">الفرقة الدراسية</th>
          <th class="p-3.5">وقت الرصد</th>
          <th class="p-3.5 text-center">حالة الحضور</th>
          <th class="p-3.5 text-left">إجراءات الخدمة</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-800/60">
        <tr class="hover:bg-slate-800/40 transition">
          <td class="p-3.5 text-slate-500 font-mono">01</td>
          <td class="p-3.5 font-bold text-white flex items-center gap-2">
            <span class="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">بي</span>
            بيتر مجدي فريد
          </td>
          <td class="p-3.5 text-slate-300">الفرقة الأولى (أ)</td>
          <td class="p-3.5 text-slate-400 font-mono text-xs">06:42 م (مسح QR)</td>
          <td class="p-3.5 text-center">
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              ✓ حاضر
            </span>
          </td>
          <td class="p-3.5 text-left">
            <span class="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded">سجل ممتاز 100%</span>
          </td>
        </tr>
        <tr class="hover:bg-slate-800/40 transition">
          <td class="p-3.5 text-slate-500 font-mono">02</td>
          <td class="p-3.5 font-bold text-white flex items-center gap-2">
            <span class="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">ما</span>
            مارينا عماد زكي
          </td>
          <td class="p-3.5 text-slate-300">الفرقة الأولى (أ)</td>
          <td class="p-3.5 text-slate-400 font-mono text-xs">06:45 م (تطبيق الهاتف)</td>
          <td class="p-3.5 text-center">
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              ✓ حاضر
            </span>
          </td>
          <td class="p-3.5 text-left">
            <span class="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded">سجل ممتاز 95%</span>
          </td>
        </tr>
        <tr class="bg-rose-950/20 hover:bg-rose-950/30 transition">
          <td class="p-3.5 text-slate-500 font-mono">03</td>
          <td class="p-3.5 font-bold text-rose-200 flex items-center gap-2">
            <span class="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs">يو</span>
            يوسف سامح عريان
          </td>
          <td class="p-3.5 text-slate-300">الفرقة الأولى (ب)</td>
          <td class="p-3.5 text-slate-400 font-mono text-xs">لم يسجل</td>
          <td class="p-3.5 text-center">
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
              ✕ غائب
            </span>
          </td>
          <td class="p-3.5 text-left">
            <button class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold flex items-center gap-1.5 shadow">
              <span>💬</span> افتقاد واتساب آلي
            </button>
          </td>
        </tr>
        <tr class="hover:bg-slate-800/40 transition">
          <td class="p-3.5 text-slate-500 font-mono">04</td>
          <td class="p-3.5 font-bold text-white flex items-center gap-2">
            <span class="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">مي</span>
            مينا أشرف حبيب
          </td>
          <td class="p-3.5 text-slate-300">الفرقة الأولى (أ)</td>
          <td class="p-3.5 text-slate-400 font-mono text-xs">07:05 م (يدوي)</td>
          <td class="p-3.5 text-center">
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              ⏱ متأخر
            </span>
          </td>
          <td class="p-3.5 text-left">
            <span class="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded">تم تدوين العذر</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>"""

marathon_html = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Cairo', sans-serif; background-color: #040918; color: #fff; }
  </style>
</head>
<body class="p-8 bg-[#040918] text-white">
  <!-- Top Header -->
  <header class="flex items-center justify-between pb-6 border-b border-amber-500/20 mb-8">
    <div class="flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-2xl">
        🏆
      </div>
      <div>
        <h1 class="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200">
          ماراثون حفظ ودراسة الكتاب المقدس
        </h1>
        <p class="text-xs text-slate-400">لوحة الشرف والتنافس الروحي الأكاديمي — الفصل الدراسي الأول 2026</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <span class="px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-bold">
        🌟 سباق الأسبوع الخامس: رسالة رومية
      </span>
    </div>
  </header>

  <!-- Leaderboard Podium Cards -->
  <div class="grid grid-cols-3 gap-6 mb-8">
    <!-- 2nd Place -->
    <div class="bg-gradient-to-b from-slate-800/80 to-slate-900 border border-slate-700/60 rounded-2xl p-5 relative overflow-hidden flex flex-col items-center text-center">
      <div class="w-14 h-14 rounded-full bg-slate-300/20 border-2 border-slate-300 flex items-center justify-center text-xl font-bold mb-3 shadow-lg">
        🥈
      </div>
      <h3 class="font-bold text-lg text-white">كيرلس ممدوح فوزي</h3>
      <p class="text-xs text-slate-400 mb-2">الفرقة الثانية</p>
      <div class="px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-bold text-xs mb-3">480 / 500 نقطة</div>
      <p class="text-xs text-slate-400">حفظ 24 آية + حل 8 امتحانات أسبوعية</p>
    </div>

    <!-- 1st Place Champion -->
    <div class="bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-950 border-2 border-amber-400 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center text-center shadow-2xl shadow-amber-500/10 scale-105">
      <div class="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500"></div>
      <div class="w-16 h-16 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center text-2xl font-bold mb-3 shadow-xl shadow-amber-400/30 animate-pulse">
        👑
      </div>
      <div class="text-xs font-black text-amber-400 tracking-wider mb-1">المركز الأول — المتصدر</div>
      <h3 class="font-black text-xl text-amber-300">ساندرا فايز نصحي</h3>
      <p class="text-xs text-slate-400 mb-2">الفرقة الأولى</p>
      <div class="px-4 py-1 rounded-full bg-amber-400/20 text-amber-300 font-black text-sm mb-3 border border-amber-400/40">500 / 500 نقطة كاملة</div>
      <p class="text-xs text-amber-200/80">أتمت حفظ كامل أسفار التيرم واجتازت كافة الاختبارات بامتياز</p>
    </div>

    <!-- 3rd Place -->
    <div class="bg-gradient-to-b from-slate-800/80 to-slate-900 border border-slate-700/60 rounded-2xl p-5 relative overflow-hidden flex flex-col items-center text-center">
      <div class="w-14 h-14 rounded-full bg-amber-700/20 border-2 border-amber-600 flex items-center justify-center text-xl font-bold mb-3 shadow-lg">
        🥉
      </div>
      <h3 class="font-bold text-lg text-white">جورج ميشيل لبيب</h3>
      <p class="text-xs text-slate-400 mb-2">الفرقة الثالثة</p>
      <div class="px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-bold text-xs mb-3">465 / 500 نقطة</div>
      <p class="text-xs text-slate-400">حفظ 22 آية + دقة عالية في الشواهد</p>
    </div>
  </div>

  <!-- Weekly Active Challenges -->
  <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
    <div class="flex items-center justify-between mb-4">
      <h4 class="font-bold text-sm text-amber-400 flex items-center gap-2">
        <span>📖</span> شواهد الأسبوع الحالية للحفظ والتسميع:
      </h4>
      <span class="text-xs text-slate-400">الموعد النهائي: الجمعة القادم 05:00 م</span>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div class="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
        <div>
          <p class="text-xs text-amber-300 font-bold">الشاهد الأول: رومية 8 : 28</p>
          <p class="text-sm text-slate-200 mt-1">«وَنَحْنُ نَعْلَمُ أَنَّ كُلَّ الأَشْيَاءِ تَعْمَلُ مَعاً لِلْخَيْرِ لِلَّذِينَ يُحِبُّونَ اللهَ»</p>
        </div>
        <span class="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold whitespace-nowrap">50 نقطة</span>
      </div>
      <div class="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
        <div>
          <p class="text-xs text-amber-300 font-bold">الشاهد الثاني: فيلبي 4 : 13</p>
          <p class="text-sm text-slate-200 mt-1">«أَسْتَطِيعُ كُلَّ شَيْءٍ فِي الْمَسِيحِ الَّذِي يُقَوِّينِي»</p>
        </div>
        <span class="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold whitespace-nowrap">50 نقطة</span>
      </div>
    </div>
  </div>
</body>
</html>"""

with open('temp_attendance.html', 'w', encoding='utf-8') as f:
    f.write(attendance_html)
with open('temp_marathon.html', 'w', encoding='utf-8') as f:
    f.write(marathon_html)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1200, 'height': 750})
    
    page.goto('file:///' + os.path.abspath('temp_attendance.html').replace('\\', '/'))
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(dest_assets, 'real_screen_attendance.png'))
    print("Saved real_screen_attendance.png")
    
    page.goto('file:///' + os.path.abspath('temp_marathon.html').replace('\\', '/'))
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(dest_assets, 'real_screen_marathon.png'))
    print("Saved real_screen_marathon.png")
    
    browser.close()

os.remove('temp_attendance.html')
os.remove('temp_marathon.html')
print("Complete!")
