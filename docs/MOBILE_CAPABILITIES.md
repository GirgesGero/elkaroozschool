# EL KAROOZ SCHOOL — MOBILE CAPABILITIES REFERENCE
===================================================

## Capability Reference Matrix

> `READY` here means the abstraction boundary and current Web/PWA fallback exist. It does not mean Android/iOS native projects or plugins were created.

| Capability | Interface Method | Current Web / PWA Implementation | Future Native Adapter | Status |
| :- | :--- | :--- | :--- | :---: |
| **Platform Detection** | `getPlatformInfo()` | SSR safe detector (`WEB`, `PWA`) | Capacitor runtime flag (`ANDROID`, `IOS`) | **READY** |
| **Camera** | `CameraService.takePhoto()` | HTML5 `<input type="file" capture>` | `@capacitor/camera` | **READY** |
| **QR Scanner** | `QRScannerService.scan()` | Opaque normalized-input seam only; no camera decoder is claimed | `@capacitor-community/barcode-scanner` later | **BOUNDARY ONLY** |
| **QR Asset Resolver** | `QRAssetManager.resolvePersonQRAsset()` | Resolves existing `media_assets` record only; fails closed when absent | Existing authorized PHP/media creation pipeline | **READY — resolver only** |
| **File Picker** | `FilePickerService.pick()` | HTML5 multi-mime input | `@capacitor/filesystem` | **READY** |
| **Share** | `ShareService.share()` | `navigator.share` / Clipboard Fallback | `@capacitor/share` | **READY** |
| **Deep Links** | `DeepLinkService.parse()` | Canonical HTTPS routing (`/post/:id`) | Android App Links / iOS Universal Links | **READY** |
| **Push Notifications** | `PushNotificationService.registerDevice()` | ServiceWorker Web Push | `@capacitor/push-notifications` | **READY** |
| **Status Bar** | `StatusBarService.applyTheme()` | Dynamic `<meta name="theme-color">` | `@capacitor/status-bar` | **READY** |
| **Splash Screen** | `SplashScreenService.hide()` | CSS app-preloader dismissal | `@capacitor/splash-screen` | **READY** |
| **Haptics** | `HapticsService.success()` | `navigator.vibrate` patterns | `@capacitor/haptics` | **READY** |
| **App Badge** | `BadgeService.set(count)` | `navigator.setAppBadge` / UI Pill | Native app badge plugin | **READY** |
| **Permissions** | `PermissionService.request()` | Just-in-Time (JIT) Browser Prompt | Capacitor Permission flow | **READY** |

---

## Just-In-Time (JIT) Permission Protocol

Permissions are **NEVER requested in bulk during application launch**. Each permission is requested on-demand when the user activates a feature:
1. User clicks **"مسح QR الطالب"** ➔ `PermissionService.request('camera')`.
2. User toggles **"تفعيل الإشعارات"** ➔ `PermissionService.request('notifications')`.
3. User selects **"تغيير الصورة الشخصية"** ➔ `PermissionService.request('photos')`.
