import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

# The Complete Upgraded Build Script for the Simplified, Full-Circle Presentation
dest_html_file = 'presentation/index.html'
dest_presentation_copy = 'presentation/presentation.html'

html_content = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>مدرسة الكاروز للكتاب المقدس — العرض التقديمي التنفيذي الشامل</title>
  
  <!-- High-end Arabic Corporate & Coptic Fonts: Cairo & Amiri -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,700&family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  
  <!-- GSAP 3 Animation Engine -->
  <script src="assets/gsap.min.js"></script>

  <style>
    /* ==========================================================================
       DESIGN SYSTEM & LUXURY GOLD / COPTIC ROYAL NAVY PALETTE
       ========================================================================== */
    :root {
      --navy-deep: #050b18;
      --navy-dark: #081228;
      --navy-card: #0d1b3e;
      --gold: #dab23c;
      --gold-bright: #ffda66;
      --gold-glow: rgba(218, 178, 60, 0.45);
      --cyan: #00c4ec;
      --emerald: #10c48a;
      --emerald-bright: #2dd4bf;
      --white: #f8fafc;
      --muted: #94a3b8;
      --card-border: rgba(218, 178, 60, 0.35);
      --font-main: 'Cairo', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --font-serif: 'Amiri', serif;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      user-select: none;
      -webkit-user-select: none;
    }

    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: var(--navy-deep);
      font-family: var(--font-main);
      color: var(--white);
      direction: rtl;
    }

    /* Ambient Particle Canvas */
    #particleCanvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 1;
    }

    /* Ambient Gradient Orbs */
    .ambient-bg {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
    }
    .orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.28;
      animation: floatOrb 22s infinite alternate ease-in-out;
    }
    .orb-1 { width: 550px; height: 550px; background: #dab23c; top: -100px; right: -80px; }
    .orb-2 { width: 650px; height: 650px; background: #00c4ec; bottom: -120px; left: -100px; animation-duration: 28s; }
    .orb-3 { width: 450px; height: 450px; background: #7928ca; top: 40%; left: 35%; opacity: 0.16; animation-duration: 34s; }

    @keyframes floatOrb {
      0% { transform: translate(0, 0) scale(1); }
      100% { transform: translate(45px, 60px) scale(1.12); }
    }

    /* ==========================================================================
       PRESENTATION DECK CONTAINER & SLIDES
       ========================================================================== */
    .deck-container {
      position: relative;
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
      cursor: pointer;
      perspective: 1400px;
    }

    .slide {
      position: absolute;
      width: 100%;
      max-width: 1620px;
      height: 920px;
      max-height: 100vh;
      padding: 24px 48px;
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

    /* ==========================================================================
       SLIDE HEADER & BRANDING
       ========================================================================== */
    .slide-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      padding-bottom: 12px;
      border-bottom: 2px solid var(--card-border);
    }
    .slide-header::after {
      content: '';
      position: absolute;
      bottom: -2px;
      right: 0;
      width: 40%;
      height: 3px;
      background: linear-gradient(90deg, var(--gold), var(--cyan), transparent);
      border-radius: 3px;
      box-shadow: 0 0 14px var(--gold-glow);
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .church-logo {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      border: 2.5px solid var(--gold);
      box-shadow: 0 0 20px var(--gold-glow);
      background-color: #0b1531;
      object-fit: cover;
      animation: pulseLogo 4s ease-in-out infinite;
    }
    @keyframes pulseLogo {
      0%, 100% { box-shadow: 0 0 15px var(--gold-glow); transform: scale(1); }
      50% { box-shadow: 0 0 28px rgba(218, 178, 60, 0.7); transform: scale(1.04); }
    }

    .slide-title {
      font-size: 36px;
      font-weight: 900;
      letter-spacing: -0.5px;
    }

    .slide-badge {
      font-size: 16.5px;
      font-weight: 800;
      padding: 7px 20px;
      border-radius: 35px;
      background: rgba(14, 30, 68, 0.85);
      border: 1.5px solid var(--card-border);
      color: var(--gold-bright);
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
    }

    /* ==========================================================================
       ECCLESIASTICAL LEADERSHIP & BLESSING BAR (POPE TAWADROS & ANBA MORCOS)
       ========================================================================== */
    .church-blessing-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      padding: 12px 24px;
      margin-bottom: 10px;
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

    .floating-leader-right {
      animation: gentleLeaderFloatRight 5s ease-in-out infinite;
    }
    .floating-leader-left {
      animation: gentleLeaderFloatLeft 5.5s ease-in-out 0.9s infinite;
    }

    @keyframes gentleLeaderFloatRight {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-6px) rotate(0.4deg); }
    }

    @keyframes gentleLeaderFloatLeft {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-6px) rotate(-0.4deg); }
    }

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

    /* ==========================================================================
       LUXURY GLASS CARDS & MICRO-INTERACTIONS
       ========================================================================== */
    .glass-card {
      background: linear-gradient(135deg, rgba(13, 27, 62, 0.85) 0%, rgba(6, 14, 34, 0.92) 100%);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      border: 1.5px solid var(--card-border);
      border-radius: 20px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.12);
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
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.14), transparent);
      transform: skewX(-20deg);
      transition: left 0.75s ease;
      pointer-events: none;
    }
    .glass-card:hover::before {
      left: 150%;
    }

    .glass-card:hover {
      border-color: var(--gold);
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.75), 0 0 24px var(--gold-glow);
    }

    /* Gradient Typography */
    .text-title-gradient {
      background: linear-gradient(135deg, #ffffff 0%, var(--gold-bright) 60%, var(--gold) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .text-liquid-gold {
      background: linear-gradient(135deg, #fff2c6 0%, #dab23c 50%, #f39c12 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    /* Screen Mockup Frame */
    .screen-mockup-frame {
      border-radius: 18px;
      border: 2px solid var(--card-border);
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(0, 196, 236, 0.22);
      background: #060e22;
      overflow: hidden;
      position: relative;
    }
    .screen-mockup-header {
      background: #091533;
      padding: 10px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1.5px solid rgba(218, 178, 60, 0.3);
    }
    .browser-dots {
      display: flex;
      gap: 6px;
    }
    .browser-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .browser-dot.red { background: #ff5f56; }
    .browser-dot.yellow { background: #ffbd2e; }
    .browser-dot.green { background: #27c93f; }
    .browser-address {
      font-size: 13px;
      color: var(--muted);
      direction: rtl;
      font-family: var(--font-main);
      font-weight: 700;
      white-space: normal; text-align: right;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Mobile Phone Mockup */
    .phone-mockup-frame {
      border-radius: 36px;
      border: 3.5px solid #334155;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.85), 0 0 30px var(--gold-glow);
      background: #020617;
      overflow: hidden;
      position: relative;
    }
    .phone-dynamic-island {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      width: 75px;
      height: 18px;
      background: #000;
      border-radius: 14px;
      z-index: 10;
    }

    /* Floating Micro-Animations */
    .floating-anim {
      animation: floatSmooth 6s ease-in-out infinite;
    }
    .floating-anim-delay {
      animation: floatSmooth 6.5s ease-in-out 1.2s infinite;
    }
    @keyframes floatSmooth {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
    }

    /* ==========================================================================
       FULL-SCREEN 10-SECTION ORBITAL DIAL (SLIDE 5)
       ========================================================================== */
    .enc-full-stage {
      position: relative;
      width: 100%;
      max-width: 1540px;
      height: 640px;
      margin: 10px auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Ambient Orbital Rings */
    .enc-full-orbit-outer {
      position: absolute;
      width: 1220px;
      height: 540px;
      border-radius: 50%;
      border: 1.5px dashed rgba(218, 178, 60, 0.35);
      pointer-events: none;
      animation: rotateRing 80s linear infinite;
    }
    .enc-full-orbit-inner {
      position: absolute;
      width: 860px;
      height: 420px;
      border-radius: 50%;
      border: 1px solid rgba(0, 196, 236, 0.22);
      pointer-events: none;
      animation: rotateRingRev 60s linear infinite;
    }
    @keyframes rotateRingRev {
      0% { transform: rotate(360deg); }
      100% { transform: rotate(0deg); }
    }

    /* Grand Center Hub */
    .enc-grand-hub {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 470px;
      min-height: 330px;
      padding: 24px 30px;
      border-radius: 28px;
      background: linear-gradient(135deg, rgba(14, 28, 62, 0.94) 0%, rgba(7, 15, 36, 0.98) 100%);
      border: 2px solid var(--gold);
      box-shadow: 0 0 50px rgba(0, 0, 0, 0.8), 0 0 35px rgba(218, 178, 60, 0.3), inset 0 0 30px rgba(218, 178, 60, 0.1);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      z-index: 10;
      transition: border-color 0.35s ease, box-shadow 0.35s ease;
    }

    .enc-hub-emblem {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .enc-hub-emblem img {
      width: 48px;
      height: 48px;
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
      margin-bottom: 12px;
    }
    .enc-hub-desc {
      font-size: 16px;
      color: #e2e8f0;
      line-height: 1.6;
      font-weight: 600;
      margin: 0 0 14px 0;
    }
    .enc-hub-footer {
      font-size: 13.5px;
      color: var(--cyan);
      font-weight: 800;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      padding-top: 10px;
      width: 100%;
    }

    /* Orbital Nodes (10 Sections) */
    .enc-grand-node {
      position: absolute;
      width: 242px;
      height: 64px;
      padding: 8px 14px;
      border-radius: 18px;
      background: linear-gradient(135deg, rgba(16, 32, 70, 0.9) 0%, rgba(9, 18, 42, 0.95) 100%);
      border: 1.5px solid var(--card-border);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      user-select: none;
      z-index: 5;
      transform: translate(-50%, -50%);
      transition: border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
    }
    .enc-grand-node:hover {
      border-color: var(--gold-bright);
      box-shadow: 0 0 25px var(--gold-glow), 0 10px 30px rgba(0, 0, 0, 0.7);
      background: linear-gradient(135deg, rgba(22, 42, 90, 0.95) 0%, rgba(12, 24, 54, 0.98) 100%);
    }
    .enc-grand-node.active {
      border-color: var(--gold-bright) !important;
      box-shadow: 0 0 32px var(--gold-bright), 0 12px 35px rgba(0, 0, 0, 0.8) !important;
      background: linear-gradient(135deg, rgba(26, 48, 104, 0.98) 0%, rgba(14, 28, 64, 1) 100%) !important;
    }
    .enc-grand-node-num {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 900;
      flex-shrink: 0;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .enc-grand-node-info {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .enc-grand-node-title {
      font-size: 13.5px;
      font-weight: 900;
      line-height: 1.25;
      white-space: normal; text-align: right;
    }
    .enc-grand-node-icon {
      font-size: 15px;
    }

    /* ==========================================================================
       BOTTOM DECK CONTROLS & PROGRESS BAR
       ========================================================================== */
    #deckControls {
      position: fixed;
      bottom: 22px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 16px;
      background: rgba(8, 16, 38, 0.88);
      border: 1.5px solid var(--card-border);
      padding: 10px 22px;
      border-radius: 40px;
      box-shadow: 0 14px 35px rgba(0, 0, 0, 0.65), 0 0 20px rgba(218, 178, 60, 0.15);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      z-index: 999;
    }

    .ctrl-btn {
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid var(--card-border);
      color: var(--white);
      padding: 8px 18px;
      border-radius: 25px;
      font-family: var(--font-main);
      font-size: 15px;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
    }
    .ctrl-btn:hover {
      background: rgba(218, 178, 60, 0.22);
      border-color: var(--gold);
      box-shadow: 0 0 14px var(--gold-glow);
    }
    .ctrl-btn.primary {
      background: linear-gradient(135deg, var(--gold), #b89127);
      color: #050b18;
      border: none;
      box-shadow: 0 0 16px var(--gold-glow);
    }
    .ctrl-btn.primary:hover {
      background: linear-gradient(135deg, var(--gold-bright), var(--gold));
      box-shadow: 0 0 24px var(--gold-bright);
    }

    .slide-counter {
      font-size: 15px;
      font-weight: 900;
      color: var(--gold-bright);
      min-width: 50px;
      text-align: center;
    }

    .dots-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .dot-step {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.25);
      cursor: pointer;
      transition: width 0.3s, background 0.3s, box-shadow 0.3s;
    }
    .dot-step.active {
      width: 26px;
      border-radius: 8px;
      background: var(--gold-bright);
      box-shadow: 0 0 12px var(--gold-glow);
    }

    /* Top Progress Bar */
    .progress-bar-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 4px;
      background: rgba(255, 255, 255, 0.08);
      z-index: 1000;
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
      padding-top: 10px;
      border-top: 1px solid rgba(218, 178, 60, 0.25);
      font-size: 15px;
      color: var(--muted);
      font-weight: 700;
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
  </style>
</head>
<body>

  <!-- Background Particle Dust Canvas -->
  <canvas id="particleCanvas"></canvas>

  <!-- Ambient Light Orbs -->
  <div class="ambient-bg">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
  </div>

  <!-- Top Progress Bar -->
  <div class="progress-bar-container">
    <div class="progress-bar" id="progressBar"></div>
  </div>

  <!-- Presentation Deck Stage -->
  <main class="deck-container" id="deckStage">

    <!-- ========================================================================
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

      <div style="display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 36px; align-items: center; margin: 6px 0;">
        <!-- Right Column: Grand Title & Vision -->
        <div>
          <div style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 18px; border-radius: 20px; background: rgba(218, 178, 60, 0.16); border: 1.5px solid var(--gold); color: var(--gold-bright); font-size: 15.5px; font-weight: 800; margin-bottom: 12px;">
            <span>✨</span> المنظومة الرقمية الذكية — الإصدار التنفيذي المعتمد
          </div>

          <h2 style="font-size: 38px; font-weight: 900; line-height: 1.25; margin-bottom: 14px;" class="text-liquid-gold">
            منظومة التعليم الأكاديمي والإدارة الكنسية
          </h2>

          <p style="font-size: 19px; line-height: 1.6; color: var(--muted); font-weight: 600; margin-bottom: 20px;">
            منصة كنسية موحدة تخدم الدارسين والخدام: رصد الحضور الذكي، الامتحانات الإلكترونية، ماراثون الآيات، وأكبر موسوعة رقمية لأسفار وتفاسير الكتاب المقدس.
          </p>

          <!-- 3 Stats Counter Cards -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;">
            <div class="glass-card" style="padding: 12px 16px; text-align: center; border-bottom: 4px solid var(--gold);">
              <div style="font-size: 32px; font-weight: 900; color: var(--gold-bright);" class="stat-number" data-target="3">0</div>
              <div style="font-size: 13.5px; font-weight: 800; color: var(--white); margin-top: 2px;">فرق دراسية كاملة</div>
              <div style="font-size: 12px; color: var(--muted); margin-top: 1px;">صفوف أكاديمية 1، 2، 3</div>
            </div>

            <div class="glass-card" style="padding: 12px 16px; text-align: center; border-bottom: 4px solid var(--cyan);">
              <div style="font-size: 32px; font-weight: 900; color: var(--cyan);" class="stat-number" data-target="73">0</div>
              <div style="font-size: 13.5px; font-weight: 800; color: var(--white); margin-top: 2px;">سفراً قانونياً موثقاً</div>
              <div style="font-size: 12px; color: var(--muted); margin-top: 1px;">تفاسير الآباء المعتمدة</div>
            </div>

            <div class="glass-card" style="padding: 12px 16px; text-align: center; border-bottom: 4px solid var(--emerald);">
              <div style="font-size: 32px; font-weight: 900; color: var(--emerald-bright);">١٠٠%</div>
              <div style="font-size: 13.5px; font-weight: 800; color: var(--white); margin-top: 2px;">سحابي وفوري</div>
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

    <!-- ========================================================================
         الشريحة 2: التحديات والمشكلات الواقعية قبل المنظومة
         ======================================================================== -->
    <section class="slide" id="slide-2">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="شعار مدرسة الكاروز" class="church-logo">
          <h2 class="slide-title">لماذا احتاجت مدرسة الكاروز إلى المنظومة الرقمية؟</h2>
        </div>
        <div class="slide-badge" style="color: #ff6b81; border-color: rgba(255, 107, 129, 0.45);">
          <span>⚠️</span> مشكلات وتحديات واقعية تم حلها
        </div>
      </header>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin: 20px 0; align-items: stretch;">
        <!-- Card 1 -->
        <div class="glass-card" style="padding: 32px 26px; border-top: 5px solid #ff6b81; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-size: 42px; margin-bottom: 14px;">📋</div>
            <h3 style="font-size: 24px; font-weight: 900; color: #ff6b81; margin-bottom: 12px; line-height: 1.3;">
              تلف وضياع الكشوفات الورقية
            </h3>
            <p style="font-size: 18px; color: #cbd5e1; line-height: 1.6; font-weight: 600;">
              صعوبة حفظ ومتابعة درجات وسجلات مئات الطلاب عبر السنين بالدفاتر اليدوية، وتلف الأوراق والملفات عند تعاقب الخدام.
            </p>
          </div>
          <div style="margin-top: 20px; padding: 10px 14px; border-radius: 12px; background: rgba(255, 107, 129, 0.12); color: #ff6b81; font-weight: 800; font-size: 15px;">
            الحل: قاعدة بيانات سحابية موحدة دائمة
          </div>
        </div>

        <!-- Card 2 -->
        <div class="glass-card" style="padding: 32px 26px; border-top: 5px solid #f59e0b; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-size: 42px; margin-bottom: 14px;">⏳</div>
            <h3 style="font-size: 24px; font-weight: 900; color: #f59e0b; margin-bottom: 12px; line-height: 1.3;">
              استنزاف الوقت في رصد الحضور
            </h3>
            <p style="font-size: 18px; color: #cbd5e1; line-height: 1.6; font-weight: 600;">
              إهدار وقت المحاضرات في النداء والتسجيل الورقي، مع غياب الإحصاء الفوري للغياب وصعوبة متابعة المنقطعين لافتقادهم.
            </p>
          </div>
          <div style="margin-top: 20px; padding: 10px 14px; border-radius: 12px; background: rgba(245, 158, 11, 0.12); color: #f59e0b; font-weight: 800; font-size: 15px;">
            الحل: تسجيل ذكي فوري بالباركود في ثوانٍ
          </div>
        </div>

        <!-- Card 3 -->
        <div class="glass-card" style="padding: 32px 26px; border-top: 5px solid var(--cyan); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-size: 42px; margin-bottom: 14px;">📁</div>
            <h3 style="font-size: 24px; font-weight: 900; color: var(--cyan); margin-bottom: 12px; line-height: 1.3;">
              تشتت المناهج في المجموعات
            </h3>
            <p style="font-size: 18px; color: #cbd5e1; line-height: 1.6; font-weight: 600;">
              صعوبة المذاكرة والرجوع للمحاضرات الصوتية والمذكرات بسبب تفرقها في رسائل وسائل التواصل الاجتماعي دون فهرس منظم.
            </p>
          </div>
          <div style="margin-top: 20px; padding: 10px 14px; border-radius: 12px; background: rgba(0, 196, 236, 0.12); color: var(--cyan); font-weight: 800; font-size: 15px;">
            الحل: مكتبة رقمية منظمة ومتاحة دائماً
          </div>
        </div>
      </div>

      <footer class="slide-footer">
        <div>التحول الرقمي حل جذري لحفظ السجلات وتوفير وقت الخدام للتركيز على خدمة الكلمة</div>
        <div>الشريحة 2 من 9</div>
      </footer>
    </section>

    <!-- ========================================================================
         الشريحة 3: أهداف ورسالة المنظومة الرقمية للمستقبل
         ======================================================================== -->
    <section class="slide" id="slide-3">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="شعار مدرسة الكاروز" class="church-logo">
          <h2 class="slide-title">أهداف ورسالة المنظومة الرقمية</h2>
        </div>
        <div class="slide-badge" style="color: var(--gold-bright); border-color: rgba(218, 178, 60, 0.45);">
          <span>🎯</span> رؤية أكاديمية ورعوية متكاملة
        </div>
      </header>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 26px; margin: 20px 0; align-items: stretch;">
        <!-- Goal 1 -->
        <div class="glass-card" style="padding: 34px 28px; border-top: 5px solid var(--gold);">
          <div style="font-size: 44px; margin-bottom: 16px;">🏛️</div>
          <h3 style="font-size: 25px; font-weight: 900; color: var(--gold-bright); margin-bottom: 14px; line-height: 1.3;">
            سجل رقمي دائم وموحد
          </h3>
          <p style="font-size: 18px; color: #cbd5e1; line-height: 1.65; font-weight: 600;">
            ملف إلكتروني موحد لكل طالب وخادم يحفظ بياناته، درجاته، ونسب حضوره طوال سنوات دراسته دون فقدان أي سجل.
          </p>
        </div>

        <!-- Goal 2 -->
        <div class="glass-card" style="padding: 34px 28px; border-top: 5px solid var(--cyan);">
          <div style="font-size: 44px; margin-bottom: 16px;">📖</div>
          <h3 style="font-size: 25px; font-weight: 900; color: var(--cyan); margin-bottom: 14px; line-height: 1.3;">
            تعليم كنسي متاح دائماً
          </h3>
          <p style="font-size: 18px; color: #cbd5e1; line-height: 1.65; font-weight: 600;">
            توفير المناهج المعتمدة، شروحات الآباء، والمحاضرات الصوتية في مكان واحد يسهل على الدارس الوصول إليه من أي مكان.
          </p>
        </div>

        <!-- Goal 3 -->
        <div class="glass-card" style="padding: 34px 28px; border-top: 5px solid var(--emerald);">
          <div style="font-size: 44px; margin-bottom: 16px;">🤝</div>
          <h3 style="font-size: 25px; font-weight: 900; color: var(--emerald-bright); margin-bottom: 14px; line-height: 1.3;">
            متابعة وافتقاد فوري
          </h3>
          <p style="font-size: 18px; color: #cbd5e1; line-height: 1.65; font-weight: 600;">
            تقارير فورية وسريعة توضح للخدام مستويات الطلاب وتساعدهم على الافتقاد الدوري للمنقطعين بضغطة زر واحدة.
          </p>
        </div>
      </div>

      <footer class="slide-footer">
        <div>منظومة رائدة تجمع بين التعليم اللاهوتي الرصين وأحدث التقنيات السحابية</div>
        <div>الشريحة 3 من 9</div>
      </footer>
    </section>

    <!-- ========================================================================
         الشريحة 4: الأنظمة والخدمات الفعلية بالمنصة
         ======================================================================== -->
    <section class="slide" id="slide-4">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="شعار مدرسة الكاروز" class="church-logo">
          <h2 class="slide-title">الأنظمة الذكية العاملة داخل المنصة</h2>
        </div>
        <div class="slide-badge" style="color: var(--cyan); border-color: rgba(0, 196, 236, 0.45);">
          <span>⚙️</span> أدوات عملية تعمل حياً الآن
        </div>
      </header>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 22px; margin: 16px 0;">
        <!-- System 1 -->
        <div class="glass-card" style="padding: 24px 28px; border-right: 5px solid var(--gold); display: flex; align-items: center; gap: 20px;">
          <div style="font-size: 44px; flex-shrink: 0;">📱</div>
          <div>
            <h3 style="font-size: 23px; font-weight: 900; color: var(--gold-bright); margin-bottom: 6px;">
              رصد الحضور الذكي بالباركود
            </h3>
            <p style="font-size: 17.5px; color: #cbd5e1; line-height: 1.55; font-weight: 600;">
              تسجيل حضور الطالب في ثوانٍ معدودة عبر مسح الرمز السريع، مع تحديد تلقائي للمنقطعين لتسهيل الافتقاد.
            </p>
          </div>
        </div>

        <!-- System 2 -->
        <div class="glass-card" style="padding: 24px 28px; border-right: 5px solid var(--cyan); display: flex; align-items: center; gap: 20px;">
          <div style="font-size: 44px; flex-shrink: 0;">🏆</div>
          <div>
            <h3 style="font-size: 23px; font-weight: 900; color: var(--cyan); margin-bottom: 6px;">
              ماراثون حفظ الآيات والتنافس
            </h3>
            <p style="font-size: 17.5px; color: #cbd5e1; line-height: 1.55; font-weight: 600;">
              مسابقة تفاعلية أسبوعية لاختبار حفظ الشواهد ورصد درجات الطلاب آلياً مع إعلان لوحة الشرف للمتميزين.
            </p>
          </div>
        </div>

        <!-- System 3 -->
        <div class="glass-card" style="padding: 24px 28px; border-right: 5px solid var(--emerald); display: flex; align-items: center; gap: 20px;">
          <div style="font-size: 44px; flex-shrink: 0;">📝</div>
          <div>
            <h3 style="font-size: 23px; font-weight: 900; color: var(--emerald-bright); margin-bottom: 6px;">
              نظام الاختبارات الرقمية
            </h3>
            <p style="font-size: 17.5px; color: #cbd5e1; line-height: 1.55; font-weight: 600;">
              امتحانات أونلاين بتصحيح فوري وبنك أسئلة شامل، مع رصد مباشر للنتائج داخل الملف الأكاديمي للطالب.
            </p>
          </div>
        </div>

        <!-- System 4 -->
        <div class="glass-card" style="padding: 24px 28px; border-right: 5px solid #c084fc; display: flex; align-items: center; gap: 20px;">
          <div style="font-size: 44px; flex-shrink: 0;">🎓</div>
          <div>
            <h3 style="font-size: 23px; font-weight: 900; color: #c084fc; margin-bottom: 6px;">
              تنظيم الصفوف الدراسية (1، 2، 3)
            </h3>
            <p style="font-size: 17.5px; color: #cbd5e1; line-height: 1.55; font-weight: 600;">
              فصل ومتابعة المقر والدارسين بحسب الفرق الدراسية الثلاث بدقة تامة وبصلاحيات مخصصة لكل خادم فرقة.
            </p>
          </div>
        </div>
      </div>

      <footer class="slide-footer">
        <div>أنظمة متكاملة تدعم الخادم وتوفر له كافة الأدوات لإدارة فرقته بنجاح</div>
        <div>الشريحة 4 من 9</div>
      </footer>
    </section>

    <!-- ========================================================================
         الشريحة 5: موسوعة العلوم الكنسية (الدائرة الكبرى الممتدة بالكامل)
         ======================================================================== -->
    <section class="slide" id="slide-5">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="شعار مدرسة الكاروز" class="church-logo">
          <h2 class="slide-title">أقسام موسوعة الكتاب المقدس التفاعلية</h2>
        </div>
        <div class="slide-badge" style="color: var(--gold-bright); border-color: rgba(218, 178, 60, 0.45);">
          <span>📚</span> 10 أقسام متخصصة في دائرة معرفية كاملة
        </div>
      </header>

      <!-- Full-Screen Grand 10-Section Radial Dial Stage -->
      <div class="enc-full-stage">
        <!-- Ambient Orbit Rings -->
        <div class="enc-full-orbit-outer"></div>
        <div class="enc-full-orbit-inner"></div>

        <!-- Grand Interactive Center Hub -->
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

        <!-- ==================== THE 10 ORBITAL NODES ==================== -->

        <!-- Node 1: الكتاب المقدس (-90° Top Center) -->
        <div class="enc-grand-node active" data-sec="sec1" onclick="switchEncSection('sec1', this, event)" style="left: 50%; top: calc(50% - 250px); border-top: 3.5px solid var(--gold-bright);">
          <div class="enc-grand-node-num" style="color: var(--gold-bright);">01</div>
          <div class="enc-grand-node-info">
            <span class="enc-grand-node-title" style="color: var(--gold-bright);">الكتاب المقدس</span>
          </div>
          <span class="enc-grand-node-icon">📖</span>
        </div>

        <!-- Node 2: تفسير الكتاب المقدس (-54° Top Right) -->
        <div class="enc-grand-node" data-sec="sec2" onclick="switchEncSection('sec2', this, event)" style="left: calc(50% + 360px); top: calc(50% - 200px); border-top: 3.5px solid var(--cyan);">
          <div class="enc-grand-node-num" style="color: var(--cyan);">02</div>
          <div class="enc-grand-node-info">
            <span class="enc-grand-node-title" style="color: var(--cyan);">تفسير الكتاب المقدس</span>
          </div>
          <span class="enc-grand-node-icon">📜</span>
        </div>

        <!-- Node 3: ترجمات الكتاب المقدس (-18° Middle Right Top) -->
        <div class="enc-grand-node" data-sec="sec3" onclick="switchEncSection('sec3', this, event)" style="left: calc(50% + 560px); top: calc(50% - 76px); border-right: 3.5px solid var(--emerald);">
          <div class="enc-grand-node-num" style="color: var(--emerald);">03</div>
          <div class="enc-grand-node-info">
            <span class="enc-grand-node-title" style="color: var(--emerald);">ترجمات الكتاب المقدس</span>
          </div>
          <span class="enc-grand-node-icon">🌐</span>
        </div>

        <!-- Node 4: مخطوطات الكتاب المقدس (+18° Middle Right Bottom) -->
        <div class="enc-grand-node" data-sec="sec4" onclick="switchEncSection('sec4', this, event)" style="left: calc(50% + 560px); top: calc(50% + 76px); border-right: 3.5px solid #c084fc;">
          <div class="enc-grand-node-num" style="color: #c084fc;">04</div>
          <div class="enc-grand-node-info">
            <span class="enc-grand-node-title" style="color: #c084fc);">مخطوطات الكتاب المقدس</span>
          </div>
          <span class="enc-grand-node-icon">🏛️</span>
        </div>

        <!-- Node 5: شبهات الكتاب المقدس (+54° Bottom Right) -->
        <div class="enc-grand-node" data-sec="sec5" onclick="switchEncSection('sec5', this, event)" style="left: calc(50% + 360px); top: calc(50% + 200px); border-bottom: 3.5px solid #ff6b81;">
          <div class="enc-grand-node-num" style="color: #ff6b81;">05</div>
          <div class="enc-grand-node-info">
            <span class="enc-grand-node-title" style="color: #ff6b81);">شبهات الكتاب المقدس</span>
          </div>
          <span class="enc-grand-node-icon">🛡️</span>
        </div>

        <!-- Node 6: اطلس الكتاب المقدس (+90° Bottom Center) -->
        <div class="enc-grand-node" data-sec="sec6" onclick="switchEncSection('sec6', this, event)" style="left: 50%; top: calc(50% + 250px); border-bottom: 3.5px solid #f59e0b;">
          <div class="enc-grand-node-num" style="color: #f59e0b;">06</div>
          <div class="enc-grand-node-info">
            <span class="enc-grand-node-title" style="color: #f59e0b);">اطلس الكتاب المقدس</span>
          </div>
          <span class="enc-grand-node-icon">🗺️</span>
        </div>

        <!-- Node 7: موسوعة الشخصيات الكتابية (+126° Bottom Left) -->
        <div class="enc-grand-node" data-sec="sec7" onclick="switchEncSection('sec7', this, event)" style="left: calc(50% - 360px); top: calc(50% + 200px); border-bottom: 3.5px solid #2dd4bf;">
          <div class="enc-grand-node-num" style="color: #2dd4bf;">07</div>
          <div class="enc-grand-node-info">
            <span class="enc-grand-node-title" style="color: #2dd4bf);">الشخصيات الكتابية</span>
          </div>
          <span class="enc-grand-node-icon">👥</span>
        </div>

        <!-- Node 8: موسوعة الاماكن و الشعوب (+162° Middle Left Bottom) -->
        <div class="enc-grand-node" data-sec="sec8" onclick="switchEncSection('sec8', this, event)" style="left: calc(50% - 560px); top: calc(50% + 76px); border-left: 3.5px solid #38bdf8;">
          <div class="enc-grand-node-num" style="color: #38bdf8;">08</div>
          <div class="enc-grand-node-info">
            <span class="enc-grand-node-title" style="color: #38bdf8);">الأماكن والشعوب</span>
          </div>
          <span class="enc-grand-node-icon">🏰</span>
        </div>

        <!-- Node 9: المارثون (+198° Middle Left Top) -->
        <div class="enc-grand-node" data-sec="sec9" onclick="switchEncSection('sec9', this, event)" style="left: calc(50% - 560px); top: calc(50% - 76px); border-left: 3.5px solid #fbbf24;">
          <div class="enc-grand-node-num" style="color: #fbbf24;">09</div>
          <div class="enc-grand-node-info">
            <span class="enc-grand-node-title" style="color: #fbbf24);">الماراثون الروحي</span>
          </div>
          <span class="enc-grand-node-icon">🏆</span>
        </div>

        <!-- Node 10: قواميس الكتاب المقدس (+234° Top Left) -->
        <div class="enc-grand-node" data-sec="sec10" onclick="switchEncSection('sec10', this, event)" style="left: calc(50% - 360px); top: calc(50% - 200px); border-top: 3.5px solid #818cf8;">
          <div class="enc-grand-node-num" style="color: #818cf8;">10</div>
          <div class="enc-grand-node-info">
            <span class="enc-grand-node-title" style="color: #818cf8);">قواميس الكتاب المقدس</span>
          </div>
          <span class="enc-grand-node-icon">📚</span>
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
          <h2 class="slide-title">وثوقية المصادر وسلامة التعليم الأرثوذكسي</h2>
        </div>
        <div class="slide-badge" style="color: var(--emerald-bright); border-color: rgba(16, 196, 138, 0.45);">
          <span>🛡️</span> مرجعية آبائية معتمدة 100%
        </div>
      </header>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 26px; margin: 20px 0; align-items: stretch;">
        <!-- Card 1 -->
        <div class="glass-card" style="padding: 34px 28px; border-top: 5px solid var(--gold);">
          <div style="font-size: 44px; margin-bottom: 16px;">⛪</div>
          <h3 style="font-size: 24px; font-weight: 900; color: var(--gold-bright); margin-bottom: 14px; line-height: 1.3;">
            المصدر الرقمي المعتمد
          </h3>
          <p style="font-size: 18px; color: #cbd5e1; line-height: 1.65; font-weight: 600;">
            الاعتماد المباشر على أرشيف موقع القديس تكلا هيمانوت المعتمد كنسياً للنصوص والتفاسير والعلوم اللاهوتية.
          </p>
        </div>

        <!-- Card 2 -->
        <div class="glass-card" style="padding: 34px 28px; border-top: 5px solid var(--cyan);">
          <div style="font-size: 44px; margin-bottom: 16px;">✍️</div>
          <h3 style="font-size: 24px; font-weight: 900; color: var(--cyan); margin-bottom: 14px; line-height: 1.3;">
            تفاسير كبار شراح الكنيسة
          </h3>
          <p style="font-size: 18px; color: #cbd5e1; line-height: 1.65; font-weight: 600;">
            شروحات القمص تادرس يعقوب، القمص أنطونيوس فكري، كتابات قداسة البابا شنوده الثالث، وتعاليم الآباء الأولين.
          </p>
        </div>

        <!-- Card 3 -->
        <div class="glass-card" style="padding: 34px 28px; border-top: 5px solid var(--emerald);">
          <div style="font-size: 44px; margin-bottom: 16px;">🔍</div>
          <h3 style="font-size: 24px; font-weight: 900; color: var(--emerald-bright); margin-bottom: 14px; line-height: 1.3;">
            تدقيق ومراجعة لاهوتية
          </h3>
          <p style="font-size: 18px; color: #cbd5e1; line-height: 1.65; font-weight: 600;">
            فحص كامل للنصوص لاستبعاد أي مصادر غير متوافقة مع تسليم الكنيسة، لضمان تعليم أرثوذكسي سليم وموثوق.
          </p>
        </div>
      </div>

      <footer class="slide-footer">
        <div>تعليم كنسي أصيل يربط الأجيال بإيمان وتسليم الكنيسة القبطية الأرثوذكسية</div>
        <div>الشريحة 6 من 9</div>
      </footer>
    </section>

    <!-- ========================================================================
         الشريحة 7: سهولة الاستخدام وتوافق الأجهزة
         ======================================================================== -->
    <section class="slide" id="slide-7">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="شعار مدرسة الكاروز" class="church-logo">
          <h2 class="slide-title">تجربة استخدام سهلة وسريعة على جميع الأجهزة</h2>
        </div>
        <div class="slide-badge" style="color: var(--cyan); border-color: rgba(0, 196, 236, 0.45);">
          <span>📱</span> وصول سهل ومباشر بدون تعقيد
        </div>
      </header>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 26px; margin: 20px 0; align-items: stretch;">
        <!-- Feature 1 -->
        <div class="glass-card" style="padding: 34px 28px; border-top: 5px solid var(--gold);">
          <div style="font-size: 44px; margin-bottom: 16px;">📲</div>
          <h3 style="font-size: 24px; font-weight: 900; color: var(--gold-bright); margin-bottom: 14px; line-height: 1.3;">
            تطبيق هاتف فوري وخفيف
          </h3>
          <p style="font-size: 18px; color: #cbd5e1; line-height: 1.65; font-weight: 600;">
            يعمل مباشرة عبر المتصفح ويمكن إضافته للشاشة الرئيسية بنقرة واحدة، دون الحاجة للذهاب إلى متاجر التطبيقات.
          </p>
        </div>

        <!-- Feature 2 -->
        <div class="glass-card" style="padding: 34px 28px; border-top: 5px solid var(--cyan);">
          <div style="font-size: 44px; margin-bottom: 16px;">🖥️</div>
          <h3 style="font-size: 24px; font-weight: 900; color: var(--cyan); margin-bottom: 14px; line-height: 1.3;">
            شاشات متجاوبة ومريحة
          </h3>
          <p style="font-size: 18px; color: #cbd5e1; line-height: 1.65; font-weight: 600;">
            قراءة سلسة وخطوط واضحة متوافقة تماماً مع مختلف الشاشات: الموبايل، التابلت، والكمبيوتر المكتبي.
          </p>
        </div>

        <!-- Feature 3 -->
        <div class="glass-card" style="padding: 34px 28px; border-top: 5px solid var(--emerald);">
          <div style="font-size: 44px; margin-bottom: 16px;">⚡</div>
          <h3 style="font-size: 24px; font-weight: 900; color: var(--emerald-bright); margin-bottom: 14px; line-height: 1.3;">
            أداء سريع وتصفح خفيف
          </h3>
          <p style="font-size: 18px; color: #cbd5e1; line-height: 1.65; font-weight: 600;">
            تحميل فوري للصفحات والأسفار حتى في ظل ضعف شبكة الإنترنت داخل القاعات أو أثناء التنقل.
          </p>
        </div>
      </div>

      <footer class="slide-footer">
        <div>المنظومة متاحة بين يدي الخادم والدارس في أي وقت وبأبسط وسيلة</div>
        <div>الشريحة 7 من 9</div>
      </footer>
    </section>

    <!-- ========================================================================
         الشريحة 8: الأمان والخصوصية وحماية البيانات
         ======================================================================== -->
    <section class="slide" id="slide-8">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="شعار مدرسة الكاروز" class="church-logo">
          <h2 class="slide-title">أمان البيانات والخصوصية الرقمية</h2>
        </div>
        <div class="slide-badge" style="color: #ff6b81; border-color: rgba(255, 107, 129, 0.45);">
          <span>🔒</span> بنية سحابية مشفرة ومستقرة
        </div>
      </header>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 26px; margin: 20px 0; align-items: stretch;">
        <!-- Security 1 -->
        <div class="glass-card" style="padding: 34px 28px; border-top: 5px solid var(--gold);">
          <div style="font-size: 44px; margin-bottom: 16px;">👥</div>
          <h3 style="font-size: 24px; font-weight: 900; color: var(--gold-bright); margin-bottom: 14px; line-height: 1.3;">
            فصل صارم للصلاحيات
          </h3>
          <p style="font-size: 18px; color: #cbd5e1; line-height: 1.65; font-weight: 600;">
            صلاحيات محددة بدقة لكل من (الإدارة، الخدام، والطلاب) بحيث لا يطّلع أي مستخدم إلا على بيانات فرقته فقط لضمان السرية.
          </p>
        </div>

        <!-- Security 2 -->
        <div class="glass-card" style="padding: 34px 28px; border-top: 5px solid var(--cyan);">
          <div style="font-size: 44px; margin-bottom: 16px;">🛡️</div>
          <h3 style="font-size: 24px; font-weight: 900; color: var(--cyan); margin-bottom: 14px; line-height: 1.3;">
            حماية السجلات والدرجات
          </h3>
          <p style="font-size: 18px; color: #cbd5e1; line-height: 1.65; font-weight: 600;">
            تشفير كامل للجلسات والبيانات لمنع أي اختراق أو تعديل غير مصرح به، مع مراقبة أمنية على مستوى السجلات الفردية.
          </p>
        </div>

        <!-- Security 3 -->
        <div class="glass-card" style="padding: 34px 28px; border-top: 5px solid var(--emerald);">
          <div style="font-size: 44px; margin-bottom: 16px;">💾</div>
          <h3 style="font-size: 24px; font-weight: 900; color: var(--emerald-bright); margin-bottom: 14px; line-height: 1.3;">
            نسخ احتياطي تلقائي مستمر
          </h3>
          <p style="font-size: 18px; color: #cbd5e1; line-height: 1.65; font-weight: 600;">
            حفظ دوري منتظم لقواعد البيانات السحابية لضمان عدم فقدان أي معلومة، مع إمكانية استرجاع البيانات في أي لحظة.
          </p>
        </div>
      </div>

      <footer class="slide-footer">
        <div>بنية تقنية احترافية تحافظ على بيانات الخدمة بأعلى معايير الأمان الأكاديمي</div>
        <div>الشريحة 8 من 9</div>
      </footer>
    </section>

    <!-- ========================================================================
         الشريحة 9: ابدأ التجربة الحية لمنظومة مدرسة الكاروز الآن
         ======================================================================== -->
    <section class="slide" id="slide-9">
      <header class="slide-header">
        <div class="brand-group">
          <img src="assets/logo.png" alt="شعار مدرسة الكاروز" class="church-logo">
          <h2 class="slide-title">البوابة الرقمية لمدرسة الكاروز متاحة الآن</h2>
        </div>
        <div class="slide-badge" style="color: var(--emerald-bright); border-color: rgba(16, 196, 138, 0.45);">
          <span>🚀</span> المنصة مفعلة وجاهزة للاستخدام
        </div>
      </header>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 36px; align-items: center; margin: 15px 0;">
        <!-- Left: Official Church Seal Card -->
        <div class="glass-card" style="padding: 28px 24px; text-align: center; border-color: rgba(218, 178, 60, 0.6); box-shadow: 0 20px 50px rgba(0,0,0,0.7), 0 0 35px var(--gold-glow);">
          <div style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 12px;">
            <!-- Pope Tawadros -->
            <div class="floating-leader-right" style="position: relative; width: 76px; height: 76px; border-radius: 50%; padding: 3px; background: linear-gradient(135deg, var(--gold-bright), var(--gold)); box-shadow: 0 0 20px var(--gold-glow);">
              <img src="assets/pope_tawadros.jpg" alt="قداسة البابا تواضروس الثاني" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; object-position: center 15%;">
            </div>

            <!-- Church Sanctuary -->
            <div style="width: 92px; height: 92px; border-radius: 50%; border: 3px solid var(--gold-bright); padding: 4px; background: rgba(14, 30, 68, 0.9); box-shadow: 0 0 30px var(--gold-glow);">
              <img src="assets/c_sanctuary.png" alt="كنيسة مارمرقس الرسول" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
            </div>

            <!-- Anba Morcos -->
            <div class="floating-leader-left" style="position: relative; width: 76px; height: 76px; border-radius: 50%; padding: 3px; background: linear-gradient(135deg, var(--gold-bright), var(--gold)); box-shadow: 0 0 20px var(--gold-glow);">
              <img src="assets/anba_morcos.jpg" alt="نيافة الأنبا مرقص" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; object-position: center 15%;">
            </div>
          </div>

          <div style="display: inline-block; padding: 5px 18px; border-radius: 20px; background: rgba(218, 178, 60, 0.18); border: 1.5px solid var(--gold); color: var(--gold-bright); font-size: 16px; font-weight: 800; margin-bottom: 10px;">
            ⛪ مطرانية شبرا الخيمة وتوابعها — كنيسة مارمرقس الرسول
          </div>

          <h3 style="font-size: 26px; font-weight: 900; color: var(--white); margin-bottom: 8px;">
            مدرسة الكاروز للكتاب المقدس<br><span style="color: var(--gold-bright);">تحت رعاية الأباء الأجلاء</span>
          </h3>

          <p style="font-size: 16px; color: var(--muted); line-height: 1.55; font-weight: 600; margin-bottom: 18px;">
            برعاية قداسة البابا المعظم الأنبا تواضروس الثاني وشريكه في الخدمة الرسولية نيافة الحبر الجليل الأنبا مرقص.
          </p>

          <a href="https://elkaroozschool1.vercel.app/" target="_blank" style="display: inline-flex; align-items: center; gap: 10px; background: linear-gradient(135deg, var(--gold), #b89127); color: #050b18; font-size: 18px; font-weight: 900; padding: 10px 32px; border-radius: 30px; text-decoration: none; box-shadow: 0 0 25px var(--gold-glow); transition: all 0.25s ease;">
            <span>دخول المنظومة الآن</span> 🏷️
          </a>
        </div>

        <!-- Right: Official Platform Address & Access Steps -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Official Platform Link Box -->
          <div class="glass-card" style="padding: 22px 26px; border-right: 6px solid var(--gold); border-color: rgba(218, 178, 60, 0.5);">
            <div style="font-size: 15px; color: var(--muted); font-weight: 700; margin-bottom: 6px;">الرابط الرسمي المباشر للمنصة:</div>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 14px; direction: ltr;">
              <span style="font-family: monospace; font-size: 22px; font-weight: 900; color: var(--cyan); letter-spacing: 0.5px;">https://elkaroozschool1.vercel.app/</span>
              <a href="https://elkaroozschool1.vercel.app/" target="_blank" class="ctrl-btn primary" style="font-size: 15px; padding: 8px 18px; text-decoration: none; white-space: normal; text-align: right;">
                <span>زيارة المنصة</span> ↗
              </a>
            </div>
          </div>

          <!-- 3 Simple Access Steps -->
          <div class="glass-card" style="padding: 24px 28px;">
            <h4 style="font-size: 22px; font-weight: 900; color: var(--gold-bright); margin-bottom: 14px;">خطوات الاستفادة والتشغيل:</h4>
            
            <div style="display: flex; flex-direction: column; gap: 14px; font-size: 17px; font-weight: 700; color: var(--white);">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="color: var(--gold-bright); font-size: 22px;">⭐</span>
                <span><strong>تصفح مفتوح للجميع:</strong> قراءة أسفار وتفاسير وخرائط الكتاب المقدس مباشرة.</span>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="color: var(--cyan); font-size: 22px;">⭐</span>
                <span><strong>دخول الخدام والدارسين:</strong> متابعة الحضور والغياب والامتحانات وماراثون الحفظ.</span>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="color: var(--emerald-bright); font-size: 22px;">⭐</span>
                <span><strong>منظومة في خدمة الكنيسة:</strong> تجمع التكنولوجيا الحديثة بالتعليم الروحي الأصيل.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer class="slide-footer">
        <div>جميع الحقوق محفوظة © مدرسة الكاروز للكتاب المقدس — كنيسة مارمرقس الرسول</div>
        <div>الشريحة 9 من 9</div>
      </footer>
    </section>

  </main>

  <!-- Floating Navigation Controls Dock -->
  <nav id="deckControls">
    <button class="ctrl-btn" onclick="prevSlide(event)" title="الشريحة السابقة (السهم الأيمن)">
      <span>←</span> السابق
    </button>
    <div class="slide-counter" id="slideCounter">1 / 9</div>
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
    <button class="ctrl-btn primary" onclick="nextSlide(event)" title="الشريحة التالية (السهم الأيسر أو مسافة)">
      التالي <span>→</span>
    </button>
    <button class="ctrl-btn" onclick="toggleFullScreen(event)" title="تفعيل / إلغاء ملء الشاشة">
      <span>⛶</span>
    </button>
  </nav>

  <!-- ========================================================================
       GSAP 3 TIMELINES, PARTICLES & NAVIGATION LOGIC
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
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class StarParticle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2.2 + 0.6;
        this.speedX = (Math.random() - 0.5) * 0.45;
        this.speedY = (Math.random() - 0.5) * 0.45;
        this.alpha = Math.random() * 0.7 + 0.2;
        this.color = Math.random() > 0.4 ? 'rgba(255, 218, 102, ' : 'rgba(0, 196, 236, ';
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (mouse.x !== null) {
          let dx = mouse.x - this.x;
          let dy = mouse.y - this.y;
          let dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 120) {
            let force = (120 - dist) / 120;
            this.x -= (dx / dist) * force * 1.5;
            this.y -= (dy / dist) * force * 1.5;
          }
        }

        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
          this.reset();
        }
      }
      draw() {
        ctx.fillStyle = this.color + this.alpha + ')';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#dab23c';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    function initParticles() {
      particles = [];
      const count = Math.min(Math.floor((canvas.width * canvas.height) / 14000), 100);
      for (let i = 0; i < count; i++) {
        particles.push(new StarParticle());
      }
    }
    initParticles();

    function renderParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let p of particles) {
        p.update();
        p.draw();
      }
      requestAnimationFrame(renderParticles);
    }
    renderParticles();

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });
    window.addEventListener('mouseleave', () => {
      mouse.x = null;
      mouse.y = null;
    });

    // 2. INTERACTIVE CLICK RIPPLE & GOLDEN SPARKLES
    window.addEventListener('click', (e) => {
      if (e.target.closest('#deckControls') || e.target.closest('a') || e.target.closest('button')) return;

      const ripple = document.createElement('div');
      ripple.className = 'click-ripple';
      ripple.style.left = `${e.clientX}px`;
      ripple.style.top = `${e.clientY}px`;
      document.body.appendChild(ripple);

      gsap.to(ripple, {
        width: 120,
        height: 120,
        opacity: 0,
        scale: 1,
        duration: 0.65,
        ease: "power2.out",
        onComplete: () => ripple.remove()
      });

      for (let i = 0; i < 7; i++) {
        const spark = document.createElement('div');
        spark.className = 'sparkle-particle';
        spark.style.left = `${e.clientX}px`;
        spark.style.top = `${e.clientY}px`;
        document.body.appendChild(spark);

        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 45 + 15;
        gsap.to(spark, {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          opacity: 0,
          scale: Math.random() * 1.5 + 0.5,
          duration: 0.55,
          ease: "power1.out",
          onComplete: () => spark.remove()
        });
      }
    });

    // 3. STAT COUNTER ANIMATION ENGINE
    function animateCounters(slideEl) {
      if (!slideEl) return;
      const counters = slideEl.querySelectorAll('.stat-number');
      counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'), 10);
        if (isNaN(target)) return;
        const obj = { val: 0 };
        gsap.to(obj, {
          val: target,
          duration: 1.6,
          ease: "power2.out",
          onUpdate: () => {
            counter.textContent = Math.floor(obj.val).toLocaleString('ar-EG');
          }
        });
      });
    }

    // 4. SLIDE NAVIGATION & GSAP TIMELINES
    function goToSlide(index, e) {
      if (e) e.stopPropagation();
      if (index >= 1 && index <= totalSlides && index !== currentSlide) {
        transitionToSlide(currentSlide, index);
      }
    }

    function nextSlide(e) {
      if (e) e.stopPropagation();
      if (currentSlide < totalSlides) {
        transitionToSlide(currentSlide, currentSlide + 1);
      }
    }

    function prevSlide(e) {
      if (e) e.stopPropagation();
      if (currentSlide > 1) {
        transitionToSlide(currentSlide, currentSlide - 1);
      }
    }

    function transitionToSlide(fromIndex, toIndex) {
      if (fromIndex === toIndex || isAnimating) return;
      isAnimating = true;

      const fromSlide = document.getElementById(`slide-${fromIndex}`);
      const toSlide = document.getElementById(`slide-${toIndex}`);
      const isForward = toIndex > fromIndex;

      const progressPercent = (toIndex / totalSlides) * 100;
      gsap.to('#progressBar', { width: `${progressPercent}%`, duration: 0.45, ease: "power2.out" });

      document.querySelectorAll('.dot-step').forEach((dot, idx) => {
        dot.classList.toggle('active', idx === toIndex - 1);
      });
      document.getElementById('slideCounter').textContent = `${toIndex} / ${totalSlides}`;

      const tl = gsap.timeline({
        onComplete: () => {
          fromSlide.classList.remove('active');
          isAnimating = false;
        }
      });

      tl.to(fromSlide, {
        opacity: 0,
        scale: 0.94,
        x: isForward ? -80 : 80,
        rotationY: isForward ? -7 : 7,
        filter: "blur(8px)",
        duration: 0.38,
        ease: "power2.inOut"
      });

      tl.add(() => {
        toSlide.classList.add('active');
      }, "-=0.15");

      tl.fromTo(toSlide, 
        { opacity: 0, scale: 1.06, x: isForward ? 90 : -90, rotationY: isForward ? 7 : -7, filter: "blur(12px)" },
        { opacity: 1, scale: 1, x: 0, rotationY: 0, filter: "blur(0px)", duration: 0.45, ease: "power3.out" }
      );

      const badge = toSlide.querySelector('.slide-badge');
      if (badge) {
        tl.from(badge, { scale: 0.7, opacity: 0, duration: 0.35, ease: "back.out(2)" }, "-=0.3");
      }

      const childCards = toSlide.querySelectorAll('.enc-grand-node, .glass-card, .screen-mockup-frame, .phone-mockup-frame, .enc-grand-hub');
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

      currentSlide = toIndex;
      animateCounters(toSlide);
    }

    // 5. MOUSE CLICK ADVANCE
    const deckStage = document.getElementById('deckStage');
    deckStage.addEventListener('click', (e) => {
      if (e.target.closest('#deckControls') || e.target.closest('a') || e.target.closest('button') || e.target.closest('.enc-grand-node') || e.target.closest('.enc-grand-hub')) {
        return;
      }
      nextSlide();
    });

    // 6. KEYBOARD ARROWS ADVANCE
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'PageDown' || e.key === ' ' || e.key === 'Enter') {
        nextSlide();
      } else if (e.key === 'ArrowRight' || e.key === 'PageUp') {
        prevSlide();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullScreen();
      }
    });

    // 7. FULLSCREEN TOGGLE
    function toggleFullScreen(e) {
      if (e) e.stopPropagation();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.log(err));
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    }

    // ========================================================================
    // 8. ENCYCLOPEDIA 10-SECTION INTERACTIVE RADIAL DATA & SWITCHER
    // ========================================================================
    const encSectionsData = {
      'sec1': {
        title: 'الكتاب المقدس',
        desc: 'الـ 73 سفراً القانونية كاملة بالتشكيل الدقيق، مع فهارس ذكية، تقسيم أصحاحات وشواهد، ودعم كامل للأسفار القانونية الثانية.',
        tag: 'نص قانوني موثق 100%',
        color: 'var(--gold-bright)',
        bg: 'rgba(218,178,60,0.22)'
      },
      'sec2': {
        title: 'تفسير الكتاب المقدس',
        desc: 'أضخم مكتبة تفاسير آبائية: شروحات القمص تادرس يعقوب ملطي والقمص أنطونيوس فكري وتفاسير الآباء الأولين لكل آية وإصحاح.',
        tag: 'تفسير آبائي أرثوذكسي',
        color: 'var(--cyan)',
        bg: 'rgba(0,196,236,0.22)'
      },
      'sec3': {
        title: 'ترجمات الكتاب المقدس',
        desc: 'عرض ومقارنة الترجمات العربية المتعددة (البيروتية، اليسوعية، المشتركة)، مع مقابلة النص القبطي والسبعيني والترجمات المعتمدة.',
        tag: 'مقارنة نصوص معتمدة',
        color: 'var(--emerald)',
        bg: 'rgba(16,196,138,0.22)'
      },
      'sec4': {
        title: 'مخطوطات الكتاب المقدس',
        desc: 'توثيق علمي للمخطوطات التاريخية الأثرية (السينائية، الفاتيكانية، الإسكندرية، ولفائف قمران) وبراهين حفظ وسلامة النصوص.',
        tag: 'توثيق تاريخي وأثري',
        color: '#c084fc',
        bg: 'rgba(192,132,252,0.22)'
      },
      'sec5': {
        title: 'شبهات الكتاب المقدس',
        desc: 'بنك دفاعي كنسي متكامل يقدم إجابات رصينة موثقة لاهوتياً وتاريخياً ولغوياً لتفنيد الشبهات المعاصرة وتثبيت إيمان الدارسين.',
        tag: 'دفاعيات ولاهوت موثق',
        color: '#ff6b81',
        bg: 'rgba(255,107,129,0.22)'
      },
      'sec6': {
        title: 'اطلس الكتاب المقدس',
        desc: 'خرائط جغرافية دقيقة توضح مسارات الآباء والأنبياء، رحلات بولس الرسول التبشيرية، خروج بني إسرائيل، ومواقع الأحداث.',
        tag: 'خرائط جغرافية تفاعلية',
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.22)'
      },
      'sec7': {
        title: 'موسوعة الشخصيات الكتابية',
        desc: 'فهرس تراجم شامل لأكثر من 3,000 شخصية كتابية، مع تحليل الدروس الروحية والسلوكية وشجرات الأنساب والعائلات المرتبطة.',
        tag: 'سير وتراجم كتابية',
        color: '#2dd4bf',
        bg: 'rgba(45,212,191,0.22)'
      },
      'sec8': {
        title: 'موسوعة الاماكن و الشعوب',
        desc: 'توثيق جغرافي وتاريخي للأمم والشعوب القديمة، ومطابقة أسماء المدن والقرى التوراتية بمواقعها المعاصرة.',
        tag: 'جغرافيا وتاريخ كتابي',
        color: '#38bdf8',
        bg: 'rgba(56,189,248,0.22)'
      },
      'sec9': {
        title: 'المارثون',
        desc: 'منظومة التنافس الذكية لحفظ الآيات والشواهد، بنك الأسئلة التفاعلي، رصد درجات الطلاب آلياً، ولوحة شرف أسبوعية للمتفوقين.',
        tag: 'حفظ وتنافس واختبارات',
        color: '#fbbf24',
        bg: 'rgba(251,191,36,0.22)'
      },
      'sec10': {
        title: 'قواميس الكتاب المقدس',
        desc: 'أضخم قاموس كتابي رقمي يضم آلاف المواد لتوضيح معاني الكلمات والرموز والاصطلاحات اللاهوتية والعبرية واليونانية بدقة.',
        tag: 'معجم ومصطلحات كنسية',
        color: '#818cf8',
        bg: 'rgba(129,140,248,0.22)'
      }
    };

    function switchEncSection(secKey, el, e) {
      if (e) e.stopPropagation();
      document.querySelectorAll('.enc-grand-node').forEach(item => item.classList.remove('active'));
      el.classList.add('active');

      const data = encSectionsData[secKey];
      if (!data) return;

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
          hub.style.boxShadow = `0 0 50px rgba(0, 0, 0, 0.8), 0 0 35px ${data.color}, inset 0 0 30px rgba(218, 178, 60, 0.1)`;
          gsap.to(hub, { opacity: 1, scale: 1, duration: 0.22, ease: "power2.out" });
        }});
      }
    }

    // Initial counter activation
    window.addEventListener('load', () => {
      animateCounters(document.getElementById('slide-1'));
    });
  </script>
</body>
</html>
"""

# Write to presentation/index.html
with open(dest_html_file, 'w', encoding='utf-8') as f:
    f.write(html_content)

# Write to presentation/presentation.html
with open(dest_presentation_copy, 'w', encoding='utf-8') as f:
    f.write(html_content)

# Also update scripts/build_luxurious_presentation.py so future runs preserve everything!
with open('scripts/build_luxurious_presentation.py', 'w', encoding='utf-8') as f:
    f.write(f'''import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

dest_html_file = 'presentation/index.html'
dest_presentation_copy = 'presentation/presentation.html'

html_content = """{html_content}"""

with open(dest_html_file, 'w', encoding='utf-8') as f:
    f.write(html_content)

with open(dest_presentation_copy, 'w', encoding='utf-8') as f:
    f.write(html_content)

print("Luxurious executive presentation generated successfully!")
''')

print("All presentation files generated successfully with simplified text and full-screen circle!")
