# EL KAROOZ SCHOOL — MOBILE MIGRATION PLAN (FUTURE NATIVE PHASE)
==================================================================

This roadmap outlines the exact steps to transition from the current **Mobile-Ready Architecture** to fully compiled native Android and iOS applications when mobile development officially begins.

---

## Phase 1: Capacitor Native Shell Integration

```bash
# 1. Install Capacitor core dependencies into frontend
cd frontend
npm install @capacitor/core
npm install -D @capacitor/cli

# 2. Initialize Capacitor configuration
npx cap init "EL KAROOZ SCHOOL" "com.elkarooz.school" --web-dir out

# 3. Add Android and iOS native platforms
npx cap add android
npx cap add ios
```

---

## Phase 2: Official Native Plugins

Install official Capacitor plugins mapping directly to our pre-built services:
- **Camera:** `@capacitor/camera` ➔ `CameraService`
- **Barcode / QR:** `@capacitor-community/barcode-scanner` ➔ `QRScannerService`
- **Haptics:** `@capacitor/haptics` ➔ `HapticsService`
- **Status Bar:** `@capacitor/status-bar` ➔ `StatusBarService`
- **Splash Screen:** `@capacitor/splash-screen` ➔ `SplashScreenService`
- **Push Notifications:** `@capacitor/push-notifications` ➔ `PushNotificationService`
- **Share:** `@capacitor/share` ➔ `ShareService`

---

## Phase 3: Android App Links & iOS Universal Links

1. **Android (`assetlinks.json`):**
   - Host `https://elkaroozschool.is-best.net/.well-known/assetlinks.json`.
   - Links canonical routes `/post/*`, `/lecture/*`, `/marathon/*` to `MainActivity`.

2. **iOS (`apple-app-site-association`):**
   - Host `https://elkaroozschool.is-best.net/.well-known/apple-app-site-association`.
   - Binds universal domain handling to `com.elkarooz.school`.
