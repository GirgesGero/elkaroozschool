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
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@500;700;800;900&family=Tajawal:wght@700;900&display=swap" rel="stylesheet">

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
      --bg-dark: #020614;
      --bg-midnight: #071026;
      --card-bg: rgba(9, 20, 50, 0.84);
      --card-border: rgba(218, 178, 60, 0.42);
      --card-border-hover: rgba(252, 222, 128, 0.95);
      --gold: #dab23c;
      --gold-bright: #fcde80;
      --gold-glow: rgba(218, 178, 60, 0.45);
      --cyan: #00c4ec;
      --cyan-bright: #4fe3ff;
      --cyan-glow: rgba(0, 196, 236, 0.45);
      --burgundy: #8e143a;
      --crimson: #e13244;
      --emerald: #10c48a;
      --emerald-bright: #38efb0;
      --white: #ffffff;
      --muted: #d5e1f0;
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
      filter: blur(75px);
      opacity: 0.65;
      animation: floatOrb 18s ease-in-out infinite alternate;
    }
    .orb-1 {
      top: -160px;
      left: -160px;
      width: 780px;
      height: 780px;
      background: radial-gradient(circle, rgba(16, 46, 110, 0.65) 0%, rgba(2, 6, 20, 0) 70%);
      animation-duration: 22s;
    }
    .orb-2 {
      bottom: -180px;
      right: -180px;
      width: 820px;
      height: 820px;
      background: radial-gradient(circle, rgba(142, 20, 58, 0.48) 0%, rgba(2, 6, 20, 0) 70%);
      animation-duration: 25s;
    }
    .orb-3 {
      top: 30%;
      right: 25%;
      width: 550px;
      height: 550px;
      background: radial-gradient(circle, rgba(0, 196, 236, 0.25) 0%, rgba(2, 6, 20, 0) 70%);
      animation-duration: 18s;
    }

    @keyframes floatOrb {
      0% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(45px, -35px) scale(1.08); }
      100% { transform: translate(-35px, 40px) scale(0.94); }
    }

    /* ==========================================================================
       DISTINCT TYPOGRAPHY & TEXT DISPLAY EFFECTS
       ========================================================================== */
    .text-liquid-gold {
      background: linear-gradient(90deg, #dab23c 0%, #fcde80 25%, #ffffff 50%, #fcde80 75%, #dab23c 100%);
      background-size: 200% auto;
      color: transparent;
      -webkit-background-clip: text;
      background-clip: text;
      animation: textShimmer 4s linear infinite;
      text-shadow: 0 4px 20px rgba(218, 178, 60, 0.35);
    }
    @keyframes textShimmer {
      0% { background-position: 200% center; }
      100% { background-position: -200% center; }
    }

    .text-cyan-neon {
      color: var(--cyan-bright);
      text-shadow: 0 0 12px rgba(0, 196, 236, 0.8), 0 0 28px rgba(0, 196, 236, 0.45);
    }

    .text-emerald-glow {
      color: var(--emerald-bright);
      text-shadow: 0 0 12px rgba(16, 196, 138, 0.8), 0 0 25px rgba(16, 196, 138, 0.4);
    }

    .text-ruby-glow {
      color: #ff6b81;
      text-shadow: 0 0 12px rgba(225, 50, 68, 0.8), 0 0 28px rgba(225, 50, 68, 0.45);
    }

    .text-depth-3d {
      color: var(--white);
      text-shadow: 0 3px 6px rgba(0, 0, 0, 0.9), 0 8px 20px rgba(0, 0, 0, 0.75);
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
      cursor: pointer;
      perspective: 1200px;
    }

    .slide {
      position: absolute;
      width: 100%;
      max-width: 1620px;
      height: 920px;
      max-height: 100vh;
      padding: 30px 55px;
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
      width: 38%;
      height: 4px;
      background: linear-gradient(90deg, var(--gold), var(--cyan), transparent);
      border-radius: 4px;
      box-shadow: 0 0 14px var(--gold-glow);
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 18px;
    }
    .church-logo {
      width: 68px;
      height: 68px;
      border-radius: 50%;
      border: 2.5px solid var(--gold);
      box-shadow: 0 0 22px var(--gold-glow);
      background-color: #0b1531;
      object-fit: cover;
      animation: pulseLogo 4s ease-in-out infinite;
    }
    @keyframes pulseLogo {
      0%, 100% { box-shadow: 0 0 15px var(--gold-glow); transform: scale(1); }
      50% { box-shadow: 0 0 30px rgba(218, 178, 60, 0.7); transform: scale(1.04); }
    }

    .slide-title {
      font-size: 38px;
      font-weight: 900;
      color: var(--white);
      letter-spacing: -0.5px;
      text-shadow: 0 2px 12px rgba(0,0,0,0.85);
    }

    .slide-badge {
      font-size: 18px;
      font-weight: 800;
      padding: 10px 24px;
      border-radius: 35px;
      background: rgba(14, 30, 68, 0.8);
      border: 1.5px solid var(--card-border);
      color: var(--gold-bright);
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 0 18px rgba(0, 0, 0, 0.5);
    }

    
    .enc-sec-card {
      transition: border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease !important;
    }
    .enc-sec-card:hover {
      background: rgba(20, 42, 90, 0.85) !important;
      border-color: var(--card-border-hover) !important;
    }
    .enc-sec-card.active {
      background: rgba(24, 52, 110, 0.95) !important;
      box-shadow: 0 0 16px rgba(0, 196, 236, 0.35) !important;
    }

    /* Glass Cards with 3D Tilt */
    .glass-card {
      background: var(--card-bg);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1.5px solid var(--card-border);
      border-radius: 24px;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.55);
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
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
      transform: skewX(-20deg);
      transition: left 0.75s ease;
      pointer-events: none;
    }
    .glass-card:hover::before {
      left: 150%;
    }
    .glass-card:hover {
      border-color: var(--card-border-hover);
      box-shadow: 0 24px 55px rgba(218, 178, 60, 0.35);
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
      50% { transform: translateY(-10px); }
    }

    /* Bottom Control Dock */
    #deckControls {
      position: fixed;
      bottom: 18px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 100;
      background: rgba(9, 21, 51, 0.94);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1.5px solid var(--card-border);
      border-radius: 45px;
      padding: 10px 28px;
      display: flex;
      align-items: center;
      gap: 20px;
      box-shadow: 0 14px 40px rgba(0,0,0,0.7), 0 0 28px var(--gold-glow);
    }

    .ctrl-btn {
      background: transparent;
      border: 1px solid rgba(218, 178, 60, 0.4);
      color: var(--white);
      font-family: var(--font-main);
      font-size: 16px;
      font-weight: 800;
      padding: 9px 20px;
      border-radius: 22px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.25s ease;
    }
    .ctrl-btn:hover {
      background: rgba(218, 178, 60, 0.25);
      border-color: var(--gold-bright);
      color: var(--gold-bright);
      box-shadow: 0 0 16px var(--gold-glow);
      transform: scale(1.05);
    }
    .ctrl-btn.primary {
      background: linear-gradient(135deg, var(--gold), #b89127);
      color: #040918;
      border: none;
      font-weight: 900;
      box-shadow: 0 0 20px var(--gold-glow);
    }
    .ctrl-btn.primary:hover {
      background: linear-gradient(135deg, #fcde80, var(--gold));
      transform: scale(1.07);
    }

    .dots-container {
      display: flex;
      align-items: center;
      gap: 9px;
    }
    .dot-step {
      width: 11px;
      height: 11px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.28);
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .dot-step:hover {
      background: var(--gold-bright);
      transform: scale(1.3);
    }
    .dot-step.active {
      width: 32px;
      border-radius: 10px;
      background: linear-gradient(90deg, var(--gold), var(--gold-bright));
      box-shadow: 0 0 14px var(--gold-glow);
    }

    .slide-counter {
      font-size: 17px;
      font-weight: 900;
      color: var(--muted);
      min-width: 55px;
      text-align: center;
    }

    /* Progress Bar */
    .progress-bar-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 5px;
      background: rgba(255, 255, 255, 0.08);
      z-index: 110;
    }
    .progress-bar {
      height: 100%;
      width: 11.1%;
      background: linear-gradient(90deg, var(--cyan), var(--gold), var(--gold-bright));
      box-shadow: 0 0 16px var(--gold-glow);
      transition: width 0.4s ease;
    }

    /* Footer Metadata */
    .slide-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 14px;
      border-top: 1px solid rgba(218, 178, 60, 0.25);
      font-size: 16px;
      color: var(--muted);
      font-weight: 700;
    }

    /* Interactive Golden Sparkle Click Particles */
    .sparkle-particle {
      position: fixed;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--gold-bright);
      box-shadow: 0 0 12px var(--gold-bright), 0 0 22px var(--gold);
      pointer-events: none;
      z-index: 9999;
    }
    .click-ripple {
      position: fixed;
      border: 2.5px solid var(--gold-bright);
      border-radius: 50%;
      pointer-events: none;
      transform: translate(-50%, -50%) scale(0);
      z-index: 9998;
      box-shadow: 0 0 30px var(--gold-glow);
    }

    /* Real Screen Frame Styles */
    .screen-mockup-frame {
      border-radius: 20px;
      overflow: hidden;
      border: 2px solid rgba(218, 178, 60, 0.48);
      background: #020617;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.7), 0 0 32px rgba(218, 178, 60, 0.2);
      position: relative;
    }
    .screen-mockup-header {
      background: rgba(15, 23, 42, 0.96);
      padding: 10px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(218, 178, 60, 0.28);
    }
    .browser-dots {
      display: flex;
      gap: 8px;
    }
    .browser-dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
    }
    .browser-dot.red { background: #ef4444; }
    .browser-dot.yellow { background: #f59e0b; }
    .browser-dot.green { background: #10b981; }

    .browser-address {
      font-family: var(--font-main);
      font-size: 14.5px;
      font-weight: 800;
      color: var(--gold-bright);
      background: rgba(0, 0, 0, 0.5);
      padding: 4px 18px;
      border-radius: 16px;
      border: 1px solid rgba(218, 178, 60, 0.35);
    }

    /* Official Church Stamp/Badge */
    .church-seal {
      display: inline-flex;
      align-items: center;
      gap: 14px;
      padding: 12px 26px;
      background: rgba(218, 178, 60, 0.16);
      border: 2.5px solid var(--gold);
      border-radius: 40px;
      box-shadow: 0 0 28px var(--gold-glow);
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
         الشريحة 1: الغلاف والرؤية الشاملة
         ======================================================================== -->
    <section class="slide active" id="slide-1">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="شعار مدرسة الكاروز" class="church-logo">
          <h1 class="slide-title">مدرسة الكاروز للكتاب المقدس</h1>
        </div>
        <div class="slide-badge">
          <span>✨</span> المنظومة الرقمية الكنسية الشاملة
        </div>
      </header>

      <div style="display: grid; grid-template-columns: 1.18fr 0.82fr; gap: 45px; align-items: center; margin: 20px 0;">
        <div class="hero-info-box">
          <div style="display: inline-flex; align-items: center; gap: 12px; padding: 9px 22px; background: rgba(218, 178, 60, 0.18); border: 1.5px solid var(--gold); border-radius: 28px; font-size: 17px; color: var(--gold-bright); font-weight: 800; margin-bottom: 20px;">
            <span>⛪</span> مطرانية شبرا الخيمة وتوابعها — كنيسة مارمرقس الرسول بالمنشية
          </div>
          
          <h2 style="font-size: 54px; font-weight: 900; line-height: 1.25; margin-bottom: 18px;" class="text-depth-3d">
            المنظومة الرقمية الذكية <br>
            <span class="text-liquid-gold">للتعليم الأكاديمي والإدارة الكنسية</span>
          </h2>
          
          <p style="font-size: 21px; line-height: 1.8; color: var(--muted); margin-bottom: 28px; font-weight: 600;">
            بوابة رقمية كنسية متكاملة تدمج بين التعليم اللاهوتي الرصين والتكنولوجيا السحابية الفائقة: رصد الحضور الذكي، إدارة الامتحانات والماراثون الروحي، وأضخم موسوعة رقمية تفاعلية لأسفار الكتاب المقدس وتفاسير الآباء.
          </p>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px;">
            <div class="glass-card" style="padding: 20px; text-align: center; border-color: rgba(218, 178, 60, 0.5);">
              <div style="font-size: 46px; font-weight: 900; color: var(--gold-bright);" class="stat-number" data-target="3">0</div>
              <div style="font-size: 19px; font-weight: 800; color: var(--white); margin-top: 4px;">فرق دراسية كاملة</div>
              <div style="font-size: 15px; color: var(--muted); margin-top: 3px;">صفوف أكاديمية 1، 2، 3</div>
            </div>
            
            <div class="glass-card" style="padding: 20px; text-align: center; border-color: rgba(0, 196, 236, 0.5);">
              <div style="font-size: 46px; font-weight: 900;" class="stat-number text-cyan-neon" data-target="73">0</div>
              <div style="font-size: 19px; font-weight: 800; color: var(--white); margin-top: 4px;">سفراً قانونياً موثقاً</div>
              <div style="font-size: 15px; color: var(--muted); margin-top: 3px;">تفاسير الآباء المعتمدة</div>
            </div>

            <div class="glass-card" style="padding: 20px; text-align: center; border-color: rgba(16, 196, 138, 0.5);">
              <div style="font-size: 46px; font-weight: 900;" class="stat-number text-emerald-glow" data-target="100">0</div>
              <div style="font-size: 19px; font-weight: 800; color: var(--white); margin-top: 4px;">% سحابي وفوري</div>
              <div style="font-size: 15px; color: var(--muted); margin-top: 3px;">تطبيق هاتف بدون تثبيت</div>
            </div>
          </div>
        </div>

        <div class="hero-visual-col" style="position: relative; display: flex; justify-content: center; align-items: center;">
          <div class="screen-mockup-frame floating-anim" style="width: 100%; max-width: 530px; z-index: 2;">
            <div class="screen-mockup-header">
              <div class="browser-dots">
                <span class="browser-dot red"></span>
                <span class="browser-dot yellow"></span>
                <span class="browser-dot green"></span>
              </div>
              <span class="browser-address">منظومة مدرسة الكاروز ⟵ موسوعة الكتاب المقدس</span>
            </div>
            <img src="assets/real_bible_hub.png" alt="منصة مدرسة الكاروز" style="width: 100%; height: 310px; object-fit: cover; object-position: top; display: block;">
          </div>

          <div class="floating-anim-delay" style="position: absolute; bottom: -25px; left: -20px; width: 190px; z-index: 3; border-radius: 30px; overflow: hidden; border: 4px solid #1e293b; box-shadow: 0 20px 40px rgba(0,0,0,0.8), 0 0 25px var(--cyan-glow);">
            <img src="assets/real_mobile_login.png" alt="تطبيق الهاتف المحمول" style="width: 100%; height: 345px; object-fit: cover; display: block;">
          </div>

          <div class="floating-anim" style="position: absolute; top: -20px; right: -15px; width: 100px; height: 100px; border-radius: 50%; border: 3px solid var(--gold); box-shadow: 0 0 28px var(--gold-glow); overflow: hidden; z-index: 4;">
            <img src="assets/c_sanctuary.png" alt="مذبح الكنيسة" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
        </div>
      </div>

      <footer class="slide-footer">
        <div>كنيسة مارمرقس الرسول بالمنشية — شبرا الخيمة</div>
        <div style="color: var(--cyan); font-weight: bold;">● المنظومة تعمل حياً ومفعلة لجميع الخدام والدارسين</div>
      </footer>
    </section>


    <!-- ========================================================================
         الشريحة 2: التحديات الواقعية والتحول الرقمي
         ======================================================================== -->
    <section class="slide" id="slide-2">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="شعار مدرسة الكاروز" class="church-logo">
          <h2 class="slide-title">لماذا احتاجت مدرسة الكاروز إلى المنظومة الرقمية؟</h2>
        </div>
        <div class="slide-badge" style="color: #ff6b81; border-color: rgba(225, 50, 68, 0.45);">
          <span>⚠️</span> التحديات والمشكلات الواقعية
        </div>
      </header>

      <div style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 40px; align-items: center; margin: 18px 0;">
        <div style="display: flex; flex-direction: column; gap: 18px;">
          <div class="glass-card" style="padding: 24px; border-right: 6px solid var(--crimson);">
            <div style="display: flex; align-items: center; gap: 18px;">
              <span style="font-size: 36px;">📁</span>
              <div>
                <h3 style="font-size: 25px; font-weight: 900;" class="text-ruby-glow">فقدان وتشتت السجلات الورقية وكشوفات المتابعة</h3>
                <p style="font-size: 18.5px; color: var(--muted); margin-top: 6px; line-height: 1.6; font-weight: 600;">
                  الاعتماد لسنوات طويلة على الكشوفات اليدوية والملفات غير المركزية عرّض بيانات مئات الطلاب وسجلات الدرجات للضياع والتلف وصعوبة الاسترجاع عند تعاقب الخدام.
                </p>
              </div>
            </div>
          </div>

          <div class="glass-card" style="padding: 24px; border-right: 6px solid var(--gold);">
            <div style="display: flex; align-items: center; gap: 18px;">
              <span style="font-size: 36px;">⏱️</span>
              <div>
                <h3 style="font-size: 25px; font-weight: 900; color: var(--gold-bright);">استنزاف أوقات الاجتماعات في تدوين الحضور</h3>
                <p style="font-size: 18.5px; color: var(--muted); margin-top: 6px; line-height: 1.6; font-weight: 600;">
                  استهلاك أوقات الخدمة في تدوين الحضور والغياب ورقياً دون وجود إحصائيات دقيقة أو تنبيهات فورية للمتابعة والافتقاد الرعوي للمخدومين المنقطعين.
                </p>
              </div>
            </div>
          </div>

          <div class="glass-card" style="padding: 24px; border-right: 6px solid var(--cyan);">
            <div style="display: flex; align-items: center; gap: 18px;">
              <span style="font-size: 36px;">💬</span>
              <div>
                <h3 style="font-size: 25px; font-weight: 900;" class="text-cyan-neon">تشتت المناهج والتفاسير في المحادثات المتفرقة</h3>
                <p style="font-size: 18.5px; color: var(--muted); margin-top: 6px; line-height: 1.6; font-weight: 600;">
                  إرسال المحاضرات والملفات الصوتية كرسائل متفرقة عبر وسائل التواصل أفقدها التوثيق والتنظيم المنهجي، وأرهق الطالب في المذاكرة والمتابعة.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="glass-card" style="padding: 26px; text-align: center; border-color: rgba(218, 178, 60, 0.45);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px;">
            <span style="font-size: 16px; font-weight: 800; color: #ff6b81; background: rgba(225,50,68,0.22); padding: 6px 16px; border-radius: 16px;">سابقاً: تشتت يدوي وورقي</span>
            <span style="font-size: 20px; color: var(--gold-bright); font-weight: 900;">⟵ التحول الجذري ⟶</span>
            <span style="font-size: 16px; font-weight: 800; color: var(--emerald); background: rgba(16,196,138,0.22); padding: 6px 16px; border-radius: 16px;">الآن: منصة سحابية مركزية</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 18px;">
            <div style="border-radius: 18px; overflow: hidden; border: 1.5px solid rgba(225,50,68,0.45);">
              <img src="assets/c_manuscript.png" alt="الأساليب التقليدية" style="width: 100%; height: 185px; object-fit: cover;">
              <div style="padding: 10px; font-size: 15px; background: rgba(225,50,68,0.18); color: #ff9aa2; font-weight: 800;">أوراق وكشوفات معرضة للتلف والضياع</div>
            </div>
            
            <div style="border-radius: 18px; overflow: hidden; border: 1.5px solid rgba(16,196,138,0.5);">
              <img src="assets/real_login_screen.png" alt="المنظومة السحابية" style="width: 100%; height: 185px; object-fit: cover; object-position: top;">
              <div style="padding: 10px; font-size: 15px; background: rgba(16,196,138,0.18); color: #80ebd0; font-weight: 800;">دخول مشفر وسجلات مركزية آمنة</div>
            </div>
          </div>

          <div style="padding: 14px 18px; background: rgba(218, 178, 60, 0.14); border-radius: 16px; border: 1.5px dashed var(--gold); font-size: 17px; color: var(--gold-bright); font-weight: 800;">
            ✓ تحول رقمي متكامل يضمن سلامة وأمان بيانات مئات المخدومين والخدام لعشرات السنين
          </div>
        </div>
      </div>

      <footer class="slide-footer">
        <div>المشاكل الواقعية التي تم حلها جذرياً عبر رقمنة المنظومة</div>
        <div>الشريحة 2 من 9</div>
      </footer>
    </section>


    <!-- ========================================================================
         الشريحة 3: الأهداف الاستراتيجية ورسالة المنظومة
         ======================================================================== -->
    <section class="slide" id="slide-3">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="شعار مدرسة الكاروز" class="church-logo">
          <h2 class="slide-title">أهداف ورسالة المنظومة الرقمية للمستقبل</h2>
        </div>
        <div class="slide-badge">
          <span>🎯</span> الرؤية والتحول الرقمي
        </div>
      </header>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 26px; margin: 20px 0;">
        <div class="glass-card" style="padding: 28px; display: flex; flex-direction: column; justify-content: space-between; border-color: rgba(218, 178, 60, 0.5);">
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <span style="font-size: 16px; font-weight: 800; padding: 6px 16px; background: rgba(218, 178, 60, 0.22); color: var(--gold-bright); border-radius: 16px;">المحور الأول</span>
              <span style="font-size: 28px;">🏛️</span>
            </div>
            <h3 style="font-size: 26px; font-weight: 900; color: var(--gold-bright); margin-bottom: 14px;">التحول الرقمي الشامل للإدارة</h3>
            <p style="font-size: 18px; color: var(--muted); line-height: 1.7; margin-bottom: 20px; font-weight: 600;">
              بناء قاعدة بيانات موحدة للطلاب والخدام والسكرتارية والإدارة تضمن سلامة وأمان السجلات الأكاديمية والخدمية لعشرات السنين.
            </p>
          </div>
          <div style="border-radius: 16px; overflow: hidden; border: 1.5px solid rgba(218, 178, 60, 0.4); height: 180px;">
            <img src="assets/real_bible_hub.png" alt="لوحة الإدارة والموسوعة" style="width: 100%; height: 100%; object-fit: cover; object-position: top;">
          </div>
        </div>

        <div class="glass-card" style="padding: 28px; display: flex; flex-direction: column; justify-content: space-between; border-color: rgba(0, 196, 236, 0.5);">
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <span style="font-size: 16px; font-weight: 800; padding: 6px 16px; background: rgba(0, 196, 236, 0.22); color: var(--cyan); border-radius: 16px;">المحور الثاني</span>
              <span style="font-size: 28px;">📖</span>
            </div>
            <h3 style="font-size: 26px; font-weight: 900; margin-bottom: 14px;" class="text-cyan-neon">التعليم التفاعلي والتفاسير</h3>
            <p style="font-size: 18px; color: var(--muted); line-height: 1.7; margin-bottom: 20px; font-weight: 600;">
              إتاحة المناهج والمحاضرات الصوتية وتفاسير الآباء والامتحانات إلكترونياً بأسلوب شيق وعصري يربط المخدوم بالمنهج دون انقطاع.
            </p>
          </div>
          <div style="border-radius: 16px; overflow: hidden; border: 1.5px solid rgba(0, 196, 236, 0.4); height: 180px;">
            <img src="assets/real_bible_search.png" alt="محرك البحث والتفاسير" style="width: 100%; height: 100%; object-fit: cover; object-position: top;">
          </div>
        </div>

        <div class="glass-card" style="padding: 28px; display: flex; flex-direction: column; justify-content: space-between; border-color: rgba(16, 196, 138, 0.5);">
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <span style="font-size: 16px; font-weight: 800; padding: 6px 16px; background: rgba(16, 196, 138, 0.22); color: var(--emerald); border-radius: 16px;">المحور الثالث</span>
              <span style="font-size: 28px;">📱</span>
            </div>
            <h3 style="font-size: 26px; font-weight: 900; margin-bottom: 14px;" class="text-emerald-glow">تطبيق كنسي في متناول الجميع</h3>
            <p style="font-size: 18px; color: var(--muted); line-height: 1.7; margin-bottom: 20px; font-weight: 600;">
              تطبيق هاتف كنسي فوري وخفيف يعمل على كافة هواتف الطلاب والخدام بضغطة زر وبدون الحاجة للذهاب لمتاجر التطبيقات.
            </p>
          </div>
          <div style="border-radius: 16px; overflow: hidden; border: 1.5px solid rgba(16, 196, 138, 0.4); height: 180px;">
            <img src="assets/real_mobile_bible.png" alt="تطبيق الهاتف المحمول" style="width: 100%; height: 100%; object-fit: cover; object-position: top;">
          </div>
        </div>
      </div>

      <footer class="slide-footer">
        <div>مدرسة الكاروز — خطة التطوير الشاملة للتعليم الكنسي الرقمي</div>
        <div>الشريحة 3 من 9</div>
      </footer>
    </section>


    <!-- ========================================================================
         الشريحة 4: الأنظمة والمحاور الذكية الحية
         ======================================================================== -->
    <section class="slide" id="slide-4">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="شعار مدرسة الكاروز" class="church-logo">
          <h2 class="slide-title">المحاور والأنظمة الذكية الفعلية بالمنصة</h2>
        </div>
        <div class="slide-badge">
          <span>⚙️</span> أنظمة حية متكاملة
        </div>
      </header>

      <div style="display: grid; grid-template-columns: 1fr 1.15fr; gap: 35px; align-items: center; margin: 18px 0;">
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div class="glass-card sys-module-item active" onclick="switchSysScreen('attendance', this)" style="padding: 18px 22px; cursor: pointer; border-right: 6px solid var(--emerald);">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 16px;">
                <span style="font-size: 30px;">📋</span>
                <div>
                  <h3 style="font-size: 22px; font-weight: 900;" class="text-emerald-glow">نظام رصد الحضور الذكي والافتقاد</h3>
                  <p style="font-size: 16px; color: var(--muted); margin-top: 4px; font-weight: 600;">مسح الرمز السريع، إحصاء الغياب، وتوليد رسائل الافتقاد عبر واتساب بضغطة زر واحدة.</p>
                </div>
              </div>
              <span style="font-size: 14px; padding: 5px 12px; border-radius: 12px; background: rgba(16,196,138,0.22); color: var(--emerald); font-weight: bold;">معاينة 👁️</span>
            </div>
          </div>

          <div class="glass-card sys-module-item" onclick="switchSysScreen('marathon', this)" style="padding: 18px 22px; cursor: pointer; border-right: 6px solid var(--gold);">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 16px;">
                <span style="font-size: 30px;">🏆</span>
                <div>
                  <h3 style="font-size: 22px; font-weight: 900; color: var(--gold-bright);">ماراثون حفظ الآيات والتنافس الروحي</h3>
                  <p style="font-size: 16px; color: var(--muted); margin-top: 4px; font-weight: 600;">لوحة شرف تفاعلية للمتصدرين، رصد درجات الحفظ والشواهد والترتيب التراكمي الأسبوعي.</p>
                </div>
              </div>
              <span style="font-size: 14px; padding: 5px 12px; border-radius: 12px; background: rgba(218,178,60,0.22); color: var(--gold-bright); font-weight: bold;">معاينة 👁️</span>
            </div>
          </div>

          <div class="glass-card sys-module-item" onclick="switchSysScreen('groups', this)" style="padding: 18px 22px; cursor: pointer; border-right: 6px solid var(--cyan);">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 16px;">
                <span style="font-size: 30px;">👥</span>
                <div>
                  <h3 style="font-size: 22px; font-weight: 900;" class="text-cyan-neon">إدارة الفرق والصفوف الدراسية (1، 2، 3)</h3>
                  <p style="font-size: 16px; color: var(--muted); margin-top: 4px; font-weight: 600;">ملف أكاديمي وشخصي لكل دارس مع سجل تاريخي للدرجات ومتابعة الخدام المباشرة.</p>
                </div>
              </div>
              <span style="font-size: 14px; padding: 5px 12px; border-radius: 12px; background: rgba(0,196,236,0.22); color: var(--cyan); font-weight: bold;">معاينة 👁️</span>
            </div>
          </div>

          <div class="glass-card sys-module-item" onclick="switchSysScreen('security', this)" style="padding: 18px 22px; cursor: pointer; border-right: 6px solid #a855f7;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 16px;">
                <span style="font-size: 30px;">🛡️</span>
                <div>
                  <h3 style="font-size: 22px; font-weight: 900; color: #c084fc;">الأمان المشدد والصلاحيات الهرمية</h3>
                  <p style="font-size: 16px; color: var(--muted); margin-top: 4px; font-weight: 600;">بنية سحابية مشددة تعزل صلاحيات الإدارة والخدام والطلبة مع تشفير رقمي شامل للجلسات.</p>
                </div>
              </div>
              <span style="font-size: 14px; padding: 5px 12px; border-radius: 12px; background: rgba(168,85,247,0.22); color: #c084fc; font-weight: bold;">معاينة 👁️</span>
            </div>
          </div>
        </div>

        <div>
          <div class="screen-mockup-frame" id="sysScreenDisplay" style="height: 390px;">
            <div class="screen-mockup-header">
              <div class="browser-dots">
                <span class="browser-dot red"></span>
                <span class="browser-dot yellow"></span>
                <span class="browser-dot green"></span>
              </div>
              <span class="browser-address" id="sysScreenUrl">منظومة مدرسة الكاروز ⟵ رصد الحضور الذكي</span>
            </div>
            <img id="sysScreenImg" src="assets/real_screen_attendance.png" alt="معاينة النظام الحي" style="width: 100%; height: 350px; object-fit: cover; object-position: top; display: block; transition: opacity 0.3s ease;">
          </div>
          <div style="text-align: center; margin-top: 14px; font-size: 15px; color: var(--gold-bright); font-weight: 800;">
            💡 انقر على أي نظام من القائمة باليمين لمعاينة شاشته الحقيقية فوراً أمام الحضور
          </div>
        </div>
      </div>

      <footer class="slide-footer">
        <div>حلول رقمية متكاملة تواكب متطلبات الإدارة والخدمة الكنسية الحديثة</div>
        <div>الشريحة 4 من 9</div>
      </footer>
    </section>


                <!-- ========================================================================
         الشريحة 5: أقسام موسوعة العلوم الكنسية والرقمية (الـ 10 أقسام الرئيسية)
         ======================================================================== -->
    <section class="slide" id="slide-5">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="شعار مدرسة الكاروز" class="church-logo">
          <h2 class="slide-title">أقسام موسوعة العلوم الكنسية والرقمية الشاملة</h2>
        </div>
        <div class="slide-badge" style="color: var(--gold-bright); border-color: rgba(218, 178, 60, 0.45);">
          <span>📚</span> 10 أقسام تخصصية كبرى — 47,923 مادة كنسية
        </div>
      </header>

      <div style="display: grid; grid-template-columns: 1.18fr 0.82fr; gap: 20px; align-items: start; margin-top: 6px;">
        <!-- 10 Sections Grid (2 columns x 5 rows) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          
          <!-- القسم 1: الكتاب المقدس -->
          <div class="glass-card enc-sec-card active" onclick="switchEncSection('sec1', this, event)" style="padding: 7px 12px; cursor: pointer; border-right: 5px solid var(--gold); border-radius: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1px;">
              <span style="font-size: 11px; font-weight: 800; padding: 1px 7px; border-radius: 6px; background: rgba(218,178,60,0.22); color: var(--gold-bright);">قسم 01</span>
              <span style="font-size: 14px;">📖</span>
            </div>
            <h3 style="font-size: 15px; font-weight: 900; color: var(--gold-bright); margin: 0;">الكتاب المقدس</h3>
            <p style="font-size: 11.5px; color: var(--muted); line-height: 1.3; margin-top: 2px; font-weight: 600; margin-bottom: 0;">
              الـ 73 سفراً كاملاً بالتشكيل الدقيق والتقسيم الكنسي الأرثوذكسي والأسفار القانونية الثانية.
            </p>
          </div>

          <!-- القسم 2: تفسير الكتاب المقدس -->
          <div class="glass-card enc-sec-card" onclick="switchEncSection('sec2', this, event)" style="padding: 7px 12px; cursor: pointer; border-right: 5px solid var(--cyan); border-radius: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1px;">
              <span style="font-size: 11px; font-weight: 800; padding: 1px 7px; border-radius: 6px; background: rgba(0,196,236,0.22); color: var(--cyan);">قسم 02</span>
              <span style="font-size: 14px;">📜</span>
            </div>
            <h3 style="font-size: 15px; font-weight: 900; color: var(--cyan); margin: 0;">تفسير الكتاب المقدس</h3>
            <p style="font-size: 11.5px; color: var(--muted); line-height: 1.3; margin-top: 2px; font-weight: 600; margin-bottom: 0;">
              شروحات القمص تادرس يعقوب والقمص أنطونيوس فكري وتفاسير الآباء الأولين آية بآية.
            </p>
          </div>

          <!-- القسم 3: ترجمات الكتاب المقدس -->
          <div class="glass-card enc-sec-card" onclick="switchEncSection('sec3', this, event)" style="padding: 7px 12px; cursor: pointer; border-right: 5px solid var(--emerald); border-radius: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1px;">
              <span style="font-size: 11px; font-weight: 800; padding: 1px 7px; border-radius: 6px; background: rgba(16,196,138,0.22); color: var(--emerald);">قسم 03</span>
              <span style="font-size: 14px;">🌐</span>
            </div>
            <h3 style="font-size: 15px; font-weight: 900; color: var(--emerald); margin: 0;">ترجمات الكتاب المقدس</h3>
            <p style="font-size: 11.5px; color: var(--muted); line-height: 1.3; margin-top: 2px; font-weight: 600; margin-bottom: 0;">
              مقارنة الترجمات العربية المعتمدة والنص القبطي والسبعيني والترجمات العالمية.
            </p>
          </div>

          <!-- القسم 4: مخطوطات الكتاب المقدس -->
          <div class="glass-card enc-sec-card" onclick="switchEncSection('sec4', this, event)" style="padding: 7px 12px; cursor: pointer; border-right: 5px solid #c084fc; border-radius: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1px;">
              <span style="font-size: 11px; font-weight: 800; padding: 1px 7px; border-radius: 6px; background: rgba(192,132,252,0.22); color: #c084fc);">قسم 04</span>
              <span style="font-size: 14px;">🏛️</span>
            </div>
            <h3 style="font-size: 15px; font-weight: 900; color: #c084fc; margin: 0;">مخطوطات الكتاب المقدس</h3>
            <p style="font-size: 11.5px; color: var(--muted); line-height: 1.3; margin-top: 2px; font-weight: 600; margin-bottom: 0;">
              دراسات النقد النصي وتوثيق المخطوطات الأثرية (السينائية والفاتيكانية وقمران).
            </p>
          </div>

          <!-- القسم 5: شبهات الكتاب المقدس -->
          <div class="glass-card enc-sec-card" onclick="switchEncSection('sec5', this, event)" style="padding: 7px 12px; cursor: pointer; border-right: 5px solid #ff6b81; border-radius: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1px;">
              <span style="font-size: 11px; font-weight: 800; padding: 1px 7px; border-radius: 6px; background: rgba(255,107,129,0.22); color: #ff6b81);">قسم 05</span>
              <span style="font-size: 14px;">🛡️</span>
            </div>
            <h3 style="font-size: 15px; font-weight: 900; color: #ff6b81; margin: 0;">شبهات الكتاب المقدس</h3>
            <p style="font-size: 11.5px; color: var(--muted); line-height: 1.3; margin-top: 2px; font-weight: 600; margin-bottom: 0;">
              ردود لاهوتية وعلمية وتاريخية موثقة لتفنيد الشبهات والاعتراضات المعاصرة.
            </p>
          </div>

          <!-- القسم 6: اطلس الكتاب المقدس -->
          <div class="glass-card enc-sec-card" onclick="switchEncSection('sec6', this, event)" style="padding: 7px 12px; cursor: pointer; border-right: 5px solid #f59e0b; border-radius: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1px;">
              <span style="font-size: 11px; font-weight: 800; padding: 1px 7px; border-radius: 6px; background: rgba(245,158,11,0.22); color: #f59e0b);">قسم 06</span>
              <span style="font-size: 14px;">🗺️</span>
            </div>
            <h3 style="font-size: 15px; font-weight: 900; color: #f59e0b; margin: 0;">اطلس الكتاب المقدس</h3>
            <p style="font-size: 11.5px; color: var(--muted); line-height: 1.3; margin-top: 2px; font-weight: 600; margin-bottom: 0;">
              خرائط جغرافية تفاعلية عالية الدقة لمسارات الأنبياء ورحلات بولس والقدس.
            </p>
          </div>

          <!-- القسم 7: موسوعة الشخصيات الكتابية -->
          <div class="glass-card enc-sec-card" onclick="switchEncSection('sec7', this, event)" style="padding: 7px 12px; cursor: pointer; border-right: 5px solid #2dd4bf; border-radius: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1px;">
              <span style="font-size: 11px; font-weight: 800; padding: 1px 7px; border-radius: 6px; background: rgba(45,212,191,0.22); color: #2dd4bf);">قسم 07</span>
              <span style="font-size: 14px;">👤</span>
            </div>
            <h3 style="font-size: 15px; font-weight: 900; color: #2dd4bf; margin: 0;">موسوعة الشخصيات الكتابية</h3>
            <p style="font-size: 11.5px; color: var(--muted); line-height: 1.3; margin-top: 2px; font-weight: 600; margin-bottom: 0;">
              دليل تراجم وسير لأكثر من 3000 شخصية كتابية، مع تحليل الدروس الروحية وشجر الأنساب.
            </p>
          </div>

          <!-- القسم 8: موسوعة الاماكن و الشعوب -->
          <div class="glass-card enc-sec-card" onclick="switchEncSection('sec8', this, event)" style="padding: 7px 12px; cursor: pointer; border-right: 5px solid #38bdf8; border-radius: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1px;">
              <span style="font-size: 11px; font-weight: 800; padding: 1px 7px; border-radius: 6px; background: rgba(56,189,248,0.22); color: #38bdf8);">قسم 08</span>
              <span style="font-size: 14px;">🏰</span>
            </div>
            <h3 style="font-size: 15px; font-weight: 900; color: #38bdf8; margin: 0;">موسوعة الاماكن و الشعوب</h3>
            <p style="font-size: 11.5px; color: var(--muted); line-height: 1.3; margin-top: 2px; font-weight: 600; margin-bottom: 0;">
              توثيق تاريخي وجغرافي لمدن وقرى وممالك العهدين القديم والجديد والشعوب القديمة.
            </p>
          </div>

          <!-- القسم 9: المارثون -->
          <div class="glass-card enc-sec-card" onclick="switchEncSection('sec9', this, event)" style="padding: 7px 12px; cursor: pointer; border-right: 5px solid #fbbf24; border-radius: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1px;">
              <span style="font-size: 11px; font-weight: 800; padding: 1px 7px; border-radius: 6px; background: rgba(251,191,36,0.22); color: #fbbf24);">قسم 09</span>
              <span style="font-size: 14px;">🏆</span>
            </div>
            <h3 style="font-size: 15px; font-weight: 900; color: #fbbf24; margin: 0;">المارثون</h3>
            <p style="font-size: 11.5px; color: var(--muted); line-height: 1.3; margin-top: 2px; font-weight: 600; margin-bottom: 0;">
              نظام التنافس وحفظ الآيات، بنك الأسئلة التفاعلي، ورصد الدرجات التراكمي الأسبوعي.
            </p>
          </div>

          <!-- القسم 10: قواميس الكتاب المقدس -->
          <div class="glass-card enc-sec-card" onclick="switchEncSection('sec10', this, event)" style="padding: 7px 12px; cursor: pointer; border-right: 5px solid #818cf8; border-radius: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1px;">
              <span style="font-size: 11px; font-weight: 800; padding: 1px 7px; border-radius: 6px; background: rgba(129,140,248,0.22); color: #818cf8);">قسم 10</span>
              <span style="font-size: 14px;">📖</span>
            </div>
            <h3 style="font-size: 15px; font-weight: 900; color: #818cf8; margin: 0;">قواميس الكتاب المقدس</h3>
            <p style="font-size: 11.5px; color: var(--muted); line-height: 1.3; margin-top: 2px; font-weight: 600; margin-bottom: 0;">
              أضخم معجم وقاموس كتابي لشرح المفردات العبرية واليونانية وتأصيل المعاني الكنسية.
            </p>
          </div>

        </div>

        <!-- Left Showcase Side -->
        <div>
          <!-- Top Stat Banner -->
          <div style="background: rgba(14, 30, 68, 0.75); border: 1.5px solid var(--card-border); border-radius: 14px; padding: 10px 16px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <span style="font-size: 13px; color: var(--muted); font-weight: 700;">إجمالي محتوى الموسوعة الرقمية:</span>
              <div style="font-size: 26px; font-weight: 900; color: var(--gold-bright);" class="stat-number" data-target="47923">47,923</div>
            </div>
            <div style="text-align: left;">
              <span style="font-size: 13.5px; color: var(--cyan); font-weight: 800;">10 أقسام متكاملة و 64 محرك بحث</span>
              <div style="font-size: 11.5px; color: var(--muted); margin-top: 1px;">فهرسة وتجزئة سحابية فائقة السرعة</div>
            </div>
          </div>

          <!-- Browser Frame Display -->
          <div class="screen-mockup-frame" id="encFrameDisplay" style="height: 240px; margin-bottom: 8px;">
            <div class="screen-mockup-header">
              <div class="browser-dots">
                <span class="browser-dot red"></span>
                <span class="browser-dot yellow"></span>
                <span class="browser-dot green"></span>
              </div>
              <span class="browser-address" id="encFrameUrl">منظومة مدرسة الكاروز ⟵ فهرس أسفار الكتاب المقدس (73 سفراً)</span>
            </div>
            <img id="encFrameImg" src="assets/real_bible_hub.png" alt="أقسام الموسوعة" style="width: 100%; height: 204px; object-fit: cover; object-position: top; display: block; transition: all 0.25s ease;">
          </div>

          <!-- Active Section Detail Bar -->
          <div id="encDetailBox" style="background: rgba(14, 30, 68, 0.75); border: 1.5px solid rgba(218, 178, 60, 0.45); border-radius: 12px; padding: 8px 14px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <h4 id="encDetailTitle" style="font-size: 15px; font-weight: 900; color: var(--gold-bright); margin: 0;">الكتاب المقدس</h4>
              <span id="encDetailTag" style="font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 6px; background: rgba(218,178,60,0.22); color: var(--gold-bright);">نص قانوني موثق 100%</span>
            </div>
            <p id="encDetailDesc" style="font-size: 12px; color: #cbd5e1; line-height: 1.4; margin-top: 4px; margin-bottom: 0;">
              الـ 73 سفراً القانونية كاملة بالتشكيل الدقيق، مع فهارس ذكية، تقسيم أصحاحات وشواهد، ودعم كامل للأسفار القانونية الثانية.
            </p>
          </div>

          <div style="text-align: center; margin-top: 6px; font-size: 12px; color: var(--gold-bright); font-weight: 700;">
            💡 انقر على أي قسم من الأقسام الـ 10 باليمين لمعاينة واجهته الحقيقية ومحتواه التخصصي
          </div>
        </div>
      </div>

      <footer class="slide-footer">
        <div>أضخم قاعدة معرفية كنسية متكاملة لربط الطالب والمخدوم بكلمة الله وتراث الكنيسة الحي</div>
        <div>الشريحة 5 من 9</div>
      </footer>
    </section>


    <!-- ========================================================================
         الشريحة 6: وثوقية واعتماد المصادر الكنسية وسلامة التعليم
         ======================================================================== -->
    <section class="slide" id="slide-6">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="شعار مدرسة الكاروز" class="church-logo">
          <h2 class="slide-title">وثوقية واعتماد المصادر وسلامة التعليم الأرثوذكسي</h2>
        </div>
        <div class="slide-badge" style="color: var(--emerald); border-color: rgba(16, 196, 138, 0.45);">
          <span>🛡️</span> مرجعية كنسية وآبائية معتمدة 100%
        </div>
      </header>

      <div style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 35px; align-items: center; margin: 18px 0;">
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Pillar 1 -->
          <div class="glass-card" style="padding: 22px 26px; border-right: 6px solid var(--gold);">
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 6px;">
              <span style="font-size: 32px;">🏛️</span>
              <div>
                <h3 style="font-size: 23px; font-weight: 900; color: var(--gold-bright);">المصدر الرقمي المعتمد: موقع الأنبا تكلا هيمانوت</h3>
                <span style="font-size: 15px; color: var(--cyan); font-weight: 800;">الموقع الكنسي الأرثوذكسي المعتمد — الإسكندرية</span>
              </div>
            </div>
            <p style="font-size: 17px; color: var(--muted); line-height: 1.7; font-weight: 600;">
              الاعتماد المباشر على الأرشيف الرقمي الأرثوذكسي الأول والأكبر في الشرق الأوسط، المعتمد كنسياً للنصوص والتفاسير وقواميس الكلمات والعلوم اللاهوتية.
            </p>
          </div>

          <!-- Pillar 2 -->
          <div class="glass-card" style="padding: 22px 26px; border-right: 6px solid var(--emerald);">
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 6px;">
              <span style="font-size: 32px;">✝️</span>
              <div>
                <h3 style="font-size: 23px; font-weight: 900;" class="text-emerald-glow">كبار شراح الكنيسة القبطية الأرثوذكسية</h3>
                <span style="font-size: 15px; color: var(--gold-bright); font-weight: 800;">مطبوعات وتفاسير رسمية موثقة ومعتمدة</span>
              </div>
            </div>
            <p style="font-size: 17px; color: var(--muted); line-height: 1.7; font-weight: 600;">
              شروحات <strong>القمص تادرس يعقوب ملطي</strong> (التفسير الآبائي الشامل)، <strong>القمص أنطونيوس فكري</strong> (التفسير التفصيلي لكل آية)، وكتابات <strong>قداسة البابا شنوده الثالث</strong> وتعاليم الآباء الأولين (ذهبي الفم، كيرلس الكبير، وأثناسيوس الرسولي).
            </p>
          </div>

          <!-- Pillar 3 -->
          <div class="glass-card" style="padding: 22px 26px; border-right: 6px solid var(--cyan);">
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 6px;">
              <span style="font-size: 32px;">🔍</span>
              <div>
                <h3 style="font-size: 23px; font-weight: 900;" class="text-cyan-neon">تدقيق وتطهير المحتوى وسلامة العقيدة</h3>
                <span style="font-size: 15px; color: #a5f3fc; font-weight: 800;">عقيدة أرثوذكسية نقية 100%</span>
              </div>
            </div>
            <p style="font-size: 17px; color: var(--muted); line-height: 1.7; font-weight: 600;">
              خضعت كافة المقالات والأبحاث لتدقيق لاهوتي ومراجعة دقيقة مع استبعاد وتطهير أي مصادر غير متوافقة مع تسليم الكنيسة، لضمان تعليم أرثوذكسي سليم وموثوق به تماماً لدارسي مدرسة الكاروز.
            </p>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 18px;">
          <div class="glass-card" style="padding: 26px; text-align: center; border-color: rgba(218, 178, 60, 0.55);">
            <div class="church-seal" style="margin-bottom: 16px;">
              <span style="font-size: 26px;">📜</span>
              <span style="font-size: 18px; font-weight: 900; color: var(--gold-bright);">توثيق كنسي معتمد وسلامة لاهوتية تامة</span>
            </div>
            <p style="font-size: 17px; color: var(--muted); line-height: 1.7; margin-bottom: 18px; font-weight: 600;">
              كل آية وشاهد وتفسير مرتبط بمصدره الأصلي المعتمد، ومحمي ببصمة رقمية مشفرة مانعة للتعديل لحفظ دقة النصوص المقدسة.
            </p>
            <div style="display: flex; justify-content: center; gap: 24px; font-size: 16px; font-weight: 800;">
              <span style="color: var(--emerald);">✓ 73 سفراً كاملاً</span>
              <span style="color: var(--gold-bright);">✓ أسفار قانونية ثانية</span>
              <span style="color: var(--cyan);">✓ مراجعة كنسية دقيقة</span>
            </div>
          </div>

          <div class="screen-mockup-frame" style="height: 220px;">
            <div class="screen-mockup-header">
              <div class="browser-dots">
                <span class="browser-dot red"></span>
                <span class="browser-dot yellow"></span>
                <span class="browser-dot green"></span>
              </div>
              <span class="browser-address">منظومة مدرسة الكاروز ⟵ تفاسير الآباء والبحث المعتمد</span>
            </div>
            <img src="assets/real_bible_search.png" alt="توثيق التفاسير المعتمدة" style="width: 100%; height: 180px; object-fit: cover; object-position: top; display: block;">
          </div>
        </div>
      </div>

      <footer class="slide-footer">
        <div>توثيق علمي كنسي يمنح الخدام والدارسين الثقة الكاملة في كل معلومة وشاهد وتفسير</div>
        <div>الشريحة 6 من 9</div>
      </footer>
    </section>


    <!-- ========================================================================
         الشريحة 7: التوافق الكامل مع كافة الشاشات والأجهزة
         ======================================================================== -->
    <section class="slide" id="slide-7">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="شعار مدرسة الكاروز" class="church-logo">
          <h2 class="slide-title">يعمل بسلاسة وتجاوب على جميع الشاشات والأجهزة</h2>
        </div>
        <div class="slide-badge" style="color: var(--cyan); border-color: rgba(0, 196, 236, 0.45);">
          <span>📱</span> تجربة استخدام فائقة ومتوافقة مع كل الأجهزة
        </div>
      </header>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; margin: 18px 0;">
        <div class="glass-card" style="padding: 32px;">
          <h3 style="font-size: 28px; font-weight: 900; color: var(--gold-bright); margin-bottom: 24px;">
            متاح لكل طالب وخادم أينما كان وفي أي وقت
          </h3>

          <div style="display: flex; flex-direction: column; gap: 22px;">
            <div style="display: flex; gap: 18px; align-items: flex-start;">
              <span style="font-size: 28px; padding: 12px; background: rgba(0,196,236,0.18); border-radius: 16px; color: var(--cyan);">📲</span>
              <div>
                <h4 style="font-size: 22px; font-weight: 900; color: var(--white);">تطبيق هاتف كنسي فوري وخفيف</h4>
                <p style="font-size: 17px; color: var(--muted); margin-top: 5px; line-height: 1.7; font-weight: 600;">
                  تثبيت فوري بنقرة واحدة على الشاشة الرئيسية للهاتف بدون الحاجة للذهاب لمتاجر التطبيقات وبمساحة خفيفة جداً.
                </p>
              </div>
            </div>

            <div style="display: flex; gap: 18px; align-items: flex-start;">
              <span style="font-size: 28px; padding: 12px; background: rgba(218,178,60,0.18); border-radius: 16px; color: var(--gold);">🎨</span>
              <div>
                <h4 style="font-size: 22px; font-weight: 900; color: var(--white);">3 مظاهر بصرية كنسية فاخرة</h4>
                <p style="font-size: 17px; color: var(--muted); margin-top: 5px; line-height: 1.7; font-weight: 600;">
                  دعم كامل للمظهر النهاري، المظهر الليلي المريح، والمظهر الملكي القبطي الفاخر (الكحلي الليلي والذهب الساطع).
                </p>
              </div>
            </div>

            <div style="display: flex; gap: 18px; align-items: flex-start;">
              <span style="font-size: 28px; padding: 12px; background: rgba(16,196,138,0.18); border-radius: 16px; color: var(--emerald);">⚡</span>
              <div>
                <h4 style="font-size: 22px; font-weight: 900; color: var(--white);">سرعة استجابة فائقة وأداء سحابي</h4>
                <p style="font-size: 17px; color: var(--muted); margin-top: 5px; line-height: 1.7; font-weight: 600;">
                  أحدث التقنيات السحابية العالمية تضمن تصفحاً فورياً وسريعاً حتى في ظل ضعف شبكة الإنترنت داخل القاعات.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div style="position: relative; display: flex; justify-content: center; align-items: center; height: 400px;">
          <div class="screen-mockup-frame floating-anim" style="width: 100%; max-width: 490px; z-index: 1;">
            <div class="screen-mockup-header">
              <div class="browser-dots">
                <span class="browser-dot red"></span>
                <span class="browser-dot yellow"></span>
                <span class="browser-dot green"></span>
              </div>
              <span class="browser-address">شاشة الكمبيوتر واللابتوب</span>
            </div>
            <img src="assets/real_bible_hub.png" alt="كمبيوتر" style="width: 100%; height: 265px; object-fit: cover; object-position: top; display: block;">
          </div>

          <div class="floating-anim-delay" style="position: absolute; bottom: 10px; right: 0; width: 180px; border-radius: 28px; overflow: hidden; border: 4px solid #1e293b; box-shadow: 0 25px 50px rgba(0,0,0,0.8), 0 0 25px var(--gold-glow); z-index: 3;">
            <img src="assets/real_mobile_bible.png" alt="موبايل" style="width: 100%; height: 330px; object-fit: cover; display: block;">
          </div>
        </div>
      </div>

      <footer class="slide-footer">
        <div>لقطات حية تم التقاطها بدقة من المنصة المنشورة فعلياً لجميع الشاشات</div>
        <div>الشريحة 7 من 9</div>
      </footer>
    </section>


    <!-- ========================================================================
         الشريحة 8: الأمان والخصوصية والبنية السحابية
         ======================================================================== -->
    <section class="slide" id="slide-8">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="شعار مدرسة الكاروز" class="church-logo">
          <h2 class="slide-title">الأمان، الخصوصية، والموثوقية التقنية المشددة</h2>
        </div>
        <div class="slide-badge" style="color: var(--cyan); border-color: rgba(0, 196, 236, 0.45);">
          <span>🛡️</span> بنية تحتية صلبة ومستقرة
        </div>
      </header>

      <div style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 40px; align-items: center; margin: 18px 0;">
        <div style="display: flex; flex-direction: column; gap: 18px;">
          <div class="glass-card" style="padding: 24px; border-right: 6px solid var(--emerald);">
            <div style="display: flex; align-items: center; gap: 18px;">
              <span style="font-size: 34px;">🔐</span>
              <div>
                <h3 style="font-size: 23px; font-weight: 900;" class="text-emerald-glow">نظام الصلاحيات الهرمي المشدد والمحكم</h3>
                <p style="font-size: 17px; color: var(--muted); margin-top: 6px; line-height: 1.6; font-weight: 600;">
                  فصل صارم بين صلاحيات (المدير العام، المشرف العام، خادم الفرقة، السكرتارية، والطالب)، بحيث لا يطّلع أي شخص إلا على بيانات فرقته فقط حفاظاً على سرية وخصوصية الطلاب.
                </p>
              </div>
            </div>
          </div>

          <div class="glass-card" style="padding: 24px; border-right: 6px solid var(--gold);">
            <div style="display: flex; align-items: center; gap: 18px;">
              <span style="font-size: 34px;">🛡️</span>
              <div>
                <h3 style="font-size: 23px; font-weight: 900; color: var(--gold-bright);">أمان قواعد البيانات على مستوى كل صف فردي</h3>
                <p style="font-size: 17px; color: var(--muted); margin-top: 6px; line-height: 1.6; font-weight: 600;">
                  تطبيق سياسات حماية السجلات المشددة لمنع أي اختراق أو وصول غير مصرح به على مستوى السجلات الفردية، مع تشفير رقمي كامل للجلسات والرموز الأمنية.
                </p>
              </div>
            </div>
          </div>

          <div class="glass-card" style="padding: 24px; border-right: 6px solid var(--cyan);">
            <div style="display: flex; align-items: center; gap: 18px;">
              <span style="font-size: 34px;">☁️</span>
              <div>
                <h3 style="font-size: 23px; font-weight: 900;" class="text-cyan-neon">الحماية من التخمين والنسخ الاحتياطي الدوري</h3>
                <p style="font-size: 17px; color: var(--muted); margin-top: 6px; line-height: 1.6; font-weight: 600;">
                  نظام ذكي لقفل تسجيل الدخول مؤقتاً عند تكرار المحاولات الخاطئة لمنع أي هجوم، مع حفظ واسترجاع سحابي دوري للبيانات في أي وقت.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="glass-card" style="padding: 26px; text-align: center; border-color: rgba(0, 196, 236, 0.45); position: relative;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <span style="font-size: 15px; font-weight: 800; color: var(--emerald); background: rgba(16,196,138,0.22); padding: 6px 14px; border-radius: 14px;">🔒 بوابة دخول آمنة</span>
            <span style="font-size: 15px; color: var(--muted); font-weight: 700;">تشفير سحابي شامل وفائق الأمان</span>
          </div>

          <div class="screen-mockup-frame" style="position: relative;">
            <img src="assets/real_login_screen.png" alt="بوابة الدخول الآمنة" style="width: 100%; height: 265px; object-fit: cover; object-position: top; display: block;">
          </div>

          <div style="display: flex; justify-content: space-around; margin-top: 18px; font-size: 15px; font-weight: 800;">
            <span style="color: var(--emerald);">✓ حماية من الهجمات</span>
            <span style="color: var(--gold-bright);">✓ تشفير البيانات</span>
            <span style="color: var(--cyan);">✓ نسخ احتياطي آلي</span>
          </div>
        </div>
      </div>

      <footer class="slide-footer">
        <div>بنية أمنية ثلاثية الطبقات تضمن أمان واستمرارية المنظومة الرقمية</div>
        <div>الشريحة 8 من 9</div>
      </footer>
    </section>


    <!-- ========================================================================
         الشريحة 9: التجربة الحية والبدء المباشر (تم حذف QR Code بالكامل)
         ======================================================================== -->
    <section class="slide" id="slide-9">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="شعار مدرسة الكاروز" class="church-logo">
          <h2 class="slide-title">ابدأ التجربة الحية لمنظومة مدرسة الكاروز الآن</h2>
        </div>
        <div class="slide-badge" style="color: var(--emerald); border-color: rgba(16, 196, 138, 0.45);">
          <span>🚀</span> المنصة متاحة ومفعلة على الهواء
        </div>
      </header>

      <div style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 40px; align-items: center; margin: 20px 0;">
        <!-- Left: Huge Direct Access Box & Action Steps -->
        <div style="display: flex; flex-direction: column; gap: 22px;">
          <div class="glass-card" style="padding: 26px 30px; display: flex; align-items: center; justify-content: space-between; border-color: rgba(218, 178, 60, 0.6);">
            <div>
              <span style="font-size: 15px; font-weight: 700; color: var(--muted); display: block; margin-bottom: 4px;">الرابط الرسمي المباشر للمنصة:</span>
              <div style="font-family: monospace; font-size: 26px; font-weight: 900; color: var(--gold-bright);">
                https://elkaroozschool1.vercel.app/
              </div>
            </div>
            <a href="https://elkaroozschool1.vercel.app/" target="_blank" class="ctrl-btn primary" style="text-decoration: none; padding: 14px 30px; font-size: 18px; border-radius: 25px;">
              زيارة المنصة ↗
            </a>
          </div>

          <div class="glass-card" style="padding: 30px;">
            <h3 style="font-size: 25px; font-weight: 900; color: var(--gold-bright); margin-bottom: 20px;">خطوات الاستفادة والتشغيل:</h3>
            
            <div style="display: flex; flex-direction: column; gap: 18px;">
              <div style="display: flex; align-items: center; gap: 16px; font-size: 19px; font-weight: 700;">
                <span style="color: var(--gold); font-size: 26px;">⭐</span>
                <span><strong>الدخول المباشر السحابي:</strong> متاح على مدار الساعة عبر المتصفح أو كتطبيق هاتف فوري.</span>
              </div>
              <div style="display: flex; align-items: center; gap: 16px; font-size: 19px; font-weight: 700;">
                <span style="color: var(--gold); font-size: 26px;">⭐</span>
                <span><strong>تصفح موسوعة الكتاب المقدس:</strong> متاح مجاناً للجميع لقراءة النصوص والتفاسير والخرائط.</span>
              </div>
              <div style="display: flex; align-items: center; gap: 16px; font-size: 19px; font-weight: 700;">
                <span style="color: var(--gold); font-size: 26px;">⭐</span>
                <span><strong>تسجيل الدخول للخدام والطلاب:</strong> متابعة الصفوف الدراسية، الحضور، وماراثون الآيات.</span>
              </div>
              <div style="display: flex; align-items: center; gap: 16px; font-size: 19px; font-weight: 700;">
                <span style="color: var(--gold); font-size: 26px;">⭐</span>
                <span><strong>بيئة كنسية آمنة:</strong> مصممة لتخدم رسالة التعليم والنمو الروحي بكنيسة مارمرقس الرسول.</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Grand Official Church Presentation Seal Card (Replacing QR Code) -->
        <div class="glass-card" style="padding: 40px 32px; text-align: center; border-color: rgba(218, 178, 60, 0.6); display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div style="width: 110px; height: 110px; border-radius: 50%; border: 3px solid var(--gold); box-shadow: 0 0 35px var(--gold-glow); overflow: hidden; margin-bottom: 22px;">
            <img src="assets/c_sanctuary.png" alt="مذبح الكنيسة" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
          
          <div class="church-seal" style="margin-bottom: 18px;">
            <span style="font-size: 22px;">⛪</span>
            <span style="font-size: 18px; font-weight: 900; color: var(--gold-bright);">كنيسة مارمرقس الرسول بالمنشية</span>
          </div>

          <h3 style="font-size: 28px; font-weight: 900; line-height: 1.35; color: var(--white); margin-bottom: 14px;">
            مدرسة الكاروز للكتاب المقدس <br>
            <span class="text-liquid-gold">منظومة رائدة في خدمة الكلمة</span>
          </h3>

          <p style="font-size: 18px; color: var(--muted); line-height: 1.7; font-weight: 600; margin-bottom: 24px;">
            تحول رقمي شامل يربط مئات الدارسين والخدام بالكتاب المقدس وتراث الكنيسة الأرثوذكسية عبر أحدث التقنيات السحابية.
          </p>

          <div style="display: flex; gap: 14px; width: 100%;">
            <a href="https://elkaroozschool1.vercel.app/" target="_blank" class="ctrl-btn primary" style="flex: 1; text-decoration: none; justify-content: center; padding: 14px 20px; font-size: 17px; border-radius: 18px;">
              دخول المنظومة الآن 🚀
            </a>
          </div>
        </div>
      </div>

      <footer class="slide-footer">
        <div>جميع الحقوق محفوظة © مدرسة الكاروز للكتاب المقدس — كنيسة مارمرقس الرسول</div>
        <div>الشريحة 9 من 9</div>
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
      <div class="dot-step" onclick="goToSlide(9, event)"></div>
    </div>

    <div class="slide-counter" id="slideCounter">1 / 9</div>

    <button class="ctrl-btn primary" onclick="nextSlide(event)">
      <span>التالي</span> <span>⟶</span>
    </button>

    <div style="width: 1px; height: 22px; background: rgba(218, 178, 60, 0.35); margin: 0 4px;"></div>

    <button class="ctrl-btn" onclick="toggleFullScreen(event)" title="ملء الشاشة (F)">
      <span>⛶</span>
    </button>
  </div>

  <!-- ========================================================================
       GSAP 3 HYPER-ANIMATION & INTERACTIVITY SCRIPTS
       ======================================================================== -->
  <script>
    let currentSlide = 1;
    const totalSlides = 9;
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
        this.speedY = (Math.random() - 0.5) * 0.4 - 0.1;
        this.alpha = Math.random() * 0.6 + 0.2;
        this.pulse = Math.random() * 0.02 + 0.01;
        this.color = Math.random() > 0.4 ? '218, 178, 60' : '0, 196, 236';
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;

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
            counter.textContent = Math.round(obj.val).toLocaleString('ar-EG');
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

      // Outgoing Slide
      tl.to(fromSlide, {
        opacity: 0,
        scale: 0.92,
        x: isForward ? -90 : 90,
        rotationY: isForward ? -8 : 8,
        filter: "blur(10px)",
        duration: 0.4,
        ease: "power2.inOut"
      });

      // Incoming Slide
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
          y: 20,
          scale: 0.97,
          duration: 0.35,
          stagger: 0.035,
          ease: "power2.out"
        }, "-=0.25");
      }

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
      if (e.target.closest('#deckControls') || e.target.closest('a') || e.target.closest('button') || e.target.closest('.sys-module-item') || e.target.closest('.enc-sec-card') || e.target.closest('.enc-wing-card') || e.target.closest('.tab-pill')) {
        return;
      }

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

      for (let i = 0; i < 12; i++) {
        const spark = document.createElement('div');
        spark.className = 'sparkle-particle';
        spark.style.left = `${e.clientX}px`;
        spark.style.top = `${e.clientY}px`;
        document.body.appendChild(spark);

        const angle = (Math.PI * 2 * i) / 12;
        const distance = Math.random() * 50 + 40;

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

    // 7. TOUCH SWIPE NAVIGATION
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
          url.textContent = 'منظومة مدرسة الكاروز ⟵ رصد الحضور الذكي والافتقاد';
        } else if (type === 'marathon') {
          img.src = 'assets/real_screen_marathon.png';
          url.textContent = 'منظومة مدرسة الكاروز ⟵ ماراثون حفظ الآيات والتنافس';
        } else if (type === 'groups') {
          img.src = 'assets/real_bible_hub.png';
          url.textContent = 'منظومة مدرسة الكاروز ⟵ إدارة الفرق والصفوف الدراسية';
        } else if (type === 'security') {
          img.src = 'assets/real_login_screen.png';
          url.textContent = 'منظومة مدرسة الكاروز ⟵ الصلاحيات الهرمية والأمان';
        }
        gsap.to(img, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(1.5)" });
      }});
    }

        const encSectionsData = {
      'sec1': {
        title: 'الكتاب المقدس',
        url: 'منظومة مدرسة الكاروز ⟵ فهرس أسفار الكتاب المقدس (73 سفراً بالتشكيل الكامل)',
        img: 'assets/real_bible_hub.png',
        desc: 'الـ 73 سفراً القانونية كاملة بالتشكيل الدقيق، مع فهارس ذكية، تقسيم أصحاحات وشواهد، ودعم كامل للأسفار القانونية الثانية.',
        tag: 'نص قانوني موثق 100%',
        color: 'var(--gold-bright)',
        bg: 'rgba(218,178,60,0.22)'
      },
      'sec2': {
        title: 'تفسير الكتاب المقدس',
        url: 'منظومة مدرسة الكاروز ⟵ تفاسير وشروحات الآباء وكبار الشراح المعتمدين',
        img: 'assets/c_comm.png',
        desc: 'موسوعة التفسير الآبائي الشامل (القمص تادرس يعقوب ملطي، القمص أنطونيوس فكري، كتابات قداسة البابا شنوده الثالث، والآباء الأولين).',
        tag: 'تفسير آبائي أرثوذكسي',
        color: 'var(--cyan)',
        bg: 'rgba(0,196,236,0.22)'
      },
      'sec3': {
        title: 'ترجمات الكتاب المقدس',
        url: 'منظومة مدرسة الكاروز ⟵ مقارنة الترجمات القديمة والحديثة المعتمدة',
        img: 'assets/c_reader.png',
        desc: 'عرض ومقارنة الترجمات العربية المتعددة (البيروتية، اليسوعية، المشتركة)، مع مقابلة النص القبطي والسبعيني والترجمات العالمية.',
        tag: 'مقارنة نصوص معتمدة',
        color: 'var(--emerald)',
        bg: 'rgba(16,196,138,0.22)'
      },
      'sec4': {
        title: 'مخطوطات الكتاب المقدس',
        url: 'منظومة مدرسة الكاروز ⟵ خزانة المخطوطات الأثرية ودراسات النقد النصي',
        img: 'assets/c_manuscript.png',
        desc: 'توثيق علمي للمخطوطات التاريخية (السينائية، الفاتيكانية، الإسكندرية، ولفائف قمران) وبراهين حفظ وسلامة الكلمة المقدسة عبر التاريخ.',
        tag: 'توثيق تاريخي وأثري',
        color: '#c084fc',
        bg: 'rgba(192,132,252,0.22)'
      },
      'sec5': {
        title: 'شبهات الكتاب المقدس',
        url: 'منظومة مدرسة الكاروز ⟵ قسم الدفاعيات وتفنيد الشبهات والردود العلمية',
        img: 'assets/c_sanctuary.png',
        desc: 'بنك دفاعي كنسي متكامل يقدم إجابات رصينة موثقة لاهوتياً وتاريخياً ولغوياً لتفنيد الشبهات المعاصرة وتثبيت إيمان الدارسين.',
        tag: 'دفاعيات ولاهوت موثق',
        color: '#ff6b81',
        bg: 'rgba(255,107,129,0.22)'
      },
      'sec6': {
        title: 'اطلس الكتاب المقدس',
        url: 'منظومة مدرسة الكاروز ⟵ الأطلس الجغرافي والخرائط التفاعلية للأراضي المقدسة',
        img: 'assets/c_atlas.png',
        desc: 'خرائط جغرافية وطبوغرافية دقيقة توضح مسارات الآباء والأنبياء، رحلات بولس الرسول التبشيرية، خروج بني إسرائيل، ومواقع الأحداث.',
        tag: 'خرائط جغرافية تفاعلية',
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.22)'
      },
      'sec7': {
        title: 'موسوعة الشخصيات الكتابية',
        url: 'منظومة مدرسة الكاروز ⟵ دليل وسير أعلام وشخصيات العهدين القديم والجديد',
        img: 'assets/real_bible_search.png',
        desc: 'فهرس تراجم شامل لأكثر من 3,000 شخصية كتابية، مع تحليل الدروس الروحية والسلوكية وشجرات الأنساب والعائلات المرتبطة.',
        tag: 'سير وتراجم كتابية',
        color: '#2dd4bf',
        bg: 'rgba(45,212,191,0.22)'
      },
      'sec8': {
        title: 'موسوعة الاماكن و الشعوب',
        url: 'منظومة مدرسة الكاروز ⟵ موسوعة المدن والقرى والشعوب القديمة',
        img: 'assets/c_jerusalem.png',
        desc: 'توثيق جغرافي وتاريخي للأمم والشعوب (مصر، كنعان، بابل، آشور، روما)، ومطابقة أسماء المدن والقرى القديمة بمواقعها المعاصرة.',
        tag: 'جغرافيا وتاريخ كتابي',
        color: '#38bdf8',
        bg: 'rgba(56,189,248,0.22)'
      },
      'sec9': {
        title: 'المارثون',
        url: 'منظومة مدرسة الكاروز ⟵ ماراثون حفظ الآيات والتنافس الروحي الأسبوعي',
        img: 'assets/real_screen_marathon.png',
        desc: 'منظومة التنافس الذكية لحفظ الآيات والشواهد، بنك الأسئلة التفاعلي، رصد درجات الطلاب آلياً، ولوحة شرف أسبوعية للمتفوقين.',
        tag: 'حفظ وتنافس واختبارات',
        color: '#fbbf24',
        bg: 'rgba(251,191,36,0.22)'
      },
      'sec10': {
        title: 'قواميس الكتاب المقدس',
        url: 'منظومة مدرسة الكاروز ⟵ القاموس الكتابي والمعاجم اللاهوتية واللغوية',
        img: 'assets/screen_bible.png',
        desc: 'أضخم قاموس كتابي رقمي يضم آلاف المواد لتوضيح معاني الكلمات والرموز والاصطلاحات اللاهوتية والعبرية واليونانية بأدق تفصيل.',
        tag: 'معجم ومصطلحات كنسية',
        color: '#818cf8',
        bg: 'rgba(129,140,248,0.22)'
      }
    };

    function switchEncSection(secKey, el, e) {
      if (e) e.stopPropagation();
      document.querySelectorAll('.enc-sec-card').forEach(item => item.classList.remove('active'));
      el.classList.add('active');

      const data = encSectionsData[secKey];
      if (!data) return;

      const img = document.getElementById('encFrameImg');
      const url = document.getElementById('encFrameUrl');
      const title = document.getElementById('encDetailTitle');
      const desc = document.getElementById('encDetailDesc');
      const tag = document.getElementById('encDetailTag');
      const box = document.getElementById('encDetailBox');

      gsap.to(img, { opacity: 0, rotationY: 15, duration: 0.18, onComplete: () => {
        img.src = data.img;
        url.textContent = data.url;
        gsap.to(img, { opacity: 1, rotationY: 0, duration: 0.3, ease: "power2.out" });
      }});

      if (box && title && desc && tag) {
        gsap.to(box, { opacity: 0.4, scale: 0.98, duration: 0.15, onComplete: () => {
          title.textContent = data.title;
          title.style.color = data.color;
          desc.textContent = data.desc;
          tag.textContent = data.tag;
          tag.style.color = data.color;
          tag.style.background = data.bg;
          box.style.borderColor = data.color;
          gsap.to(box, { opacity: 1, scale: 1, duration: 0.25, ease: "power2.out" });
        }});
      }
    }

    // Keep alias for compatibility
    function switchEncWing(wing, el) {
      const mapping = { 'bible': 'sec1', 'commentaries': 'sec2', 'refs': 'sec6', 'theology': 'sec5' };
      switchEncSection(mapping[wing] || 'sec1', el);
    }

    window.addEventListener('load', () => {
      animateCounters(document.getElementById('slide-1'));
    });
  </script>
</body>
</html>"""

with open(dest_html_file, 'w', encoding='utf-8') as f:
    f.write(html_content)

with open(dest_presentation_copy, 'w', encoding='utf-8') as f:
    f.write(html_content)

print("Super-large Arabic presentation with QR removed generated successfully!")
