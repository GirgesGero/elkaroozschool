import sys
import os

# Reconfigure stdout for utf-8
sys.stdout.reconfigure(encoding='utf-8')

script_path = 'scripts/build_luxurious_presentation.py'
with open(script_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add CSS for ecclesiastical blessing bar
css_marker = '/* ==========================================================================\n       LUXURY GLASS CARDS & MICRO-INTERACTIONS'
if css_marker not in content:
    print('Error: css_marker not found!')
    sys.exit(1)

new_css = '''/* ==========================================================================
       ECCLESIASTICAL LEADERSHIP & BLESSING BAR (POPE TAWADROS & ANBA MORCOS)
       ========================================================================== */
    .church-blessing-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      padding: 12px 24px;
      margin-bottom: 12px;
      background: linear-gradient(135deg, rgba(16, 28, 58, 0.82) 0%, rgba(8, 16, 36, 0.92) 100%);
      border: 1.5px solid rgba(218, 178, 60, 0.5);
      border-radius: 22px;
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.55), inset 0 0 25px rgba(218, 178, 60, 0.08);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
    .church-blessing-header::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 8%;
      right: 8%;
      height: 3px;
      background: linear-gradient(90deg, transparent, var(--cyan), var(--gold-bright), var(--gold), transparent);
      border-radius: 3px;
      box-shadow: 0 0 16px var(--gold-glow);
    }

    /* Leader Profile (Right and Left in RTL) */
    .leader-profile {
      display: flex;
      align-items: center;
      gap: 15px;
      flex: 1;
    }
    .leader-profile.leader-right {
      justify-content: flex-start;
    }
    .leader-profile.leader-left {
      justify-content: flex-end;
    }

    /* Gentle Floating Motions with Natural Breathing Phase */
    .floating-leader-right {
      animation: gentleLeaderFloatRight 5s ease-in-out infinite;
    }
    .floating-leader-left {
      animation: gentleLeaderFloatLeft 5.5s ease-in-out 0.9s infinite;
    }

    @keyframes gentleLeaderFloatRight {
      0%, 100% {
        transform: translateY(0px) rotate(0deg);
      }
      50% {
        transform: translateY(-6px) rotate(0.4deg);
      }
    }

    @keyframes gentleLeaderFloatLeft {
      0%, 100% {
        transform: translateY(0px) rotate(0deg);
      }
      50% {
        transform: translateY(-6px) rotate(-0.4deg);
      }
    }

    /* Royal Golden Frame */
    .leader-portrait-outer {
      position: relative;
      width: 96px;
      height: 96px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .golden-ring-pulse {
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      border: 1.5px dashed var(--gold);
      animation: rotateRing 26s linear infinite;
      pointer-events: none;
      opacity: 0.65;
    }
    @keyframes rotateRing {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .leader-portrait-wrap {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      padding: 3.5px;
      background: linear-gradient(135deg, var(--gold-bright) 0%, rgba(218, 178, 60, 0.4) 50%, var(--gold) 100%);
      box-shadow: 0 0 24px var(--gold-glow), 0 8px 20px rgba(0,0,0,0.6);
      transition: box-shadow 0.3s ease;
    }
    .leader-portrait-wrap:hover {
      box-shadow: 0 0 36px var(--gold-bright), 0 10px 25px rgba(0,0,0,0.8);
    }
    .leader-img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      object-position: center 15%;
      display: block;
      border: 2px solid rgba(255, 255, 255, 0.5);
    }

    /* Leader Typography */
    .leader-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .leader-details.text-left-side {
      text-align: left;
    }
    .leader-role-badge {
      font-size: 13px;
      font-weight: 800;
      color: var(--cyan);
      letter-spacing: 0.3px;
    }
    .leader-name {
      font-size: 20px;
      font-weight: 900;
      color: var(--gold-bright);
      line-height: 1.25;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
    }
    .leader-subtitle {
      font-size: 14px;
      font-weight: 700;
      color: var(--muted);
      line-height: 1.2;
    }

    /* Central Church & Diocese Identity */
    .church-central-identity {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 0 18px;
      flex: 1.2;
    }
    .cross-ornament {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 3px;
    }
    .cross-sym {
      color: var(--gold-bright);
      font-size: 17px;
      filter: drop-shadow(0 0 6px var(--gold));
    }
    .cross-line {
      width: 36px;
      height: 1.5px;
      background: linear-gradient(90deg, transparent, var(--gold), transparent);
    }
    .center-cross-logo {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1.5px solid var(--gold);
      box-shadow: 0 0 12px var(--gold-glow);
    }
    .central-diocese-title {
      font-size: 26px;
      font-weight: 900;
      line-height: 1.2;
      margin-bottom: 2px;
      letter-spacing: -0.3px;
    }
    .central-church-title {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.25;
      text-shadow: 0 2px 12px rgba(255, 255, 255, 0.25);
    }
    .central-school-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 14px;
      margin-top: 4px;
      border-radius: 14px;
      background: rgba(218, 178, 60, 0.14);
      border: 1px solid var(--gold);
      color: var(--gold-bright);
      font-size: 13.5px;
      font-weight: 800;
    }

    '''

content = content.replace(css_marker, new_css + css_marker)
print('CSS injected successfully')

# 2. Replace Slide 1
slide1_start = '    <!-- ========================================================================\n         الشريحة 1: شريحة البداية والرؤية التنفيذية\n         ======================================================================== -->\n    <section class="slide active" id="slide-1">'
slide1_end = '    <!-- ========================================================================\n         الشريحة 2: التحديات والمشكلات الواقعية قبل المنظومة'

p1 = content.find(slide1_start)
p2 = content.find(slide1_end)
if p1 == -1 or p2 == -1:
    print('Error: Slide 1 markers not found!', p1, p2)
    sys.exit(1)

new_slide1 = '''    <!-- ========================================================================
         الشريحة 1: شريحة البداية والرؤية التنفيذية
         ======================================================================== -->
    <section class="slide active" id="slide-1">
      <!-- الشريط الرئاسي والبركة الرسولية -->
      <div class="church-blessing-header">
        <!-- اليمين: قداسة البابا المعظم الأنبا تواضروس الثاني -->
        <div class="leader-profile leader-right">
          <div class="leader-portrait-outer floating-leader-right">
            <div class="golden-ring-pulse"></div>
            <div class="leader-portrait-wrap">
              <img src="assets/pope_tawadros.jpg" alt="قداسة البابا تواضروس الثاني" class="leader-img">
            </div>
          </div>
          <div class="leader-details">
            <span class="leader-role-badge">تحت رعاية وبصلوات</span>
            <h3 class="leader-name">قداسة البابا الأنبا تواضروس الثاني</h3>
            <p class="leader-subtitle">بابا وبطريرك الكرازة المرقسية</p>
          </div>
        </div>

        <!-- المنتصف: مطرانية شبرا الخيمة وتوابعها - كنيسة مارمرقس الرسول -->
        <div class="church-central-identity">
          <div class="cross-ornament">
            <span class="cross-sym">☩</span>
            <span class="cross-line"></span>
            <img src="assets/logo.png" alt="شعار مدرسة الكاروز" class="center-cross-logo">
            <span class="cross-line"></span>
            <span class="cross-sym">☩</span>
          </div>
          <h1 class="central-diocese-title text-liquid-gold">مطرانية شبرا الخيمة وتوابعها</h1>
          <h2 class="central-church-title">كنيسة مارمرقس الرسول</h2>
          <div class="central-school-tag">
            <span>✨</span> مدرسة الكاروز للكتاب المقدس <span>✨</span>
          </div>
        </div>

        <!-- اليسار: نيافة الحبر الجليل الأنبا مرقص -->
        <div class="leader-profile leader-left">
          <div class="leader-details text-left-side">
            <span class="leader-role-badge">وشريكه في الخدمة الرسولية</span>
            <h3 class="leader-name">نيافة الحبر الجليل الأنبا مرقص</h3>
            <p class="leader-subtitle">مطران شبرا الخيمة وتوابعها</p>
          </div>
          <div class="leader-portrait-outer floating-leader-left">
            <div class="golden-ring-pulse"></div>
            <div class="leader-portrait-wrap">
              <img src="assets/anba_morcos.jpg" alt="نيافة الأنبا مرقص" class="leader-img">
            </div>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 36px; align-items: center; margin: 8px 0;">
        <!-- Right Column: Grand Title & Vision -->
        <div>
          <div style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 18px; border-radius: 20px; background: rgba(218, 178, 60, 0.16); border: 1.5px solid var(--gold); color: var(--gold-bright); font-size: 15.5px; font-weight: 800; margin-bottom: 12px;">
            <span>✨</span> المنظومة الرقمية الذكية — الإصدار التنفيذي المعتمد
          </div>

          <h2 style="font-size: 38px; font-weight: 900; line-height: 1.25; margin-bottom: 14px;" class="text-liquid-gold">
            منظومة التعليم الأكاديمي والإدارة الكنسية
          </h2>

          <p style="font-size: 19px; line-height: 1.6; color: var(--muted); font-weight: 600; margin-bottom: 20px;">
            بوابة رقمية كنسية متكاملة تدمج بين التعليم اللاهوتي الرصين والتكنولوجيا السحابية الفائقة: رصد الحضور الذكي، إدارة الامتحانات والماراثون الروحي، وأضخم موسوعة رقمية تفاعلية لأسفار الكتاب المقدس وتفاسير الآباء.
          </p>

          <!-- 3 Stats Counter Cards -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;">
            <div class="glass-card" style="padding: 12px 16px; text-align: center; border-bottom: 4px solid var(--gold);">
              <div style="font-size: 32px; font-weight: 900; color: var(--gold-bright);" class="stat-number" data-target="3">0</div>
              <div style="font-size: 14.5px; font-weight: 800; color: var(--white); margin-top: 2px;">فرق دراسية كاملة</div>
              <div style="font-size: 12px; color: var(--muted); margin-top: 1px;">صفوف أكاديمية 1، 2، 3</div>
            </div>

            <div class="glass-card" style="padding: 12px 16px; text-align: center; border-bottom: 4px solid var(--cyan);">
              <div style="font-size: 32px; font-weight: 900; color: var(--cyan);" class="stat-number" data-target="73">0</div>
              <div style="font-size: 14.5px; font-weight: 800; color: var(--white); margin-top: 2px;">سفراً قانونياً موثقاً</div>
              <div style="font-size: 12px; color: var(--muted); margin-top: 1px;">تفاسير الآباء المعتمدة</div>
            </div>

            <div class="glass-card" style="padding: 12px 16px; text-align: center; border-bottom: 4px solid var(--emerald);">
              <div style="font-size: 32px; font-weight: 900; color: var(--emerald-bright);">١٠٠%</div>
              <div style="font-size: 14.5px; font-weight: 800; color: var(--white); margin-top: 2px;">سحابي وفوري</div>
              <div style="font-size: 12px; color: var(--muted); margin-top: 1px;">تطبيق هاتف بدون تثبيت</div>
            </div>
          </div>
        </div>

        <!-- Left Column: Dual Mockup Showcase -->
        <div style="position: relative; height: 390px; display: flex; align-items: center; justify-content: center;">
          <!-- Desktop Mockup Frame -->
          <div class="screen-mockup-frame" style="width: 86%; height: 300px; transform: perspective(1000px) rotateY(-5deg) rotateX(3deg);">
            <div class="screen-mockup-header">
              <div class="browser-dots">
                <span class="browser-dot red"></span>
                <span class="browser-dot yellow"></span>
                <span class="browser-dot green"></span>
              </div>
              <span class="browser-address">🔒 منظومة مدرسة الكاروز ⟵ موسوعة الكتاب المقدس</span>
            </div>
            <img src="assets/real_bible_hub.png" alt="موسوعة الكتاب المقدس" style="width: 100%; height: 255px; object-fit: cover; object-position: top; display: block;">
          </div>

          <!-- Floating Phone Mockup -->
          <div class="phone-mockup-frame floating-anim" style="width: 185px; height: 350px; position: absolute; right: 10px; bottom: 10px; border-color: rgba(218, 178, 60, 0.75);">
            <div class="phone-dynamic-island"></div>
            <img src="assets/real_mobile_login.png" alt="واجهة تسجيل الدخول بالهاتف" style="width: 100%; height: 100%; object-fit: cover; display: block;">
          </div>

          <!-- Church Cathedral Floating Stamp -->
          <div class="floating-anim-delay" style="position: absolute; top: 15px; left: 20px; background: rgba(10, 25, 60, 0.95); border: 2px solid var(--gold); border-radius: 50%; padding: 6px; box-shadow: 0 0 25px var(--gold-glow);">
            <img src="assets/c_sanctuary.png" alt="كنيسة مارمرقس" style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; display: block;">
          </div>
        </div>
      </div>

      <footer class="slide-footer">
        <div>كنيسة مارمرقس الرسول بالمنشية — شبرا الخيمة</div>
        <div style="color: var(--cyan); font-weight: 800;">● المنظومة تعمل حياً ومفعلة لجميع الخدام والدارسين</div>
      </footer>
    </section>

'''

content = content[:p1] + new_slide1 + content[p2:]
print('Slide 1 replaced successfully')

# 3. Update Slide 9 Church Card
s9_target = '        <!-- Left: Official Church Seal Card -->\n        <div class="glass-card" style="padding: 34px 28px;'
s9_p = content.find(s9_target)
if s9_p != -1:
    s9_end_target = '<a href="https://elkaroozschool1.vercel.app/" target="_blank" style="display: inline-flex; align-items: center; gap: 10px; background: linear-gradient(135deg, var(--gold), #b89127);'
    s9_end_p = content.find(s9_end_target, s9_p)
    if s9_end_p != -1:
        new_s9_card = '''        <!-- Left: Official Church Seal Card -->
        <div class="glass-card" style="padding: 26px 24px; text-align: center; border-color: rgba(218, 178, 60, 0.6); box-shadow: 0 20px 50px rgba(0,0,0,0.7), 0 0 35px var(--gold-glow);">
          <div style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 12px;">
            <!-- Pope Tawadros -->
            <div class="floating-leader-right" style="position: relative; width: 74px; height: 74px; border-radius: 50%; padding: 3px; background: linear-gradient(135deg, var(--gold-bright), var(--gold)); box-shadow: 0 0 20px var(--gold-glow);">
              <img src="assets/pope_tawadros.jpg" alt="قداسة البابا تواضروس الثاني" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; object-position: center 15%;">
            </div>

            <!-- Church Sanctuary -->
            <div style="width: 90px; height: 90px; border-radius: 50%; border: 3px solid var(--gold-bright); padding: 4px; background: rgba(14, 30, 68, 0.9); box-shadow: 0 0 30px var(--gold-glow);">
              <img src="assets/c_sanctuary.png" alt="كنيسة مارمرقس الرسول" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
            </div>

            <!-- Anba Morcos -->
            <div class="floating-leader-left" style="position: relative; width: 74px; height: 74px; border-radius: 50%; padding: 3px; background: linear-gradient(135deg, var(--gold-bright), var(--gold)); box-shadow: 0 0 20px var(--gold-glow);">
              <img src="assets/anba_morcos.jpg" alt="نيافة الأنبا مرقص" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; object-position: center 15%;">
            </div>
          </div>

          <div style="display: inline-block; padding: 5px 18px; border-radius: 20px; background: rgba(218, 178, 60, 0.18); border: 1.5px solid var(--gold); color: var(--gold-bright); font-size: 16px; font-weight: 800; margin-bottom: 10px;">
            ⛪ مطرانية شبرا الخيمة وتوابعها — كنيسة مارمرقس الرسول
          </div>

          <h3 style="font-size: 25px; font-weight: 900; color: var(--white); margin-bottom: 8px;">
            مدرسة الكاروز للكتاب المقدس<br><span style="color: var(--gold-bright);">تحت رعاية الأباء الأجلاء</span>
          </h3>

          <p style="font-size: 15.5px; color: var(--muted); line-height: 1.55; font-weight: 600; margin-bottom: 16px;">
            برعاية قداسة البابا المعظم الأنبا تواضروس الثاني وشريكه في الخدمة الرسولية نيافة الحبر الجليل الأنبا مرقص.
          </p>

          '''
        content = content[:s9_p] + new_s9_card + content[s9_end_p:]
        print('Slide 9 card updated successfully')

with open(script_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('build_luxurious_presentation.py updated successfully!')
