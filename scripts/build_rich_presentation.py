# -*- coding: utf-8 -*-
import os

dest_dir = os.path.abspath('presentation')
dest_html_file = os.path.join(dest_dir, 'index.html')
dest_presentation_copy = os.path.join(dest_dir, 'presentation.html')

html_content = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>مدرسة الكاروز للكتاب المقدس — العرض التقديمي التفاعلي السينمائي الفاخر</title>
  
  <!-- Modern Google Fonts: Cairo & Tajawal -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@500;700;900&display=swap" rel="stylesheet">

  <!-- GSAP 3 Library (Local with CDN Fallback) -->
  <script src="assets/gsap.min.js"></script>
  <script>
    if (typeof gsap === 'undefined') {
      document.write('<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"><\/script>');
    }
  </script>

  <style>
    /* ==========================================================================
       CSS RESET & LUXURY SACRED PALETTE
       ========================================================================== */
    :root {
      --bg-dark: #030712;
      --bg-midnight: #081128;
      --card-bg: rgba(10, 22, 54, 0.78);
      --card-border: rgba(218, 178, 60, 0.35);
      --card-border-hover: rgba(252, 222, 128, 0.85);
      --gold: #dab23c;
      --gold-bright: #fcde80;
      --gold-glow: rgba(218, 178, 60, 0.35);
      --cyan: #00c4ec;
      --cyan-glow: rgba(0, 196, 236, 0.35);
      --burgundy: #8e143a;
      --crimson: #e13244;
      --emerald: #10c48a;
      --white: #ffffff;
      --muted: #b4c4dc;
      --font-main: 'Cairo', 'Dubai', 'Segoe UI', Tahoma, sans-serif;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    body {
      background-color: var(--bg-dark);
      color: var(--white);
      font-family: var(--font-main);
      overflow: hidden;
      width: 100vw;
      height: 100vh;
      user-select: none;
      cursor: default;
    }

    /* Interactive Golden Dust Particles Canvas */
    #particleCanvas {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
    }

    /* Ambient Glowing Orbs Background */
    .ambient-bg {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 1;
      overflow: hidden;
    }
    .orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(65px);
      opacity: 0.6;
      animation: floatOrb 18s ease-in-out infinite alternate;
    }
    .orb-1 {
      top: -150px;
      left: -150px;
      width: 700px;
      height: 700px;
      background: radial-gradient(circle, rgba(16, 46, 110, 0.6) 0%, rgba(3, 7, 18, 0) 70%);
      animation-duration: 22s;
    }
    .orb-2 {
      bottom: -180px;
      right: -180px;
      width: 750px;
      height: 750px;
      background: radial-gradient(circle, rgba(142, 20, 58, 0.45) 0%, rgba(3, 7, 18, 0) 70%);
      animation-duration: 25s;
    }
    .orb-3 {
      top: 30%;
      right: 25%;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(0, 196, 236, 0.22) 0%, rgba(3, 7, 18, 0) 70%);
      animation-duration: 18s;
    }

    @keyframes floatOrb {
      0% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(40px, -30px) scale(1.08); }
      100% { transform: translate(-30px, 35px) scale(0.95); }
    }

    /* Animated Shimmering Golden Typography */
    .gold-shimmer {
      background: linear-gradient(90deg, #dab23c 0%, #fcde80 25%, #ffffff 50%, #fcde80 75%, #dab23c 100%);
      background-size: 200% auto;
      color: transparent;
      -webkit-background-clip: text;
      background-clip: text;
      animation: textShimmer 4s linear infinite;
    }
    @keyframes textShimmer {
      0% { background-position: 200% center; }
      100% { background-position: -200% center; }
    }

    /* Presentation Stage Container */
    .deck-container {
      position: relative;
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
      cursor: pointer; /* Allows clicking anywhere to advance */
      perspective: 1200px;
    }

    .slide {
      position: absolute;
      width: 100%;
      max-width: 1600px;
      height: 900px;
      max-height: 100vh;
      padding: 35px 55px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transform-style: preserve-3d;
      transform-origin: center center;
    }

    .slide.active {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }

    /* Header Bar */
    .slide-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      padding-bottom: 16px;
      border-bottom: 2px solid var(--card-border);
    }
    .slide-header::after {
      content: '';
      position: absolute;
      bottom: -2px;
      right: 0;
      width: 32%;
      height: 4px;
      background: linear-gradient(90deg, var(--gold), var(--cyan), transparent);
      border-radius: 4px;
      box-shadow: 0 0 12px var(--gold-glow);
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .church-logo {
      width: 58px;
      height: 58px;
      border-radius: 50%;
      border: 2px solid var(--gold);
      box-shadow: 0 0 18px var(--gold-glow);
      background-color: #0b1531;
      object-fit: cover;
      animation: pulseLogo 4s ease-in-out infinite;
    }
    @keyframes pulseLogo {
      0%, 100% { box-shadow: 0 0 15px var(--gold-glow); transform: scale(1); }
      50% { box-shadow: 0 0 25px rgba(218, 178, 60, 0.6); transform: scale(1.03); }
    }

    .slide-title {
      font-size: 30px;
      font-weight: 900;
      color: var(--white);
      letter-spacing: -0.5px;
    }

    .slide-badge {
      font-size: 14px;
      font-weight: 700;
      padding: 7px 18px;
      border-radius: 30px;
      background: rgba(14, 30, 68, 0.7);
      border: 1px solid var(--card-border);
      color: var(--gold-bright);
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 0 12px rgba(0, 0, 0, 0.4);
    }

    /* Glass Cards with 3D Tilt */
    .glass-card {
      background: var(--card-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.45);
      transition: border-color 0.3s ease, box-shadow 0.3s ease, transform 0.2s ease-out;
      transform-style: preserve-3d;
      position: relative;
      overflow: hidden;
    }
    .glass-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 50%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
      transform: skewX(-20deg);
      transition: left 0.75s ease;
      pointer-events: none;
    }
    .glass-card:hover::before {
      left: 150%;
    }
    .glass-card:hover {
      border-color: var(--card-border-hover);
      box-shadow: 0 20px 45px rgba(218, 178, 60, 0.25);
    }

    /* Floating Animation Utility */
    .floating-anim {
      animation: floatElement 5s ease-in-out infinite;
    }
    .floating-anim-delay {
      animation: floatElement 5s ease-in-out infinite;
      animation-delay: 2.5s;
    }
    @keyframes floatElement {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    /* Bottom Control Dock */
    #deckControls {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 100;
      background: rgba(9, 21, 51, 0.88);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--card-border);
      border-radius: 40px;
      padding: 9px 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6), 0 0 20px var(--gold-glow);
    }

    .ctrl-btn {
      background: transparent;
      border: 1px solid rgba(218, 178, 60, 0.3);
      color: var(--white);
      font-family: var(--font-main);
      font-size: 14px;
      font-weight: 700;
      padding: 7px 16px;
      border-radius: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.25s ease;
    }
    .ctrl-btn:hover {
      background: rgba(218, 178, 60, 0.2);
      border-color: var(--gold-bright);
      color: var(--gold-bright);
      box-shadow: 0 0 12px var(--gold-glow);
      transform: scale(1.05);
    }
    .ctrl-btn.primary {
      background: linear-gradient(135deg, var(--gold), #b89127);
      color: #040918;
      border: none;
      font-weight: 800;
      box-shadow: 0 0 15px var(--gold-glow);
    }
    .ctrl-btn.primary:hover {
      background: linear-gradient(135deg, #fcde80, var(--gold));
      transform: scale(1.07);
    }

    .dots-container {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .dot-step {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.25);
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .dot-step:hover {
      background: var(--gold-bright);
      transform: scale(1.3);
    }
    .dot-step.active {
      width: 26px;
      border-radius: 8px;
      background: linear-gradient(90deg, var(--gold), var(--gold-bright));
      box-shadow: 0 0 10px var(--gold-glow);
    }

    .slide-counter {
      font-size: 13px;
      font-weight: 700;
      color: var(--muted);
      min-width: 45px;
      text-align: center;
    }

    /* Progress Bar */
    .progress-bar-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 4px;
      background: rgba(255, 255, 255, 0.08);
      z-index: 110;
    }
    .progress-bar {
      height: 100%;
      width: 12.5%;
      background: linear-gradient(90deg, var(--cyan), var(--gold), var(--gold-bright));
      box-shadow: 0 0 12px var(--gold-glow);
      transition: width 0.4s ease;
    }

    /* Footer Metadata */
    .slide-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 14px;
      border-top: 1px solid rgba(218, 178, 60, 0.2);
      font-size: 13px;
      color: var(--muted);
    }

    /* Interactive Golden Sparkle Click Particles */
    .sparkle-particle {
      position: fixed;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--gold-bright);
      box-shadow: 0 0 10px var(--gold-bright), 0 0 20px var(--gold);
      pointer-events: none;
      z-index: 9999;
    }
    .click-ripple {
      position: fixed;
      border: 2px solid var(--gold-bright);
      border-radius: 50%;
      pointer-events: none;
      transform: translate(-50%, -50%) scale(0);
      z-index: 9998;
      box-shadow: 0 0 25px var(--gold-glow);
    }

    /* Real Screen Frame Styles */
    .screen-mockup-frame {
      border-radius: 16px;
      overflow: hidden;
      border: 2px solid rgba(218, 178, 60, 0.4);
      background: #020617;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6), 0 0 25px rgba(218, 178, 60, 0.15);
      position: relative;
    }
    .screen-mockup-header {
      background: rgba(15, 23, 42, 0.95);
      padding: 8px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(218, 178, 60, 0.2);
    }
    .browser-dots {
      display: flex;
      gap: 6px;
    }
    .browser-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
    }
    .browser-dot.red { background: #ef4444; }
    .browser-dot.yellow { background: #f59e0b; }
    .browser-dot.green { background: #10b981; }

    .browser-address {
      font-family: monospace;
      font-size: 11px;
      color: var(--muted);
      background: rgba(0, 0, 0, 0.4);
      padding: 2px 14px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    /* Interactive Tab Switcher */
    .tab-pills {
      display: flex;
      gap: 8px;
      background: rgba(0, 0, 0, 0.35);
      padding: 4px;
      border-radius: 14px;
      border: 1px solid rgba(218, 178, 60, 0.25);
    }
    .tab-pill {
      padding: 6px 14px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
      color: var(--muted);
      cursor: pointer;
      transition: all 0.25s ease;
      background: transparent;
      border: none;
    }
    .tab-pill:hover {
      color: var(--white);
    }
    .tab-pill.active {
      background: linear-gradient(135deg, var(--gold), #b89127);
      color: #040918;
      font-weight: 800;
      box-shadow: 0 0 10px var(--gold-glow);
    }

    /* Laser Scanner Beam for QR */
    .scanner-beam {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, transparent, #00c4ec, var(--gold-bright), #00c4ec, transparent);
      box-shadow: 0 0 15px #00c4ec, 0 0 25px var(--gold);
      animation: scanLaser 3s ease-in-out infinite alternate;
      z-index: 10;
    }
    @keyframes scanLaser {
      0% { top: 5%; opacity: 0.8; }
      100% { top: 95%; opacity: 0.8; }
    }
  </style>
</head>
<body>

  <!-- Background Particle Canvas -->
  <canvas id="particleCanvas"></canvas>

  <!-- Ambient Glowing Orbs -->
  <div class="ambient-bg">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
  </div>

  <!-- Top Progress Bar -->
  <div class="progress-bar-container">
    <div class="progress-bar" id="progressBar"></div>
  </div>

  <!-- Presentation Stage (Deck Container) -->
  <div class="deck-container" id="deckStage">

    <!-- ========================================================================
         SLIDE 1: COVER & EXECUTIVE OVERVIEW (Dual Showcase: Desktop + Mobile)
         ======================================================================== -->
    <section class="slide active" id="slide-1">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="مدرسة الكاروز" class="church-logo">
          <h1 class="slide-title">مدرسة الكاروز للكتاب المقدس</h1>
        </div>
        <div class="slide-badge">
          <span>✨</span> المنظومة الرقمية الكنسية الشاملة
        </div>
      </header>

      <div style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 45px; align-items: center; margin: 20px 0;">
        <!-- Right Column: Animated Typography & Value Propositions -->
        <div class="hero-info-box">
          <div style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; background: rgba(218, 178, 60, 0.15); border: 1px solid var(--gold); border-radius: 20px; font-size: 13px; color: var(--gold-bright); font-weight: 700; margin-bottom: 18px;">
            <span>⛪</span> مطرانية شبرا الخيمة وتوابعها — كنيسة مارمرقس الرسول بالمنشية
          </div>
          
          <h2 style="font-size: 42px; font-weight: 900; line-height: 1.25; margin-bottom: 16px;">
            المنظومة الرقمية الذكية <br>
            <span class="gold-shimmer">للتعليم الأكاديمي والإدارة الكنسية</span>
          </h2>
          
          <p style="font-size: 17px; line-height: 1.7; color: var(--muted); margin-bottom: 26px;">
            بوابة رقمية كنسية متكاملة تدمج بين التعليم اللاهوتي الرصين والتكنولوجيا السحابية الفائقة: رصد الحضور الذكي، إدارة الامتحانات والماراثون الروحي، وأضخم موسوعة رقمية تفاعلية لأسفار الكتاب المقدس وتفاسير الآباء.
          </p>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;">
            <div class="glass-card" style="padding: 16px; text-align: center; border-color: rgba(218, 178, 60, 0.4);">
              <div style="font-size: 28px; font-weight: 900; color: var(--gold-bright);" class="stat-number" data-target="3">0</div>
              <div style="font-size: 13px; font-weight: 700; color: var(--white);">فرق دراسية كاملة</div>
              <div style="font-size: 11px; color: var(--muted); margin-top: 2px;">صفوف أكاديمية 1، 2، 3</div>
            </div>
            
            <div class="glass-card" style="padding: 16px; text-align: center; border-color: rgba(0, 196, 236, 0.4);">
              <div style="font-size: 28px; font-weight: 900; color: var(--cyan);" class="stat-number" data-target="73">0</div>
              <div style="font-size: 13px; font-weight: 700; color: var(--white);">سفراً قانونياً موثقاً</div>
              <div style="font-size: 11px; color: var(--muted); margin-top: 2px;">تفسير القمص تادرس وأنطونيوس</div>
            </div>

            <div class="glass-card" style="padding: 16px; text-align: center; border-color: rgba(16, 196, 138, 0.4);">
              <div style="font-size: 28px; font-weight: 900; color: var(--emerald);" class="stat-number" data-target="100">0</div>
              <div style="font-size: 13px; font-weight: 700; color: var(--white);">% سحابي وفوري (PWA)</div>
              <div style="font-size: 11px; color: var(--muted); margin-top: 2px;">يعمل كتطبيق هاتف فوري</div>
            </div>
          </div>
        </div>

        <!-- Left Column: Real Dual Mockup (Desktop Platform + Floating Mobile App) -->
        <div class="hero-visual-col" style="position: relative; display: flex; justify-content: center; align-items: center;">
          <!-- Desktop Mockup Frame with Real Bible Hub Screenshot -->
          <div class="screen-mockup-frame floating-anim" style="width: 100%; max-width: 520px; z-index: 2;">
            <div class="screen-mockup-header">
              <div class="browser-dots">
                <span class="browser-dot red"></span>
                <span class="browser-dot yellow"></span>
                <span class="browser-dot green"></span>
              </div>
              <span class="browser-address">elkaroozschool1.vercel.app/bible</span>
            </div>
            <img src="assets/real_bible_hub.png" alt="منصة مدرسة الكاروز" style="width: 100%; height: 300px; object-fit: cover; object-position: top; display: block;">
          </div>

          <!-- Overlapping Floating Mobile Mockup with Real Mobile Screen -->
          <div class="floating-anim-delay" style="position: absolute; bottom: -25px; left: -20px; width: 175px; z-index: 3; border-radius: 28px; overflow: hidden; border: 4px solid #1e293b; box-shadow: 0 20px 40px rgba(0,0,0,0.8), 0 0 20px var(--cyan-glow);">
            <img src="assets/real_mobile_login.png" alt="تطبيق الهاتف المحمول" style="width: 100%; height: 330px; object-fit: cover; display: block;">
          </div>

          <!-- Floating Circular Sacred Sanctuary Badge -->
          <div class="floating-anim" style="position: absolute; top: -20px; right: -15px; width: 90px; height: 90px; border-radius: 50%; border: 3px solid var(--gold); box-shadow: 0 0 25px var(--gold-glow); overflow: hidden; z-index: 4;">
            <img src="assets/c_sanctuary.png" alt="كنيسة مارمرقس" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
        </div>
      </div>

      <footer class="slide-footer">
        <div>كنيسة مارمرقس الرسول بالمنشية — شبرا الخيمة</div>
        <div style="color: var(--cyan);">● المنظومة تعمل حياً ومفعلة: elkaroozschool1.vercel.app</div>
      </footer>
    </section>


    <!-- ========================================================================
         SLIDE 2: THE REAL PROBLEMS & DIGITAL TRANSFORMATION (Before vs After)
         ======================================================================== -->
    <section class="slide" id="slide-2">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="مدرسة الكاروز" class="church-logo">
          <h2 class="slide-title">لماذا احتاجت مدرسة الكاروز إلى المنظومة الرقمية؟</h2>
        </div>
        <div class="slide-badge" style="color: var(--crimson); border-color: rgba(225, 50, 68, 0.4);">
          <span>⚠️</span> التحديات والمشكلات الواقعية
        </div>
      </header>

      <div style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 40px; align-items: center; margin: 20px 0;">
        <!-- 3 Problem Cards -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div class="glass-card" style="padding: 20px; border-right: 4px solid var(--crimson);">
            <div style="display: flex; align-items: center; gap: 14px;">
              <span style="font-size: 26px;">📁</span>
              <div>
                <h3 style="font-size: 19px; font-weight: 800; color: #ff6b81;">فقدان وتشتت السجلات الورقية وملفات الإكسل</h3>
                <p style="font-size: 14px; color: var(--muted); margin-top: 4px;">
                  الاعتماد لسنوات على الكشوفات اليدوية وملفات إكسل غير مركزية عرّض بيانات مئات الطلاب وسجلات الدرجات للضياع وصعوبة الاسترجاع عند تغيير الخدام.
                </p>
              </div>
            </div>
          </div>

          <div class="glass-card" style="padding: 20px; border-right: 4px solid var(--gold);">
            <div style="display: flex; align-items: center; gap: 14px;">
              <span style="font-size: 26px;">⏱️</span>
              <div>
                <h3 style="font-size: 19px; font-weight: 800; color: var(--gold-bright);">استنزاف أوقات الاجتماعات في رصد الحضور</h3>
                <p style="font-size: 14px; color: var(--muted); margin-top: 4px;">
                  استهلاك أوقات الخدمة في تدوين الحضور والغياب ورقياً دون وجود إحصائيات دقيقة أو تنبيهات فورية للمتابعة والافتقاد الرعوي للطلبة المنقطعين.
                </p>
              </div>
            </div>
          </div>

          <div class="glass-card" style="padding: 20px; border-right: 4px solid var(--cyan);">
            <div style="display: flex; align-items: center; gap: 14px;">
              <span style="font-size: 26px;">💬</span>
              <div>
                <h3 style="font-size: 19px; font-weight: 800; color: var(--cyan);">تشتت المناهج والتفاسير في محادثات الواتساب</h3>
                <p style="font-size: 14px; color: var(--muted); margin-top: 4px;">
                  إرسال المحاضرات والملفات الصوتية كرسائل متفرقة عبر وسائل التواصل الاجتماعي أفقدها التوثيق والتنظيم وأرهق الطالب في المذاكرة والمتابعة.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Before & After Real Showcase (Manuscript/Paper vs Digital Platform) -->
        <div class="glass-card" style="padding: 22px; text-align: center; border-color: rgba(218, 178, 60, 0.4);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
            <span style="font-size: 12px; font-weight: 800; color: #ff6b81; background: rgba(225,50,68,0.2); padding: 4px 10px; border-radius: 12px;">سابقاً: تشتت يدوي</span>
            <span style="font-size: 16px;">⟵ التحول الجذري ⟶</span>
            <span style="font-size: 12px; font-weight: 800; color: var(--emerald); background: rgba(16,196,138,0.2); padding: 4px 10px; border-radius: 12px;">الآن: منصة سحابية</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
            <div style="border-radius: 14px; overflow: hidden; border: 1px solid rgba(225,50,68,0.4);">
              <img src="assets/c_manuscript.png" alt="الأساليب التقليدية" style="width: 100%; height: 160px; object-fit: cover;">
              <div style="padding: 6px; font-size: 11px; background: rgba(225,50,68,0.15); color: #ff9aa2; font-weight: 700;">أوراق وكشوفات معرضة للتلف</div>
            </div>
            
            <div style="border-radius: 14px; overflow: hidden; border: 1px solid rgba(16,196,138,0.5);">
              <img src="assets/real_login_screen.png" alt="المنظومة السحابية" style="width: 100%; height: 160px; object-fit: cover; object-position: top;">
              <div style="padding: 6px; font-size: 11px; background: rgba(16,196,138,0.15); color: #80ebd0; font-weight: 700;">دخول مشفر وسجلات مركزية</div>
            </div>
          </div>

          <div style="padding: 10px 14px; background: rgba(218, 178, 60, 0.1); border-radius: 12px; border: 1px dashed var(--gold); font-size: 13px; color: var(--gold-bright); font-weight: 700;">
            ✓ تحول رقمي كامل يضمن سلامة وأمان بيانات مئات المخدومين والخدام
          </div>
        </div>
      </div>

      <footer class="slide-footer">
        <div>المشاكل التي تم حلها جذرياً عبر رقمنة المنظومة</div>
        <div>الشريحة 2 من 8</div>
      </footer>
    </section>


    <!-- ========================================================================
         SLIDE 3: STRATEGIC OBJECTIVES (With 3 Real Project Section Previews)
         ======================================================================== -->
    <section class="slide" id="slide-3">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="مدرسة الكاروز" class="church-logo">
          <h2 class="slide-title">أهداف ورسالة المنظومة الرقمية للمستقبل</h2>
        </div>
        <div class="slide-badge">
          <span>🎯</span> الرؤية والتحول الرقمي
        </div>
      </header>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin: 24px 0;">
        <!-- Pillar 1 with Real Bible Hub Image -->
        <div class="glass-card" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between; border-color: rgba(218, 178, 60, 0.4);">
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <span style="font-size: 13px; font-weight: 800; padding: 4px 12px; background: rgba(218, 178, 60, 0.2); color: var(--gold-bright); border-radius: 12px;">المحور الأول</span>
              <span style="font-size: 22px;">🏛️</span>
            </div>
            <h3 style="font-size: 20px; font-weight: 900; color: var(--gold-bright); margin-bottom: 10px;">التحول الرقمي الكامل للإدارة</h3>
            <p style="font-size: 13.5px; color: var(--muted); line-height: 1.6; margin-bottom: 16px;">
              بناء قاعدة بيانات موحدة للطلاب والخدام والسكرتارية والإدارة تضمن سلامة وأمان السجلات الأكاديمية والخدمية لعشرات السنين.
            </p>
          </div>
          <div style="border-radius: 12px; overflow: hidden; border: 1px solid rgba(218, 178, 60, 0.3); height: 160px;">
            <img src="assets/real_bible_hub.png" alt="لوحة الإدارة والموسوعة" style="width: 100%; height: 100%; object-fit: cover; object-position: top;">
          </div>
        </div>

        <!-- Pillar 2 with Real Bible Search/Commentary Image -->
        <div class="glass-card" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between; border-color: rgba(0, 196, 236, 0.4);">
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <span style="font-size: 13px; font-weight: 800; padding: 4px 12px; background: rgba(0, 196, 236, 0.2); color: var(--cyan); border-radius: 12px;">المحور الثاني</span>
              <span style="font-size: 22px;">📖</span>
            </div>
            <h3 style="font-size: 20px; font-weight: 900; color: var(--cyan); margin-bottom: 10px;">التعليم التفاعلي والتفاسير</h3>
            <p style="font-size: 13.5px; color: var(--muted); line-height: 1.6; margin-bottom: 16px;">
              إتاحة المناهج والمحاضرات الصوتية وتفاسير الآباء والامتحانات إلكترونياً بأسلوب شيق وعصري يربط المخدوم بالمنهج دون انقطاع.
            </p>
          </div>
          <div style="border-radius: 12px; overflow: hidden; border: 1px solid rgba(0, 196, 236, 0.3); height: 160px;">
            <img src="assets/real_bible_search.png" alt="محرك البحث والتفاسير" style="width: 100%; height: 100%; object-fit: cover; object-position: top;">
          </div>
        </div>

        <!-- Pillar 3 with Real Mobile App Image -->
        <div class="glass-card" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between; border-color: rgba(16, 196, 138, 0.4);">
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <span style="font-size: 13px; font-weight: 800; padding: 4px 12px; background: rgba(16, 196, 138, 0.2); color: var(--emerald); border-radius: 12px;">المحور الثالث</span>
              <span style="font-size: 22px;">📱</span>
            </div>
            <h3 style="font-size: 20px; font-weight: 900; color: var(--emerald); margin-bottom: 10px;">تطبيق كنسي في متناول الجميع</h3>
            <p style="font-size: 13.5px; color: var(--muted); line-height: 1.6; margin-bottom: 16px;">
              تطبيق ويب تقدمي (PWA) خفيف وسريع يعمل على كافة هواتف الطلاب والخدام بدون الحاجة للذهاب لمتاجر التطبيقات.
            </p>
          </div>
          <div style="border-radius: 12px; overflow: hidden; border: 1px solid rgba(16, 196, 138, 0.3); height: 160px;">
            <img src="assets/real_mobile_bible.png" alt="تطبيق الهاتف المحمول" style="width: 100%; height: 100%; object-fit: cover; object-position: top;">
          </div>
        </div>
      </div>

      <footer class="slide-footer">
        <div>مدرسة الكاروز — خطة التطوير الشاملة للتعليم الكنسي الرقمي</div>
        <div>الشريحة 3 من 8</div>
      </footer>
    </section>


    <!-- ========================================================================
         SLIDE 4: CORE MODULES & REAL INTERACTIVE SCREENS SHOWCASE
         ======================================================================== -->
    <section class="slide" id="slide-4">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="مدرسة الكاروز" class="church-logo">
          <h2 class="slide-title">المحاور والأنظمة الذكية الفعلية بالمنصة</h2>
        </div>
        <div class="slide-badge">
          <span>⚙️</span> أنظمة حية متكاملة
        </div>
      </header>

      <div style="display: grid; grid-template-columns: 1fr 1.1fr; gap: 35px; align-items: center; margin: 20px 0;">
        <!-- 4 System Modules List with Click-to-Preview -->
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <!-- Module 1: Attendance -->
          <div class="glass-card sys-module-item active" onclick="switchSysScreen('attendance', this)" style="padding: 14px 18px; cursor: pointer; border-right: 4px solid var(--emerald);">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 22px;">📋</span>
                <div>
                  <h3 style="font-size: 17px; font-weight: 800; color: var(--emerald);">نظام رصد الحضور الذكي والافتقاد</h3>
                  <p style="font-size: 12.5px; color: var(--muted);">مسح QR السريع، نسب الغياب، وتوليد رسائل الافتقاد عبر واتساب بضغطة واحدة.</p>
                </div>
              </div>
              <span style="font-size: 11px; padding: 3px 8px; border-radius: 8px; background: rgba(16,196,138,0.2); color: var(--emerald); font-weight: bold;">معاينة 👁️</span>
            </div>
          </div>

          <!-- Module 2: Marathon -->
          <div class="glass-card sys-module-item" onclick="switchSysScreen('marathon', this)" style="padding: 14px 18px; cursor: pointer; border-right: 4px solid var(--gold);">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 22px;">🏆</span>
                <div>
                  <h3 style="font-size: 17px; font-weight: 800; color: var(--gold-bright);">ماراثون حفظ الآيات والتنافس الروحي</h3>
                  <p style="font-size: 12.5px; color: var(--muted);">لوحة شرف تفاعلية للمتصدرين، رصد درجات الحفظ والشواهد والترتيب التراكمي.</p>
                </div>
              </div>
              <span style="font-size: 11px; padding: 3px 8px; border-radius: 8px; background: rgba(218,178,60,0.2); color: var(--gold-bright); font-weight: bold;">معاينة 👁️</span>
            </div>
          </div>

          <!-- Module 3: Groups & Trainees -->
          <div class="glass-card sys-module-item" onclick="switchSysScreen('groups', this)" style="padding: 14px 18px; cursor: pointer; border-right: 4px solid var(--cyan);">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 22px;">👥</span>
                <div>
                  <h3 style="font-size: 17px; font-weight: 800; color: var(--cyan);">إدارة الفرق والصفوف (1، 2، 3)</h3>
                  <p style="font-size: 12.5px; color: var(--muted);">ملف أكاديمي وشخصي لكل دارس مع سجل تاريخي للدرجات ومتابعة الخدام.</p>
                </div>
              </div>
              <span style="font-size: 11px; padding: 3px 8px; border-radius: 8px; background: rgba(0,196,236,0.2); color: var(--cyan); font-weight: bold;">معاينة 👁️</span>
            </div>
          </div>

          <!-- Module 4: Cloud Security -->
          <div class="glass-card sys-module-item" onclick="switchSysScreen('security', this)" style="padding: 14px 18px; cursor: pointer; border-right: 4px solid #a855f7;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 22px;">🛡️</span>
                <div>
                  <h3 style="font-size: 17px; font-weight: 800; color: #c084fc;">الأمان المشدد وصلاحيات الـ RBAC</h3>
                  <p style="font-size: 12.5px; color: var(--muted);">بنية سحابية مشددة تعزل صلاحيات الإدارة والخدام والطلبة مع تشفير JWT كامل.</p>
                </div>
              </div>
              <span style="font-size: 11px; padding: 3px 8px; border-radius: 8px; background: rgba(168,85,247,0.2); color: #c084fc; font-weight: bold;">معاينة 👁️</span>
            </div>
          </div>
        </div>

        <!-- Real Screen Live Interactive Display Frame -->
        <div>
          <div class="screen-mockup-frame" id="sysScreenDisplay" style="height: 380px;">
            <div class="screen-mockup-header">
              <div class="browser-dots">
                <span class="browser-dot red"></span>
                <span class="browser-dot yellow"></span>
                <span class="browser-dot green"></span>
              </div>
              <span class="browser-address" id="sysScreenUrl">elkaroozschool1.vercel.app/attendance</span>
            </div>
            <img id="sysScreenImg" src="assets/real_screen_attendance.png" alt="معاينة النظام الحي" style="width: 100%; height: 340px; object-fit: cover; object-position: top; display: block; transition: opacity 0.3s ease;">
          </div>
          <div style="text-align: center; margin-top: 10px; font-size: 12px; color: var(--gold-bright);">
            💡 انقر على أي نظام من القائمة باليمين لمعاينة شاشته الحقيقية فوراً
          </div>
        </div>
      </div>

      <footer class="slide-footer">
        <div>حلول رقمية متكاملة تواكب متطلبات الإدارة والخدمة الحديثة</div>
        <div>الشريحة 4 من 8</div>
      </footer>
    </section>


    <!-- ========================================================================
         SLIDE 5: BIBLE ENCYCLOPEDIA & DOCUMENTED DIGITAL LIBRARY
         ======================================================================== -->
    <section class="slide" id="slide-5">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="مدرسة الكاروز" class="church-logo">
          <h2 class="slide-title">موسوعة الكتاب المقدس والمكتبة الرقمية الموثقة</h2>
        </div>
        <div class="slide-badge">
          <span>📖</span> شاشات حية من المنصة
        </div>
      </header>

      <div style="display: grid; grid-template-columns: 0.95fr 1.05fr; gap: 35px; align-items: center; margin: 20px 0;">
        <!-- Left Feature Cards -->
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div class="glass-card" style="padding: 16px 20px; border-right: 4px solid var(--gold);">
            <h3 style="font-size: 18px; font-weight: 800; color: var(--gold-bright);">فهرس وبحث ذكي فوري لجميع أسفار العهدين</h3>
            <p style="font-size: 13.5px; color: var(--muted); margin-top: 4px;">
              تصفح فائق السرعة وتنقل سلس بين الإصحاحات والشواهد بنقرة واحدة بدون ثقل في التحميل، مع دعم التشكيل والبحث بالكلمة والجذر.
            </p>
          </div>

          <div class="glass-card" style="padding: 16px 20px; border-right: 4px solid var(--cyan);">
            <h3 style="font-size: 18px; font-weight: 800; color: var(--cyan);">تفاسير الآباء الأرثوذكسية المعتمدة</h3>
            <p style="font-size: 13.5px; color: var(--muted); margin-top: 4px;">
              ربط الآيات مباشرة بشروحات وتفاسير القمص تادرس يعقوب ملطي والقمص أنطونيوس فكري وتأملات الآباء الأولين.
            </p>
          </div>

          <div class="glass-card" style="padding: 16px 20px; border-right: 4px solid var(--emerald);">
            <h3 style="font-size: 18px; font-weight: 800; color: var(--emerald);">الأطلس الجغرافي والخرائط التاريخية</h3>
            <p style="font-size: 13.5px; color: var(--muted); margin-top: 4px;">
              خرائط دقيقة لمسارات رحلات الرسل والأنبياء لفهم أعمق للبيئة الجغرافية للكتاب المقدس.
            </p>
          </div>
        </div>

        <!-- Right Side: Interactive Multi-Screen Browser Tabs -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div class="tab-pills">
              <button class="tab-pill active" onclick="switchBibleTab('hub', this)">فهرس الأسفار</button>
              <button class="tab-pill" onclick="switchBibleTab('search', this)">البحث والتفاسير</button>
              <button class="tab-pill" onclick="switchBibleTab('atlas', this)">الأطلس الجغرافي</button>
            </div>
            <span style="font-size: 12px; color: var(--cyan);">تفاعل حي بنقرة زر ⚡</span>
          </div>

          <div class="screen-mockup-frame" id="bibleFrameDisplay" style="height: 380px;">
            <div class="screen-mockup-header">
              <div class="browser-dots">
                <span class="browser-dot red"></span>
                <span class="browser-dot yellow"></span>
                <span class="browser-dot green"></span>
              </div>
              <span class="browser-address" id="bibleFrameUrl">elkaroozschool1.vercel.app/bible</span>
            </div>
            <img id="bibleFrameImg" src="assets/real_bible_hub.png" alt="موسوعة الكتاب المقدس" style="width: 100%; height: 340px; object-fit: cover; object-position: top; display: block; transition: all 0.3s ease;">
          </div>
        </div>
      </div>

      <footer class="slide-footer">
        <div>مكتبة رقمية متكاملة لربط الطالب بكلمة الله وتراث الكنيسة الحي</div>
        <div>الشريحة 5 من 8</div>
      </footer>
    </section>


    <!-- ========================================================================
         SLIDE 6: MULTI-DEVICE RESPONSIVENESS (Live 3-Device Mockups)
         ======================================================================== -->
    <section class="slide" id="slide-6">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="مدرسة الكاروز" class="church-logo">
          <h2 class="slide-title">يعمل بسلاسة وتجاوب على جميع الشاشات والأجهزة</h2>
        </div>
        <div class="slide-badge" style="color: var(--cyan); border-color: rgba(0, 196, 236, 0.4);">
          <span>📱</span> تجربة استخدام عالمية (Multi-Device PWA)
        </div>
      </header>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; margin: 20px 0;">
        <!-- Left Feature List -->
        <div class="glass-card" style="padding: 28px;">
          <h3 style="font-size: 24px; font-weight: 900; color: var(--gold-bright); margin-bottom: 20px;">
            متاح لكل طالب وخادم أينما كان
          </h3>

          <div style="display: flex; flex-direction: column; gap: 18px;">
            <div style="display: flex; gap: 14px; align-items: flex-start;">
              <span style="font-size: 22px; padding: 8px; background: rgba(0,196,236,0.15); border-radius: 12px; color: var(--cyan);">📲</span>
              <div>
                <h4 style="font-size: 17px; font-weight: 800; color: var(--white);">تطبيق ويب تقدمي (PWA) فوري</h4>
                <p style="font-size: 13.5px; color: var(--muted); margin-top: 3px;">
                  تثبيت بنقرة واحدة على الشاشة الرئيسية للهاتف بدون الذهاب لمتاجر التطبيقات وبمساحة خفيفة جداً.
                </p>
              </div>
            </div>

            <div style="display: flex; gap: 14px; align-items: flex-start;">
              <span style="font-size: 22px; padding: 8px; background: rgba(218,178,60,0.15); border-radius: 12px; color: var(--gold);">🎨</span>
              <div>
                <h4 style="font-size: 17px; font-weight: 800; color: var(--white);">3 مظاهر بصرية فاخرة (Themes)</h4>
                <p style="font-size: 13.5px; color: var(--muted); margin-top: 3px;">
                  دعم كامل للمظهر النهاري، المظهر الليلي المريح، والمظهر الملكي القبطي الفاخر (Navy & Luxury Gold).
                </p>
              </div>
            </div>

            <div style="display: flex; gap: 14px; align-items: flex-start;">
              <span style="font-size: 22px; padding: 8px; background: rgba(16,196,138,0.15); border-radius: 12px; color: var(--emerald);">⚡</span>
              <div>
                <h4 style="font-size: 17px; font-weight: 800; color: var(--white);">سرعة استجابة وأداء فائق</h4>
                <p style="font-size: 13.5px; color: var(--muted); margin-top: 3px;">
                  Next.js 14 وتقنيات السحابة الذكية تضمن تصفحاً فورياً حتى في ظل ضعف شبكة الإنترنت في القاعات.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right 3-Device Visual Display with Live Screens -->
        <div style="position: relative; display: flex; justify-content: center; align-items: center; height: 400px;">
          <!-- Desktop Real Screen Frame -->
          <div class="screen-mockup-frame floating-anim" style="width: 100%; max-width: 480px; z-index: 1;">
            <div class="screen-mockup-header">
              <div class="browser-dots">
                <span class="browser-dot red"></span>
                <span class="browser-dot yellow"></span>
                <span class="browser-dot green"></span>
              </div>
              <span class="browser-address">كمبيوتر / لابتوب</span>
            </div>
            <img src="assets/real_bible_hub.png" alt="كمبيوتر" style="width: 100%; height: 260px; object-fit: cover; object-position: top; display: block;">
          </div>

          <!-- Phone Real Screen Frame Floating in Front -->
          <div class="floating-anim-delay" style="position: absolute; bottom: 10px; right: 0; width: 170px; border-radius: 26px; overflow: hidden; border: 4px solid #1e293b; box-shadow: 0 25px 50px rgba(0,0,0,0.8), 0 0 25px var(--gold-glow); z-index: 3;">
            <img src="assets/real_mobile_bible.png" alt="موبايل" style="width: 100%; height: 320px; object-fit: cover; display: block;">
          </div>
        </div>
      </div>

      <footer class="slide-footer">
        <div>لقطات حية تم التقاطها بمحرك Playwright من الموقع المنشور فعلياً</div>
        <div>الشريحة 6 من 8</div>
      </footer>
    </section>


    <!-- ========================================================================
         SLIDE 7: SECURITY, PRIVACY & SYSTEM ARCHITECTURE
         ======================================================================== -->
    <section class="slide" id="slide-7">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="مدرسة الكاروز" class="church-logo">
          <h2 class="slide-title">الأمان، الخصوصية، والموثوقية التقنية المشددة</h2>
        </div>
        <div class="slide-badge" style="color: var(--cyan); border-color: rgba(0, 196, 236, 0.4);">
          <span>🛡️</span> بنية تحتية صلبة ومستقرة
        </div>
      </header>

      <div style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 40px; align-items: center; margin: 20px 0;">
        <!-- Left: 3 Security Pillars -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div class="glass-card" style="padding: 20px; border-right: 4px solid var(--emerald);">
            <div style="display: flex; align-items: center; gap: 14px;">
              <span style="font-size: 28px;">🔐</span>
              <div>
                <h3 style="font-size: 19px; font-weight: 800; color: var(--emerald);">نظام صلاحيات هرمي مشدد (RBAC)</h3>
                <p style="font-size: 13.5px; color: var(--muted); margin-top: 4px;">
                  فصل صارم بين صلاحيات (المدير العام، المشرف العام، خادم الفرقة، السكرتارية، والطالب)، بحيث لا يطّلع أي شخص إلا على بيانات فرقته فقط حفاظاً على سرية وخصوصية الطلاب.
                </p>
              </div>
            </div>
          </div>

          <div class="glass-card" style="padding: 20px; border-right: 4px solid var(--gold);">
            <div style="display: flex; align-items: center; gap: 14px;">
              <span style="font-size: 28px;">🛡️</span>
              <div>
                <h3 style="font-size: 19px; font-weight: 800; color: var(--gold-bright);">أمان قاعدة البيانات على مستوى كل صف (RLS)</h3>
                <p style="font-size: 13.5px; color: var(--muted); margin-top: 4px;">
                  تطبيق سياسات Row-Level Security في PostgreSQL لمنع أي وصول غير مصرح به على مستوى السجلات الفردية، مع تشفير كامل للجلسات والرموز الأمنية (JWT).
                </p>
              </div>
            </div>
          </div>

          <div class="glass-card" style="padding: 20px; border-right: 4px solid var(--cyan);">
            <div style="display: flex; align-items: center; gap: 14px;">
              <span style="font-size: 28px;">☁️</span>
              <div>
                <h3 style="font-size: 19px; font-weight: 800; color: var(--cyan);">حماية الحسابات من التخمين والنسخ الاحتياطي الدوري</h3>
                <p style="font-size: 13.5px; color: var(--muted); margin-top: 4px;">
                  نظام ذكي لقفل تسجيل الدخول مؤقتاً عند تكرار المحاولات الخاطئة (Lockout Protection)، مع إمكانية تصدير واسترجاع قواعد البيانات والملفات سحابياً في أي وقت.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Real Login Security Portal Screen with Scanning Radar Aura -->
        <div class="glass-card" style="padding: 22px; text-align: center; border-color: rgba(0, 196, 236, 0.4); position: relative;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
            <span style="font-size: 12px; font-weight: 800; color: var(--emerald); background: rgba(16,196,138,0.2); padding: 4px 10px; border-radius: 12px;">🔒 بوابة دخول آمنة</span>
            <span style="font-size: 12px; color: var(--muted);">تشفير سحابي SSL/TLS</span>
          </div>

          <div class="screen-mockup-frame" style="position: relative;">
            <div class="scanner-beam"></div>
            <img src="assets/real_login_screen.png" alt="بوابة الدخول الآمنة" style="width: 100%; height: 250px; object-fit: cover; object-position: top; display: block;">
          </div>

          <div style="display: flex; justify-content: space-around; margin-top: 14px; font-size: 12px; font-weight: 700;">
            <span style="color: var(--emerald);">✓ حماية من الهجمات</span>
            <span style="color: var(--gold-bright);">✓ تشفير البيانات</span>
            <span style="color: var(--cyan);">✓ نسخ احتياطي آلي</span>
          </div>
        </div>
      </div>

      <footer class="slide-footer">
        <div>بنية أمنية ثلاثية الطبقات تضمن أمان واستمرارية المنظومة</div>
        <div>الشريحة 7 من 8</div>
      </footer>
    </section>


    <!-- ========================================================================
         SLIDE 8: LIVE EXPERIENCE, QR & CALL TO ACTION
         ======================================================================== -->
    <section class="slide" id="slide-8">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="مدرسة الكاروز" class="church-logo">
          <h2 class="slide-title">ابدأ التجربة الحية لمنظومة مدرسة الكاروز الآن</h2>
        </div>
        <div class="slide-badge" style="color: var(--emerald); border-color: rgba(16, 196, 138, 0.4);">
          <span>🚀</span> المنصة متاحة ومفعلة على الهواء
        </div>
      </header>

      <div style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 40px; align-items: center; margin: 20px 0;">
        <!-- Left Steps & Direct Link -->
        <div style="display: flex; flex-direction: column; gap: 18px;">
          <!-- Direct URL Display Box -->
          <div class="glass-card" style="padding: 20px; display: flex; align-items: center; justify-content: space-between; border-color: rgba(218, 178, 60, 0.5);">
            <div style="font-family: monospace; font-size: 20px; font-weight: 700; color: var(--gold-bright);">
              https://elkaroozschool1.vercel.app/
            </div>
            <a href="https://elkaroozschool1.vercel.app/" target="_blank" class="ctrl-btn primary" style="text-decoration: none; padding: 10px 22px;">
              زيارة المنصة ↗
            </a>
          </div>

          <!-- Steps Cards -->
          <div class="glass-card" style="padding: 24px;">
            <h3 style="font-size: 20px; font-weight: 900; color: var(--gold-bright); margin-bottom: 16px;">خطوات الاستفادة من المنظومة:</h3>
            
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div style="display: flex; align-items: center; gap: 12px; font-size: 15px;">
                <span style="color: var(--gold); font-size: 18px;">⭐</span>
                <span><strong>الدخول المباشر السحابي:</strong> متاح على مدار الساعة عبر المتصفح أو تثبيته كتطبيق هاتف.</span>
              </div>
              <div style="display: flex; align-items: center; gap: 12px; font-size: 15px;">
                <span style="color: var(--gold); font-size: 18px;">⭐</span>
                <span><strong>تصفح موسوعة الكتاب المقدس:</strong> متاح مجاناً للجميع لقراءة النصوص والتفاسير والخرائط.</span>
              </div>
              <div style="display: flex; align-items: center; gap: 12px; font-size: 15px;">
                <span style="color: var(--gold); font-size: 18px;">⭐</span>
                <span><strong>تسجيل الدخول للخدام والطلاب:</strong> متابعة الصفوف الدراسية، الحضور، وماراثون الآيات.</span>
              </div>
              <div style="display: flex; align-items: center; gap: 12px; font-size: 15px;">
                <span style="color: var(--gold); font-size: 18px;">⭐</span>
                <span><strong>بيئة كنسية آمنة:</strong> مصممة لتخدم رسالة التعليم والنمو الروحي بكنيسة مارمرقس الرسول.</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Animated High-Res QR Scanner Box -->
        <div class="glass-card" style="padding: 30px; text-align: center; border-color: rgba(218, 178, 60, 0.5); display: flex; flex-direction: column; align-items: center;">
          <div style="position: relative; padding: 14px; background: #ffffff; border-radius: 20px; box-shadow: 0 0 35px var(--gold-glow); margin-bottom: 18px;">
            <div class="scanner-beam"></div>
            <img src="assets/live_qr.png" alt="QR Code" style="width: 220px; height: 220px; display: block;">
          </div>
          <h3 style="font-size: 22px; font-weight: 900; color: var(--gold-bright); margin-bottom: 6px;">امسح الرمز بكاميرا هاتفك</h3>
          <p style="font-size: 14px; color: var(--muted);">لفتح المنظومة فوراً وتجربتها حياً في ثوانٍ معدودة</p>
        </div>
      </div>

      <footer class="slide-footer">
        <div>جميع الحقوق محفوظة © مدرسة الكاروز للكتاب المقدس — كنيسة مارمرقس الرسول</div>
        <div>الشريحة 8 من 8</div>
      </footer>
    </section>

  </div>

  <!-- Bottom Floating Control Dock -->
  <div id="deckControls">
    <button class="ctrl-btn" onclick="prevSlide(event)">
      <span>السابق</span> <span>⟵</span>
    </button>
    
    <div class="dots-container" id="dotsContainer">
      <div class="dot-step active" onclick="goToSlide(1, event)"></div>
      <div class="dot-step" onclick="goToSlide(2, event)"></div>
      <div class="dot-step" onclick="goToSlide(3, event)"></div>
      <div class="dot-step" onclick="goToSlide(4, event)"></div>
      <div class="dot-step" onclick="goToSlide(5, event)"></div>
      <div class="dot-step" onclick="goToSlide(6, event)"></div>
      <div class="dot-step" onclick="goToSlide(7, event)"></div>
      <div class="dot-step" onclick="goToSlide(8, event)"></div>
    </div>

    <div class="slide-counter" id="slideCounter">1 / 8</div>

    <button class="ctrl-btn primary" onclick="nextSlide(event)">
      <span>التالي</span> <span>⟶</span>
    </button>

    <div style="width: 1px; height: 20px; background: rgba(218, 178, 60, 0.3); margin: 0 4px;"></div>

    <button class="ctrl-btn" onclick="toggleFullScreen(event)" title="ملء الشاشة (F)">
      <span>⛶</span>
    </button>
  </div>

  <!-- ========================================================================
       GSAP 3 HYPER-ANIMATION & INTERACTIVITY SCRIPTS
       ======================================================================== -->
  <script>
    let currentSlide = 1;
    const totalSlides = 8;
    let isAnimating = false;

    // 1. DYNAMIC GOLDEN DUST & SACRED STARLIGHT PARTICLES CANVAS
    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let mouse = { x: null, y: null };

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = (Math.random() - 0.5) * 0.4 - 0.1; // gentle upward drift
        this.alpha = Math.random() * 0.6 + 0.2;
        this.pulse = Math.random() * 0.02 + 0.01;
        this.color = Math.random() > 0.4 ? '218, 178, 60' : '0, 196, 236'; // Gold or Cyan
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Mouse gentle repulsion
        if (mouse.x !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            this.x -= (dx / dist) * 1.5;
            this.y -= (dy / dist) * 1.5;
          }
        }

        this.alpha += Math.sin(Date.now() * this.pulse) * 0.01;
        if (this.alpha < 0.1) this.alpha = 0.1;
        if (this.alpha > 0.8) this.alpha = 0.8;

        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
          this.reset();
        }
      }
      draw() {
        ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < 75; i++) {
      particles.push(new Particle());
    }

    function animateParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      requestAnimationFrame(animateParticles);
    }
    animateParticles();

    // 2. INTERACTIVE 3D PERSPECTIVE TILT ON CARDS
    document.querySelectorAll('.glass-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const rotateX = (-y / rect.height) * 12;
        const rotateY = (x / rect.width) * 12;
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
      });
    });

    // 3. STAT NUMBER TICK UP ANIMATION
    function animateCounters(slideElement) {
      const counters = slideElement.querySelectorAll('.stat-number');
      counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'), 10) || 0;
        const obj = { val: 0 };
        gsap.to(obj, {
          val: target,
          duration: 1.2,
          ease: "power2.out",
          onUpdate: () => {
            counter.textContent = Math.round(obj.val);
          }
        });
      });
    }

    // 4. GSAP SLIDE TRANSITION CHOREOGRAPHY
    function transitionToSlide(fromIndex, toIndex) {
      if (fromIndex === toIndex || isAnimating) return;
      isAnimating = true;

      const fromSlide = document.getElementById(`slide-${fromIndex}`);
      const toSlide = document.getElementById(`slide-${toIndex}`);
      const isForward = toIndex > fromIndex;

      // Animate Progress Bar
      const progressPercent = (toIndex / totalSlides) * 100;
      gsap.to('#progressBar', { width: `${progressPercent}%`, duration: 0.45, ease: "power2.out" });

      // Update Controls
      document.querySelectorAll('.dot-step').forEach((dot, idx) => {
        dot.classList.toggle('active', idx === toIndex - 1);
      });
      document.getElementById('slideCounter').textContent = `${toIndex} / ${totalSlides}`;

      // Cinematic GSAP Timeline
      const tl = gsap.timeline({
        onComplete: () => {
          fromSlide.classList.remove('active');
          isAnimating = false;
        }
      });

      // Outgoing Slide with Depth Fade
      tl.to(fromSlide, {
        opacity: 0,
        scale: 0.92,
        x: isForward ? -90 : 90,
        rotationY: isForward ? -8 : 8,
        filter: "blur(10px)",
        duration: 0.4,
        ease: "power2.inOut"
      });

      // Incoming Slide Entrance
      tl.add(() => {
        toSlide.classList.add('active');
      }, "-=0.15");

      tl.fromTo(toSlide, 
        { opacity: 0, scale: 1.08, x: isForward ? 100 : -100, rotationY: isForward ? 8 : -8, filter: "blur(15px)" },
        { opacity: 1, scale: 1, x: 0, rotationY: 0, filter: "blur(0px)", duration: 0.5, ease: "power3.out" }
      );

      // Header Badge Bounce
      const badge = toSlide.querySelector('.slide-badge');
      if (badge) {
        tl.from(badge, { scale: 0.6, opacity: 0, duration: 0.4, ease: "back.out(2)" }, "-=0.35");
      }

      // Staggered Cards Reveal with Back Elasticity
      const childCards = toSlide.querySelectorAll('.glass-card, .screen-mockup-frame, .hero-visual-col, .hero-info-box');
      if (childCards.length > 0) {
        tl.from(childCards, {
          opacity: 0,
          y: 35,
          scale: 0.96,
          duration: 0.5,
          stagger: 0.08,
          ease: "back.out(1.4)"
        }, "-=0.3");
      }

      // Trigger counter tick-up
      animateCounters(toSlide);

      currentSlide = toIndex;
    }

    function nextSlide(e) {
      if (e) e.stopPropagation();
      if (currentSlide < totalSlides) {
        transitionToSlide(currentSlide, currentSlide + 1);
      } else {
        transitionToSlide(currentSlide, 1);
      }
    }

    function prevSlide(e) {
      if (e) e.stopPropagation();
      if (currentSlide > 1) {
        transitionToSlide(currentSlide, currentSlide - 1);
      }
    }

    function goToSlide(index, e) {
      if (e) e.stopPropagation();
      if (index >= 1 && index <= totalSlides && index !== currentSlide) {
        transitionToSlide(currentSlide, index);
      }
    }

    // 5. MOUSE CLICK ANYWHERE TO ADVANCE WITH SPARKS EXPLOSION
    const deckStage = document.getElementById('deckStage');
    deckStage.addEventListener('click', (e) => {
      // Ignore clicks on controls bar, links, interactive tabs
      if (e.target.closest('#deckControls') || e.target.closest('a') || e.target.closest('button') || e.target.closest('.sys-module-item') || e.target.closest('.tab-pill')) {
        return;
      }

      // Create expanding Ripple
      const ripple = document.createElement('div');
      ripple.className = 'click-ripple';
      ripple.style.left = `${e.clientX}px`;
      ripple.style.top = `${e.clientY}px`;
      document.body.appendChild(ripple);

      gsap.to(ripple, {
        scale: 3.5,
        opacity: 0,
        duration: 0.55,
        ease: "power2.out",
        onComplete: () => ripple.remove()
      });

      // Spawn 12 Glittering Sparkle Particles
      for (let i = 0; i < 12; i++) {
        const spark = document.createElement('div');
        spark.className = 'sparkle-particle';
        spark.style.left = `${e.clientX}px`;
        spark.style.top = `${e.clientY}px`;
        document.body.appendChild(spark);

        const angle = (Math.PI * 2 * i) / 12;
        const distance = Math.random() * 50 + 40;
        const targetX = e.clientX + Math.cos(angle) * distance;
        const targetY = e.clientY + Math.sin(angle) * distance;

        gsap.to(spark, {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          opacity: 0,
          scale: Math.random() * 1.5 + 0.5,
          duration: 0.6,
          ease: "power2.out",
          onComplete: () => spark.remove()
        });
      }

      // RTL Direction Logic: Click on right 75% -> Next, Left 25% -> Prev
      const clickXPercent = e.clientX / window.innerWidth;
      if (clickXPercent < 0.22) {
        prevSlide();
      } else {
        nextSlide();
      }
    });

    // 6. KEYBOARD NAVIGATION
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown') {
        nextSlide();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        prevSlide();
      } else if (e.key === 'Home') {
        goToSlide(1);
      } else if (e.key === 'End') {
        goToSlide(totalSlides);
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullScreen();
      }
    });

    function toggleFullScreen(e) {
      if (e) e.stopPropagation();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.log(err));
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    }

    // 7. TOUCH SWIPE NAVIGATION FOR TABLETS & MOBILES
    let touchStartX = 0;
    let touchEndX = 0;
    document.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, false);
    document.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const diff = touchEndX - touchStartX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) prevSlide(); else nextSlide();
      }
    }, false);

    // 8. INTERACTIVE SCREEN SWITCHERS (SLIDE 4 & 5)
    function switchSysScreen(type, el) {
      document.querySelectorAll('.sys-module-item').forEach(item => item.classList.remove('active'));
      el.classList.add('active');

      const img = document.getElementById('sysScreenImg');
      const url = document.getElementById('sysScreenUrl');

      gsap.to(img, { opacity: 0, scale: 0.95, duration: 0.2, onComplete: () => {
        if (type === 'attendance') {
          img.src = 'assets/real_screen_attendance.png';
          url.textContent = 'elkaroozschool1.vercel.app/attendance';
        } else if (type === 'marathon') {
          img.src = 'assets/real_screen_marathon.png';
          url.textContent = 'elkaroozschool1.vercel.app/marathon';
        } else if (type === 'groups') {
          img.src = 'assets/real_bible_hub.png';
          url.textContent = 'elkaroozschool1.vercel.app/groups';
        } else if (type === 'security') {
          img.src = 'assets/real_login_screen.png';
          url.textContent = 'elkaroozschool1.vercel.app/admin/security';
        }
        gsap.to(img, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(1.5)" });
      }});
    }

    function switchBibleTab(tab, el) {
      document.querySelectorAll('.tab-pill').forEach(btn => btn.classList.remove('active'));
      el.classList.add('active');

      const img = document.getElementById('bibleFrameImg');
      const url = document.getElementById('bibleFrameUrl');

      gsap.to(img, { opacity: 0, rotationY: 15, duration: 0.2, onComplete: () => {
        if (tab === 'hub') {
          img.src = 'assets/real_bible_hub.png';
          url.textContent = 'elkaroozschool1.vercel.app/bible';
        } else if (tab === 'search') {
          img.src = 'assets/real_bible_search.png';
          url.textContent = 'elkaroozschool1.vercel.app/bible?search=love';
        } else if (tab === 'atlas') {
          img.src = 'assets/c_atlas.png';
          url.textContent = 'elkaroozschool1.vercel.app/bible/atlas';
        }
        gsap.to(img, { opacity: 1, rotationY: 0, duration: 0.35, ease: "power2.out" });
      }});
    }

    // Initial entrance on page load
    window.addEventListener('load', () => {
      animateCounters(document.getElementById('slide-1'));
    });
  </script>
</body>
</html>"""

# Write to presentation/index.html and presentation/presentation.html
with open(dest_html_file, 'w', encoding='utf-8') as f:
    f.write(html_content)

with open(dest_presentation_copy, 'w', encoding='utf-8') as f:
    f.write(html_content)

print("Super-rich presentation generated successfully in presentation/index.html!")
