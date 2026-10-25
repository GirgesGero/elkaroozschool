import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

# Reconstruct Slide 5 with:
# 1. Enlarged cards (276px x 80px) with unified icon-badge box + corner number + full titles & subtitles without truncation.
# 2. Harmonious circular radial orbit geometry (Rx=530px, Ry=290px, Center=(700, 345)).
# 3. New celestial SVG routes with glowing dashed multi-ring orbits, radial energy beams, and illuminated connector nodes.
# 4. Interactive synchronization for SVG rays and center hub.

with open('scripts/build_luxurious_presentation.py', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update CSS for Slide 5
css_start = '/* ==========================================================================\n       FULL-SCREEN 10-SECTION ORBITAL DIAL'
css_end = '/* ==========================================================================\n       BOTTOM DECK CONTROLS & PROGRESS BAR'

p_c1 = text.find(css_start)
p_c2 = text.find(css_end)

if p_c1 == -1 or p_c2 == -1:
    print("Error: CSS markers not found", p_c1, p_c2)
    sys.exit(1)

new_css = '''/* ==========================================================================
       FULL-SCREEN 10-SECTION ORBITAL DIAL & CELESTIAL SVG ROUTES (SLIDE 5)
       ========================================================================== */
    .enc-full-stage {
      position: relative;
      width: 1400px;
      height: 690px;
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
      transition: stroke 0.3s ease, stroke-width 0.3s ease, opacity 0.3s ease;
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
      top: 345px;
      transform: translate(-50%, -50%);
      width: 410px;
      min-height: 300px;
      padding: 22px 28px;
      border-radius: 30px;
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
      width: 44px;
      height: 44px;
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

    /* Enlarged Luxury Orbital Nodes (10 Sections) */
    .enc-grand-node {
      position: absolute;
      width: 288px;
      height: 80px;
      padding: 10px 14px;
      border-radius: 20px;
      background: linear-gradient(135deg, rgba(16, 32, 72, 0.95) 0%, rgba(9, 18, 44, 0.98) 100%);
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
      box-shadow: 0 0 32px var(--gold-glow), 0 12px 35px rgba(0, 0, 0, 0.75);
      transform: translate(-50%, -50%) scale(1.05);
      background: linear-gradient(135deg, rgba(22, 44, 96, 0.98) 0%, rgba(12, 24, 56, 1) 100%);
    }
    .enc-grand-node.active {
      border-color: var(--gold-bright) !important;
      box-shadow: 0 0 42px var(--gold-bright), 0 16px 45px rgba(0, 0, 0, 0.9) !important;
      transform: translate(-50%, -50%) scale(1.08) !important;
      background: linear-gradient(135deg, rgba(28, 56, 120, 1) 0%, rgba(15, 30, 68, 1) 100%) !important;
    }

    /* Unified Medallion Box with Corner Number */
    .node-badge-box {
      width: 50px;
      height: 50px;
      border-radius: 14px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border: 1.5px solid;
    }
    .node-badge-icon {
      font-size: 24px;
      line-height: 1;
    }
    .node-badge-num {
      position: absolute;
      top: -6px;
      right: -6px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      font-size: 10.5px;
      font-weight: 900;
      background: #060e22;
      border: 1.5px solid;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.8);
    }

    .node-info-group {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex: 1;
      text-align: right;
    }
    .node-main-title {
      font-size: 15px;
      font-weight: 900;
      line-height: 1.25;
      color: #ffffff;
      white-space: nowrap;
    }
    .node-sub-tag {
      font-size: 12px;
      font-weight: 700;
      color: #cbd5e1;
      line-height: 1.2;
      margin-top: 3px;
      white-space: nowrap;
    }

    '''

text = text[:p_c1] + new_css + text[p_c2:]
print("CSS updated successfully")

# 2. Update Slide 5 HTML
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

      <!-- Full-Screen Stage with Celestial SVG Routes & Enlarged Cards -->
      <div class="enc-full-stage">
        <!-- SVG Routes System (مسارات وأوربتات وشعاعات مضيئة) -->
        <svg class="enc-routes-svg" viewBox="0 0 1400 690" preserveAspectRatio="xMidYMid meet">
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
              <stop offset="0%" stop-color="#ffd700" stop-opacity="0.8" />
              <stop offset="50%" stop-color="#00e5ff" stop-opacity="0.45" />
              <stop offset="100%" stop-color="#dab23c" stop-opacity="0.8" />
            </linearGradient>
          </defs>

          <!-- Concentric Celestial Orbits (مسارات المدارات الفلكية) -->
          <ellipse cx="700" cy="345" rx="530" ry="290" fill="none" stroke="url(#orbitGoldGrad)" stroke-width="2.5" stroke-dasharray="12 8" filter="url(#routeGlow)" class="svg-orbit-outer" />
          <ellipse cx="700" cy="345" rx="390" ry="215" fill="none" stroke="rgba(0, 196, 236, 0.4)" stroke-width="1.8" stroke-dasharray="14 8" class="svg-orbit-mid" />
          <circle cx="700" cy="345" r="170" fill="none" stroke="rgba(218, 178, 60, 0.3)" stroke-width="1.2" stroke-dasharray="6 6" class="svg-orbit-inner" />

          <!-- Radial Connecting Rays (الروتات الشعاعية الواصلة بين المركز والكروت) -->
          <line id="ray-sec1" class="route-ray active-ray" x1="700" y1="345" x2="700" y2="55" stroke="var(--gold-bright)" stroke-width="3.5" stroke-dasharray="6 6" filter="url(#routeGlow)" />
          <line id="ray-sec2" class="route-ray" x1="700" y1="345" x2="1012" y2="110" stroke="rgba(218, 178, 60, 0.28)" stroke-width="1.8" stroke-dasharray="6 6" filter="url(#routeGlow)" />
          <line id="ray-sec3" class="route-ray" x1="700" y1="345" x2="1204" y2="255" stroke="rgba(218, 178, 60, 0.28)" stroke-width="1.8" stroke-dasharray="6 6" filter="url(#routeGlow)" />
          <line id="ray-sec4" class="route-ray" x1="700" y1="345" x2="1204" y2="435" stroke="rgba(218, 178, 60, 0.28)" stroke-width="1.8" stroke-dasharray="6 6" filter="url(#routeGlow)" />
          <line id="ray-sec5" class="route-ray" x1="700" y1="345" x2="1012" y2="580" stroke="rgba(218, 178, 60, 0.28)" stroke-width="1.8" stroke-dasharray="6 6" filter="url(#routeGlow)" />
          <line id="ray-sec6" class="route-ray" x1="700" y1="345" x2="700" y2="635" stroke="rgba(218, 178, 60, 0.28)" stroke-width="1.8" stroke-dasharray="6 6" filter="url(#routeGlow)" />
          <line id="ray-sec7" class="route-ray" x1="700" y1="345" x2="388" y2="580" stroke="rgba(218, 178, 60, 0.28)" stroke-width="1.8" stroke-dasharray="6 6" filter="url(#routeGlow)" />
          <line id="ray-sec8" class="route-ray" x1="700" y1="345" x2="196" y2="435" stroke="rgba(218, 178, 60, 0.28)" stroke-width="1.8" stroke-dasharray="6 6" filter="url(#routeGlow)" />
          <line id="ray-sec9" class="route-ray" x1="700" y1="345" x2="196" y2="255" stroke="rgba(218, 178, 60, 0.28)" stroke-width="1.8" stroke-dasharray="6 6" filter="url(#routeGlow)" />
          <line id="ray-sec10" class="route-ray" x1="700" y1="345" x2="388" y2="110" stroke="rgba(218, 178, 60, 0.28)" stroke-width="1.8" stroke-dasharray="6 6" filter="url(#routeGlow)" />

          <!-- Junction Connector Dots (عقد الاتصال المضيئة) -->
          <circle id="dot-sec1" cx="700" cy="55" r="7" fill="#ffda66" filter="url(#strongGlow)" />
          <circle id="dot-sec2" cx="1012" cy="110" r="4.5" fill="#00e5ff" opacity="0.8" />
          <circle id="dot-sec3" cx="1204" cy="255" r="4.5" fill="#10c48a" opacity="0.8" />
          <circle id="dot-sec4" cx="1204" cy="435" r="4.5" fill="#c084fc" opacity="0.8" />
          <circle id="dot-sec5" cx="1012" cy="580" r="4.5" fill="#ff6b81" opacity="0.8" />
          <circle id="dot-sec6" cx="700" cy="635" r="4.5" fill="#f59e0b" opacity="0.8" />
          <circle id="dot-sec7" cx="388" cy="580" r="4.5" fill="#2dd4bf" opacity="0.8" />
          <circle id="dot-sec8" cx="196" cy="435" r="4.5" fill="#38bdf8" opacity="0.8" />
          <circle id="dot-sec9" cx="196" cy="255" r="4.5" fill="#fbbf24" opacity="0.8" />
          <circle id="dot-sec10" cx="388" cy="110" r="4.5" fill="#818cf8" opacity="0.8" />
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
        <div class="enc-grand-node active" data-sec="sec1" onclick="switchEncSection('sec1', this, event)" style="left: 700px; top: 55px; border-color: var(--gold-bright);">
          <div class="node-badge-box" style="background: rgba(218, 178, 60, 0.16); border-color: var(--gold);">
            <span class="node-badge-icon">📖</span>
            <span class="node-badge-num" style="color: var(--gold-bright); border-color: var(--gold);">01</span>
          </div>
          <div class="node-info-group">
            <span class="node-main-title">الكتاب المقدس</span>
            <span class="node-sub-tag">الـ 73 سفراً القانونية بالتشكيل</span>
          </div>
        </div>

        <!-- Node 2: تفسير الكتاب المقدس (Upper Right) -->
        <div class="enc-grand-node" data-sec="sec2" onclick="switchEncSection('sec2', this, event)" style="left: 1012px; top: 110px; border-color: var(--cyan);">
          <div class="node-badge-box" style="background: rgba(0, 196, 236, 0.16); border-color: var(--cyan);">
            <span class="node-badge-icon">📜</span>
            <span class="node-badge-num" style="color: var(--cyan); border-color: var(--cyan);">02</span>
          </div>
          <div class="node-info-group">
            <span class="node-main-title">تفسير الكتاب المقدس</span>
            <span class="node-sub-tag">تفاسير الآباء والقمص تادرس</span>
          </div>
        </div>

        <!-- Node 3: ترجمات الكتاب المقدس (Middle Right Top) -->
        <div class="enc-grand-node" data-sec="sec3" onclick="switchEncSection('sec3', this, event)" style="left: 1204px; top: 255px; border-color: var(--emerald);">
          <div class="node-badge-box" style="background: rgba(16, 196, 138, 0.16); border-color: var(--emerald);">
            <span class="node-badge-icon">🌐</span>
            <span class="node-badge-num" style="color: var(--emerald); border-color: var(--emerald);">03</span>
          </div>
          <div class="node-info-group">
            <span class="node-main-title">ترجمات الكتاب المقدس</span>
            <span class="node-sub-tag">مقارنة النصوص والترجمات</span>
          </div>
        </div>

        <!-- Node 4: مخطوطات الكتاب المقدس (Middle Right Bottom) -->
        <div class="enc-grand-node" data-sec="sec4" onclick="switchEncSection('sec4', this, event)" style="left: 1204px; top: 435px; border-color: #c084fc;">
          <div class="node-badge-box" style="background: rgba(192, 132, 252, 0.16); border-color: #c084fc;">
            <span class="node-badge-icon">🏛️</span>
            <span class="node-badge-num" style="color: #c084fc; border-color: #c084fc;">04</span>
          </div>
          <div class="node-info-group">
            <span class="node-main-title">مخطوطات الكتاب المقدس</span>
            <span class="node-sub-tag">أدلة الأصالة والمخطوطات الأثرية</span>
          </div>
        </div>

        <!-- Node 5: شبهات الكتاب المقدس (Lower Right) -->
        <div class="enc-grand-node" data-sec="sec5" onclick="switchEncSection('sec5', this, event)" style="left: 1012px; top: 580px; border-color: #ff6b81;">
          <div class="node-badge-box" style="background: rgba(255, 107, 129, 0.16); border-color: #ff6b81;">
            <span class="node-badge-icon">🛡️</span>
            <span class="node-badge-num" style="color: #ff6b81; border-color: #ff6b81;">05</span>
          </div>
          <div class="node-info-group">
            <span class="node-main-title">شبهات الكتاب المقدس</span>
            <span class="node-sub-tag">ردود دفاعية ولاهوتية موثقة</span>
          </div>
        </div>

        <!-- Node 6: أطلس الكتاب المقدس (Bottom Center) -->
        <div class="enc-grand-node" data-sec="sec6" onclick="switchEncSection('sec6', this, event)" style="left: 700px; top: 635px; border-color: #f59e0b;">
          <div class="node-badge-box" style="background: rgba(245, 158, 11, 0.16); border-color: #f59e0b;">
            <span class="node-badge-icon">🗺️</span>
            <span class="node-badge-num" style="color: #f59e0b; border-color: #f59e0b;">06</span>
          </div>
          <div class="node-info-group">
            <span class="node-main-title">أطلس الكتاب المقدس</span>
            <span class="node-sub-tag">خرائط تفاعلية لمواقع الأحداث</span>
          </div>
        </div>

        <!-- Node 7: الشخصيات الكتابية (Lower Left) -->
        <div class="enc-grand-node" data-sec="sec7" onclick="switchEncSection('sec7', this, event)" style="left: 388px; top: 580px; border-color: #2dd4bf;">
          <div class="node-badge-box" style="background: rgba(45, 212, 191, 0.16); border-color: #2dd4bf;">
            <span class="node-badge-icon">👥</span>
            <span class="node-badge-num" style="color: #2dd4bf; border-color: #2dd4bf;">07</span>
          </div>
          <div class="node-info-group">
            <span class="node-main-title">الشخصيات الكتابية</span>
            <span class="node-sub-tag">سير وتراجم أعلام العهدين</span>
          </div>
        </div>

        <!-- Node 8: الأماكن والشعوب (Middle Left Bottom) -->
        <div class="enc-grand-node" data-sec="sec8" onclick="switchEncSection('sec8', this, event)" style="left: 196px; top: 435px; border-color: #38bdf8;">
          <div class="node-badge-box" style="background: rgba(56, 189, 248, 0.16); border-color: #38bdf8;">
            <span class="node-badge-icon">🏰</span>
            <span class="node-badge-num" style="color: #38bdf8; border-color: #38bdf8;">08</span>
          </div>
          <div class="node-info-group">
            <span class="node-main-title">الأماكن والشعوب</span>
            <span class="node-sub-tag">توثيق تاريخي للمدن والقرى</span>
          </div>
        </div>

        <!-- Node 9: الماراثون الروحي (Middle Left Top) -->
        <div class="enc-grand-node" data-sec="sec9" onclick="switchEncSection('sec9', this, event)" style="left: 196px; top: 255px; border-color: #fbbf24;">
          <div class="node-badge-box" style="background: rgba(251, 191, 36, 0.16); border-color: #fbbf24;">
            <span class="node-badge-icon">🏆</span>
            <span class="node-badge-num" style="color: #fbbf24; border-color: #fbbf24;">09</span>
          </div>
          <div class="node-info-group">
            <span class="node-main-title">الماراثون الروحي</span>
            <span class="node-sub-tag">بنك الأسئلة والتنافس الأسبوعي</span>
          </div>
        </div>

        <!-- Node 10: قواميس الكتاب المقدس (Upper Left) -->
        <div class="enc-grand-node" data-sec="sec10" onclick="switchEncSection('sec10', this, event)" style="left: 388px; top: 110px; border-color: #818cf8;">
          <div class="node-badge-box" style="background: rgba(129, 140, 248, 0.16); border-color: #818cf8;">
            <span class="node-badge-icon">📚</span>
            <span class="node-badge-num" style="color: #818cf8; border-color: #818cf8;">10</span>
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
print("Slide 5 HTML updated successfully")

# Write to build_luxurious_presentation.py
with open('scripts/build_luxurious_presentation.py', 'w', encoding='utf-8') as f:
    f.write(text)

# Also run build_luxurious_presentation.py
print("Running build_luxurious_presentation.py...")
exec(compile(text, 'scripts/build_luxurious_presentation.py', 'exec'))
print("Build complete!")
