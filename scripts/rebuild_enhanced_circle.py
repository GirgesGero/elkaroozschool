import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

# Script to reconstruct the presentation with:
# 1. Enlarge cards (254px x 76px, with main title, subtitle, number badge, icon box).
# 2. Grand, true circular radial geometry (Rx=550px, Ry=275px).
# 3. New high-tech sacred SVG routes with glowing dashed concentric orbits and radial rays connecting each card to the center hub.
# 4. Interactive ray and hub synchronization.

with open('scripts/build_luxurious_presentation.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace CSS for Slide 5
css_start = '/* ==========================================================================\n       FULL-SCREEN 10-SECTION ORBITAL DIAL (SLIDE 5)'
css_end = '/* ==========================================================================\n       BOTTOM DECK CONTROLS & PROGRESS BAR'

p_c1 = text.find(css_start)
p_c2 = text.find(css_end)

if p_c1 == -1 or p_c2 == -1:
    print("Error: CSS markers not found", p_c1, p_c2)
    sys.exit(1)

new_css = '''/* ==========================================================================
       FULL-SCREEN 10-SECTION ORBITAL DIAL & SVG ROUTES (SLIDE 5)
       ========================================================================== */
    .enc-full-stage {
      position: relative;
      width: 1400px;
      height: 680px;
      margin: 0 auto;
    }

    .enc-routes-svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    }

    .svg-orbit-outer {
      animation: dashMove 55s linear infinite;
    }
    .svg-orbit-mid {
      animation: dashMoveRev 45s linear infinite;
    }
    .svg-orbit-inner {
      animation: dashMove 35s linear infinite;
    }

    @keyframes dashMove {
      0% { stroke-dashoffset: 0; }
      100% { stroke-dashoffset: 1000; }
    }
    @keyframes dashMoveRev {
      0% { stroke-dashoffset: 0; }
      100% { stroke-dashoffset: -1000; }
    }

    .route-ray {
      transition: stroke 0.3s ease, stroke-width 0.3s ease;
    }
    .route-ray.active-ray {
      animation: pulseRay 2s ease-in-out infinite alternate;
    }
    @keyframes pulseRay {
      0% { opacity: 0.85; stroke-width: 3px; }
      100% { opacity: 1; stroke-width: 4.5px; }
    }

    /* Grand Center Hub */
    .enc-grand-hub {
      position: absolute;
      left: 700px;
      top: 340px;
      transform: translate(-50%, -50%);
      width: 420px;
      min-height: 310px;
      padding: 22px 28px;
      border-radius: 28px;
      background: linear-gradient(135deg, rgba(14, 28, 62, 0.96) 0%, rgba(7, 15, 36, 0.98) 100%);
      border: 2px solid var(--gold);
      box-shadow: 0 0 50px rgba(0, 0, 0, 0.85), 0 0 35px rgba(218, 178, 60, 0.3), inset 0 0 30px rgba(218, 178, 60, 0.12);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      z-index: 15;
      transition: border-color 0.35s ease, box-shadow 0.35s ease;
    }

    .enc-hub-emblem {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 6px;
    }
    .enc-hub-emblem img {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      border: 2px solid var(--gold);
      box-shadow: 0 0 16px var(--gold-glow);
    }

    .enc-hub-title {
      font-size: 28px;
      font-weight: 900;
      color: var(--gold-bright);
      margin: 4px 0 6px 0;
      line-height: 1.25;
      text-shadow: 0 2px 14px rgba(218, 178, 60, 0.4);
    }
    .enc-hub-tag {
      display: inline-block;
      font-size: 13.5px;
      font-weight: 800;
      padding: 4px 16px;
      border-radius: 12px;
      background: rgba(218, 178, 60, 0.18);
      color: var(--gold-bright);
      border: 1px solid rgba(218, 178, 60, 0.4);
      margin-bottom: 10px;
    }
    .enc-hub-desc {
      font-size: 15.5px;
      color: #e2e8f0;
      line-height: 1.6;
      font-weight: 600;
      margin: 0 0 12px 0;
    }
    .enc-hub-footer {
      font-size: 13px;
      color: var(--cyan);
      font-weight: 800;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      padding-top: 10px;
      width: 100%;
    }

    /* Enlarged Orbital Nodes (10 Sections) */
    .enc-grand-node {
      position: absolute;
      width: 254px;
      height: 76px;
      padding: 10px 14px;
      border-radius: 20px;
      background: linear-gradient(135deg, rgba(16, 32, 70, 0.94) 0%, rgba(9, 18, 42, 0.98) 100%);
      border: 1.5px solid var(--card-border);
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.12);
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      user-select: none;
      z-index: 10;
      transform: translate(-50%, -50%);
      transition: border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease, transform 0.25s ease;
    }
    .enc-grand-node:hover {
      border-color: var(--gold-bright);
      box-shadow: 0 0 30px var(--gold-glow), 0 12px 35px rgba(0, 0, 0, 0.75);
      transform: translate(-50%, -50%) scale(1.05);
      background: linear-gradient(135deg, rgba(22, 44, 95, 0.98) 0%, rgba(12, 24, 56, 1) 100%);
    }
    .enc-grand-node.active {
      border-color: var(--gold-bright) !important;
      box-shadow: 0 0 40px var(--gold-bright), 0 16px 45px rgba(0, 0, 0, 0.9) !important;
      transform: translate(-50%, -50%) scale(1.08) !important;
      background: linear-gradient(135deg, rgba(28, 54, 116, 1) 0%, rgba(15, 30, 68, 1) 100%) !important;
    }

    .node-number-badge {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13.5px;
      font-weight: 900;
      flex-shrink: 0;
      background: rgba(255, 255, 255, 0.08);
      border: 1.5px solid var(--gold);
    }
    .node-icon-box {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .node-info-group {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex: 1;
      text-align: right;
    }
    .node-main-title {
      font-size: 15.5px;
      font-weight: 900;
      line-height: 1.25;
      color: #ffffff;
      white-space: nowrap;
    }
    .node-sub-tag {
      font-size: 12px;
      font-weight: 700;
      color: var(--muted);
      line-height: 1.2;
      margin-top: 3px;
      white-space: nowrap;
    }

    '''

text = text[:p_c1] + new_css + text[p_c2:]
print("CSS updated successfully")

# Replace Slide 5 HTML
s5_start = '    <!-- ========================================================================\n         الشريحة 5: موسوعة العلوم الكنسية (الدائرة الكبرى الممتدة بالكامل)\n         ======================================================================== -->\n    <section class="slide" id="slide-5">'
s5_end = '    <!-- ========================================================================\n         الشريحة 6: وثوقية واعتماد المصادر الكنسية وسلامة التعليم'

p_s1 = text.find(s5_start)
p_s2 = text.find(s5_end)

if p_s1 == -1 or p_s2 == -1:
    print("Error: Slide 5 HTML markers not found", p_s1, p_s2)
    sys.exit(1)

new_s5_html = '''    <!-- ========================================================================
         الشريحة 5: موسوعة العلوم الكنسية (الدائرة الكبرى الممتدة بالكامل)
         ======================================================================== -->
    <section class="slide" id="slide-5">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="شعار مدرسة الكاروز" class="church-logo">
          <h2 class="slide-title">أقسام موسوعة الكتاب المقدس التفاعلية</h2>
        </div>
        <div class="slide-badge" style="color: var(--gold-bright); border-color: rgba(218, 178, 60, 0.45);">
          <span>📚</span> 10 أقسام متخصصة في مدار معرفي متكامل
        </div>
      </header>

      <!-- Full-Screen Stage with Custom SVG Routes & Enlarged Cards -->
      <div class="enc-full-stage">
        <!-- SVG Routes System (مسارات وأوربتات وشعاعات مضيئة) -->
        <svg class="enc-routes-svg" viewBox="0 0 1400 680" preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="strongGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur1" />
              <feGaussianBlur stdDeviation="2" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="orbitGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffd700" stop-opacity="0.75" />
              <stop offset="50%" stop-color="#00e5ff" stop-opacity="0.4" />
              <stop offset="100%" stop-color="#dab23c" stop-opacity="0.75" />
            </linearGradient>
          </defs>

          <!-- Concentric Orbit Routes (مسارات المدارات الفلكية) -->
          <ellipse cx="700" cy="340" rx="550" ry="275" fill="none" stroke="url(#orbitGoldGrad)" stroke-width="2.2" stroke-dasharray="10 8" filter="url(#routeGlow)" class="svg-orbit-outer" />
          <ellipse cx="700" cy="340" rx="410" ry="205" fill="none" stroke="rgba(0, 196, 236, 0.35)" stroke-width="1.6" stroke-dasharray="16 10" class="svg-orbit-mid" />
          <ellipse cx="700" cy="340" rx="275" ry="140" fill="none" stroke="rgba(218, 178, 60, 0.28)" stroke-width="1.2" stroke-dasharray="5 5" class="svg-orbit-inner" />

          <!-- Radial Connecting Rays (الروتات الشعاعية الواصلة بين المركز والكروت) -->
          <line id="ray-sec1" class="route-ray active-ray" x1="700" y1="340" x2="700" y2="65" stroke="var(--gold-bright)" stroke-width="3" stroke-dasharray="6 6" filter="url(#routeGlow)" />
          <line id="ray-sec2" class="route-ray" x1="700" y1="340" x2="1023" y2="118" stroke="rgba(218, 178, 60, 0.28)" stroke-width="1.8" stroke-dasharray="6 6" filter="url(#routeGlow)" />
          <line id="ray-sec3" class="route-ray" x1="700" y1="340" x2="1223" y2="255" stroke="rgba(218, 178, 60, 0.28)" stroke-width="1.8" stroke-dasharray="6 6" filter="url(#routeGlow)" />
          <line id="ray-sec4" class="route-ray" x1="700" y1="340" x2="1223" y2="425" stroke="rgba(218, 178, 60, 0.28)" stroke-width="1.8" stroke-dasharray="6 6" filter="url(#routeGlow)" />
          <line id="ray-sec5" class="route-ray" x1="700" y1="340" x2="1023" y2="563" stroke="rgba(218, 178, 60, 0.28)" stroke-width="1.8" stroke-dasharray="6 6" filter="url(#routeGlow)" />
          <line id="ray-sec6" class="route-ray" x1="700" y1="340" x2="700" y2="615" stroke="rgba(218, 178, 60, 0.28)" stroke-width="1.8" stroke-dasharray="6 6" filter="url(#routeGlow)" />
          <line id="ray-sec7" class="route-ray" x1="700" y1="340" x2="377" y2="563" stroke="rgba(218, 178, 60, 0.28)" stroke-width="1.8" stroke-dasharray="6 6" filter="url(#routeGlow)" />
          <line id="ray-sec8" class="route-ray" x1="700" y1="340" x2="177" y2="425" stroke="rgba(218, 178, 60, 0.28)" stroke-width="1.8" stroke-dasharray="6 6" filter="url(#routeGlow)" />
          <line id="ray-sec9" class="route-ray" x1="700" y1="340" x2="177" y2="255" stroke="rgba(218, 178, 60, 0.28)" stroke-width="1.8" stroke-dasharray="6 6" filter="url(#routeGlow)" />
          <line id="ray-sec10" class="route-ray" x1="700" y1="340" x2="377" y2="118" stroke="rgba(218, 178, 60, 0.28)" stroke-width="1.8" stroke-dasharray="6 6" filter="url(#routeGlow)" />

          <!-- Junction Connector Dots (عقد الاتصال المضيئة) -->
          <circle id="dot-sec1" cx="700" cy="65" r="7" fill="#ffda66" filter="url(#strongGlow)" />
          <circle id="dot-sec2" cx="1023" cy="118" r="4" fill="#00e5ff" opacity="0.8" />
          <circle id="dot-sec3" cx="1223" cy="255" r="4" fill="#10c48a" opacity="0.8" />
          <circle id="dot-sec4" cx="1223" cy="425" r="4" fill="#c084fc" opacity="0.8" />
          <circle id="dot-sec5" cx="1023" cy="563" r="4" fill="#ff6b81" opacity="0.8" />
          <circle id="dot-sec6" cx="700" cy="615" r="4" fill="#f59e0b" opacity="0.8" />
          <circle id="dot-sec7" cx="377" cy="563" r="4" fill="#2dd4bf" opacity="0.8" />
          <circle id="dot-sec8" cx="177" cy="425" r="4" fill="#38bdf8" opacity="0.8" />
          <circle id="dot-sec9" cx="177" cy="255" r="4" fill="#fbbf24" opacity="0.8" />
          <circle id="dot-sec10" cx="377" cy="118" r="4" fill="#818cf8" opacity="0.8" />
        </svg>

        <!-- Grand Interactive Center Hub (مركز الدائرة التفاعلي) -->
        <div class="enc-grand-hub" id="encGrandHub">
          <div class="enc-hub-emblem">
            <img src="assets/c_sanctuary.png" alt="موسوعة الكاروز">
            <span style="font-size: 15px; font-weight: 900; color: var(--gold-bright);">موسوعة الكاروز الشاملة</span>
          </div>
          <h3 class="enc-hub-title text-liquid-gold" id="encHubTitle">الكتاب المقدس</h3>
          <span class="enc-hub-tag" id="encHubTag">نص قانوني موثق 100%</span>
          <p class="enc-hub-desc" id="encHubDesc">
            الـ 73 سفراً القانونية كاملة بالتشكيل الدقيق، مع فهارس ذكية، تقسيم أصحاحات وشواهد، والأسفار القانونية الثانية.
          </p>
          <div class="enc-hub-footer" id="encHubFooter">
            ✨ اضغط على أي قسم في الدائرة لمعاينة تفاصيله ومحتواه
          </div>
        </div>

        <!-- ==================== THE 10 ENLARGED NODES ==================== -->

        <!-- Node 1: الكتاب المقدس (Top Center) -->
        <div class="enc-grand-node active" data-sec="sec1" onclick="switchEncSection('sec1', this, event)" style="left: 700px; top: 65px; border-color: var(--gold-bright);">
          <div class="node-number-badge" style="color: var(--gold-bright); border-color: var(--gold-bright);">01</div>
          <div class="node-icon-box" style="background: rgba(218, 178, 60, 0.18); border-color: var(--gold);">
            <span>📖</span>
          </div>
          <div class="node-info-group">
            <span class="node-main-title">الكتاب المقدس</span>
            <span class="node-sub-tag">الـ 73 سفراً القانونية بالتشكيل</span>
          </div>
        </div>

        <!-- Node 2: تفسير الكتاب المقدس (Upper Right) -->
        <div class="enc-grand-node" data-sec="sec2" onclick="switchEncSection('sec2', this, event)" style="left: 1023px; top: 118px; border-color: var(--cyan);">
          <div class="node-number-badge" style="color: var(--cyan); border-color: var(--cyan);">02</div>
          <div class="node-icon-box" style="background: rgba(0, 196, 236, 0.18); border-color: var(--cyan);">
            <span>📜</span>
          </div>
          <div class="node-info-group">
            <span class="node-main-title">تفسير الكتاب المقدس</span>
            <span class="node-sub-tag">تفاسير الآباء والقمص تادرس</span>
          </div>
        </div>

        <!-- Node 3: ترجمات الكتاب المقدس (Middle Right Top) -->
        <div class="enc-grand-node" data-sec="sec3" onclick="switchEncSection('sec3', this, event)" style="left: 1223px; top: 255px; border-color: var(--emerald);">
          <div class="node-number-badge" style="color: var(--emerald); border-color: var(--emerald);">03</div>
          <div class="node-icon-box" style="background: rgba(16, 196, 138, 0.18); border-color: var(--emerald);">
            <span>🌐</span>
          </div>
          <div class="node-info-group">
            <span class="node-main-title">ترجمات الكتاب المقدس</span>
            <span class="node-sub-tag">مقارنة النصوص والترجمات</span>
          </div>
        </div>

        <!-- Node 4: مخطوطات الكتاب المقدس (Middle Right Bottom) -->
        <div class="enc-grand-node" data-sec="sec4" onclick="switchEncSection('sec4', this, event)" style="left: 1223px; top: 425px; border-color: #c084fc;">
          <div class="node-number-badge" style="color: #c084fc; border-color: #c084fc);">04</div>
          <div class="node-icon-box" style="background: rgba(192, 132, 252, 0.18); border-color: #c084fc;">
            <span>🏛️</span>
          </div>
          <div class="node-info-group">
            <span class="node-main-title">مخطوطات الكتاب المقدس</span>
            <span class="node-sub-tag">أدلة الأصالة والمخطوطات الأثرية</span>
          </div>
        </div>

        <!-- Node 5: شبهات الكتاب المقدس (Lower Right) -->
        <div class="enc-grand-node" data-sec="sec5" onclick="switchEncSection('sec5', this, event)" style="left: 1023px; top: 563px; border-color: #ff6b81;">
          <div class="node-number-badge" style="color: #ff6b81; border-color: #ff6b81);">05</div>
          <div class="node-icon-box" style="background: rgba(255, 107, 129, 0.18); border-color: #ff6b81;">
            <span>🛡️</span>
          </div>
          <div class="node-info-group">
            <span class="node-main-title">شبهات الكتاب المقدس</span>
            <span class="node-sub-tag">ردود دفاعية ولاهوتية موثقة</span>
          </div>
        </div>

        <!-- Node 6: أطلس الكتاب المقدس (Bottom Center) -->
        <div class="enc-grand-node" data-sec="sec6" onclick="switchEncSection('sec6', this, event)" style="left: 700px; top: 615px; border-color: #f59e0b;">
          <div class="node-number-badge" style="color: #f59e0b; border-color: #f59e0b);">06</div>
          <div class="node-icon-box" style="background: rgba(245, 158, 11, 0.18); border-color: #f59e0b;">
            <span>🗺️</span>
          </div>
          <div class="node-info-group">
            <span class="node-main-title">أطلس الكتاب المقدس</span>
            <span class="node-sub-tag">خرائط تفاعلية لمواقع الأحداث</span>
          </div>
        </div>

        <!-- Node 7: الشخصيات الكتابية (Lower Left) -->
        <div class="enc-grand-node" data-sec="sec7" onclick="switchEncSection('sec7', this, event)" style="left: 377px; top: 563px; border-color: #2dd4bf;">
          <div class="node-number-badge" style="color: #2dd4bf; border-color: #2dd4bf);">07</div>
          <div class="node-icon-box" style="background: rgba(45, 212, 191, 0.18); border-color: #2dd4bf;">
            <span>👥</span>
          </div>
          <div class="node-info-group">
            <span class="node-main-title">الشخصيات الكتابية</span>
            <span class="node-sub-tag">سير وتراجم أعلام العهدين</span>
          </div>
        </div>

        <!-- Node 8: الأماكن والشعوب (Middle Left Bottom) -->
        <div class="enc-grand-node" data-sec="sec8" onclick="switchEncSection('sec8', this, event)" style="left: 177px; top: 425px; border-color: #38bdf8;">
          <div class="node-number-badge" style="color: #38bdf8; border-color: #38bdf8);">08</div>
          <div class="node-icon-box" style="background: rgba(56, 189, 248, 0.18); border-color: #38bdf8;">
            <span>🏰</span>
          </div>
          <div class="node-info-group">
            <span class="node-main-title">الأماكن والشعوب</span>
            <span class="node-sub-tag">توثيق تاريخي للمدن والقرى</span>
          </div>
        </div>

        <!-- Node 9: الماراثون الروحي (Middle Left Top) -->
        <div class="enc-grand-node" data-sec="sec9" onclick="switchEncSection('sec9', this, event)" style="left: 177px; top: 255px; border-color: #fbbf24;">
          <div class="node-number-badge" style="color: #fbbf24; border-color: #fbbf24);">09</div>
          <div class="node-icon-box" style="background: rgba(251, 191, 36, 0.18); border-color: #fbbf24;">
            <span>🏆</span>
          </div>
          <div class="node-info-group">
            <span class="node-main-title">الماراثون الروحي</span>
            <span class="node-sub-tag">بنك الأسئلة والتنافس الأسبوعي</span>
          </div>
        </div>

        <!-- Node 10: قواميس الكتاب المقدس (Upper Left) -->
        <div class="enc-grand-node" data-sec="sec10" onclick="switchEncSection('sec10', this, event)" style="left: 377px; top: 118px; border-color: #818cf8;">
          <div class="node-number-badge" style="color: #818cf8; border-color: #818cf8);">10</div>
          <div class="node-icon-box" style="background: rgba(129, 140, 248, 0.18); border-color: #818cf8;">
            <span>📚</span>
          </div>
          <div class="node-info-group">
            <span class="node-main-title">قواميس ومعاجم الكتاب</span>
            <span class="node-sub-tag">معجم المصطلحات والرموز</span>
          </div>
        </div>

      </div>

      <footer class="slide-footer">
        <div>أضخم قاعدة معرفية كنسية متكاملة لربط الطالب والمخدوم بكلمة الله وتراث الكنيسة الحي</div>
        <div>الشريحة 5 من 9</div>
      </footer>
    </section>

'''

text = text[:p_s1] + new_s5_html + text[p_s2:]
print("HTML updated successfully")

# Update JavaScript switchEncSection to synchronize the SVG rays and dots
js_target = 'function switchEncSection(secKey, el, e) {'
js_p = text.find(js_target)
if js_p != -1:
    js_end_target = '// Initial counter activation'
    js_p2 = text.find(js_end_target, js_p)
    if js_p2 != -1:
        new_js = '''function switchEncSection(secKey, el, e) {
      if (e) e.stopPropagation();
      document.querySelectorAll('.enc-grand-node').forEach(item => item.classList.remove('active'));
      el.classList.add('active');

      const data = encSectionsData[secKey];
      if (!data) return;

      // Update SVG Rays & Dots
      document.querySelectorAll('.route-ray').forEach(r => {
        r.setAttribute('stroke', 'rgba(218, 178, 60, 0.28)');
        r.setAttribute('stroke-width', '1.8');
        r.classList.remove('active-ray');
      });
      const activeRay = document.getElementById(`ray-${secKey}`);
      if (activeRay) {
        activeRay.setAttribute('stroke', data.color);
        activeRay.setAttribute('stroke-width', '3.5');
        activeRay.classList.add('active-ray');
      }

      document.querySelectorAll('[id^="dot-"]').forEach(d => {
        d.setAttribute('r', '4');
        d.setAttribute('opacity', '0.8');
      });
      const activeDot = document.getElementById(`dot-${secKey}`);
      if (activeDot) {
        activeDot.setAttribute('r', '7');
        activeDot.setAttribute('opacity', '1');
        activeDot.setAttribute('fill', data.color);
      }

      const title = document.getElementById('encHubTitle');
      const desc = document.getElementById('encHubDesc');
      const tag = document.getElementById('encHubTag');
      const hub = document.getElementById('encGrandHub');

      if (hub && title && desc && tag) {
        gsap.to(hub, { opacity: 0.4, scale: 0.97, duration: 0.14, onComplete: () => {
          title.textContent = data.title;
          title.style.color = data.color;
          desc.textContent = data.desc;
          tag.textContent = data.tag;
          tag.style.color = data.color;
          tag.style.background = data.bg;
          tag.style.borderColor = data.color;
          hub.style.borderColor = data.color;
          hub.style.boxShadow = `0 0 55px rgba(0, 0, 0, 0.85), 0 0 38px ${data.color}, inset 0 0 30px rgba(218, 178, 60, 0.12)`;
          gsap.to(hub, { opacity: 1, scale: 1, duration: 0.22, ease: "power2.out" });
        }});
      }
    }

    '''
        text = text[:js_p] + new_js + text[js_p2:]
        print("JS updated successfully")

# Write to build_luxurious_presentation.py
with open('scripts/build_luxurious_presentation.py', 'w', encoding='utf-8') as f:
    f.write(text)

# Also run build_luxurious_presentation.py
print("Running build_luxurious_presentation.py...")
exec(compile(text, 'scripts/build_luxurious_presentation.py', 'exec'))
print("Done!")
