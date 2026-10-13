# خطة تحويل مشروع "مدرسة الكاروز" إلى تطبيق موبايل وتحديث تلقائي ونافذة اقتراح التثبيت
# Plan: Mobile App (PWA + Capacitor APK), Live Auto-Update, and Browser Smart Install Detection

- **التاريخ**: 2026-10-13
- **المشروع**: EL KAROOZ SCHOOL (منصة مدرسة الكاروز للكتاب المقدس)
- **المسار المقترح**: `.hermes/plans/2026-10-13_145637-mobile-app-pwa-capacitor-conversion.md`

---

## 1. الهدف (Goal)

تحويل منصة "مدرسة الكاروز" إلى تطبيق هاتف ذكي متكامل (PWA فوري + غلاف Capacitor Android APK) يدعم التحديث التلقائي الحي على هواتف المستخدمين بمجرد نشر أي تطوير، مع اكتشاف فتح الموقع من متصفح هاتف ذكي وعرض نافذة تفاعلية راقية تقترح تثبيت التطبيق أو تحميله.

---

## 2. السياق الحالي والافتراضات (Current Context & Assumptions)

1. **الواجهة الأمامية الحالية**:
   - مبنية بـ Next.js 14 (App Router) مع React 18 و Tailwind CSS و TypeScript.
   - يتوفر بالفعل ملف `public/manifest.json` وملف `public/sw.js` و `ServiceWorkerRegistration.tsx`.
   - ملف `sw.js` مخصص حالياً لكاش الكتاب المقدس وشل التطبيق الأساسي (`elkarooz-shell-v2`).
2. **القصور الحالي**:
   - لا يوجد كاشف لما إذا كان المستخدم يفتح التطبيق من داخل متصفح عادي (Chrome/Safari) مقابل وضع التطبيق المستقل (`standalone`).
   - لا توجد نافذة اقتراح تثبيت ذكية (`Install Prompt`) تقترح على المتدرب تثبيت التطبيق على هاتفه بنقرة واحدة.
   - لا توجد آلية لاكتشاف صدور تحديث جديد للموقع على السيرفر وإشعار المستخدم بالتحديث التلقائي الفوري (`SW updatefound / skipWaiting`).
   - لا يوجد مشروع Capacitor مهيأ لبناء حزمة أندرويد مستقلة (`APK`) لمن يفضل تثبيت تطبيق تقليدي.

---

## 3. المعمارية والنهج المقترح (Architecture & Proposed Approach)

نعتمد معمارية هجينة ثلاثية الأبعاد:

1. **كاشف بيئة التشغيل ونافذة التثبيت الذكية (Smart Install & Browser Detection)**:
   - فحص حالة العرض `window.matchMedia('(display-mode: standalone)').matches` لتحديد ما إذا كان الموقع مفتوحاً كتطبيق أم داخل متصفح ويب.
   - التقاط حدث الـ PWA القياسي `beforeinstallprompt` لأجهزة Android/Chromium.
   - الكشف الدقيق لأجهزة iOS/Safari وعرض إرشادات خطوة بخطوة باللغة العربية ("اضغط على زر المشاركة ⎋ ثم 'إضافة إلى الصفحة الرئيسية'").
   - توفير زر بديل مباشر لتحميل حزمة `APK` لمن يفضل التثبيت المباشر.
   - حفظ تفضيل الإغلاق في `localStorage` بفترة تهدئة (Cooldown) مدتها 7 أيام حتى لا تتكرر الرسالة بشكل مزعج.
2. **محرك التحديث التلقائي الفوري (Live Auto-Update Engine)**:
   - استماع دوري ومباشر لتغيرات الـ Service Worker عبر `registration.onupdatefound`.
   - عند توفر إصدار جديد، يتم إرسال إشارة `SKIP_WAITING` لعامل الخدمة، وعرض شريط عائم راقٍ للمستخدم: "يوجد إصدار جديد للمنظومة — جاري التحديث... [تحديث الآن]".
3. **غلاف الموبايل الأصلي (Capacitor Android Shell)**:
   - تكوين Capacitor 6 لتوليد مشروع أندرويد قياسي يوجّه التطبيق إلى النطاق الحي أو يستضيف البناء المحلي مع شاشات Splash وأيقونات متوافقة مع مظهر المنظومة القبطي الفاخر.

---

## 4. خطة المهام التفصيلية خطوة بخطوة (Step-by-Step Implementation Tasks)

---

### Task 1: خطاف كشف بيئة المتصفح وحدث التثبيت (`usePwaInstall.ts`)
- **الملف المستهدف**: `frontend/src/hooks/usePwaInstall.ts`
- **الوصف**: خطاف مخصص يكشف:
  1. هل التطبيق يعمل في وضع `standalone` (تطبيق مثبت) أم متصفح ويب عادي؟
  2. هل الجهاز هاتف محمول (Android / iOS / Mobile User-Agent)؟
  3. تخزين حدث `beforeinstallprompt` لتشغيله عند نقر المستخدم على زر التثبيت.
  4. حفظ حالة الرفض `elkarooz-install-dismissed` لتجنب الإزعاج.

```typescript
// frontend/src/hooks/usePwaInstall.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PwaInstallState {
  isInstallable: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isMobileBrowser: boolean;
  promptInstall: () => Promise<boolean>;
  dismissPrompt: () => void;
}

const DISMISS_KEY = 'elkarooz_pwa_install_dismissed_until';
const COOLDOWN_DAYS = 7;

export function usePwaInstall(): PwaInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Detect if running as standalone app
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');
    setIsStandalone(isStandaloneMode);

    // 2. Detect platform
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    const isAndroidDevice = /android/.test(ua);
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // 3. Check dismissal cooldown
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil) {
      const expiry = parseInt(dismissedUntil, 10);
      if (Date.now() < expiry) {
        setIsDismissed(true);
      } else {
        localStorage.removeItem(DISMISS_KEY);
        setIsDismissed(false);
      }
    } else {
      setIsDismissed(false);
    }

    // 4. Capture beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        return true;
      }
    } catch (err) {
      console.error('Install prompt error:', err);
    }
    return false;
  }, [deferredPrompt]);

  const dismissPrompt = useCallback(() => {
    const expireTime = Date.now() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, expireTime.toString());
    setIsDismissed(true);
  }, []);

  const isMobileBrowser = !isStandalone && (isAndroid || isIOS) && !isDismissed;
  const isInstallable = isMobileBrowser && (!!deferredPrompt || isIOS);

  return {
    isInstallable,
    isStandalone,
    isIOS,
    isAndroid,
    isMobileBrowser,
    promptInstall,
    dismissPrompt,
  };
}
```

---

### Task 2: اختبارات الوحدة لكاشف التثبيت (`tests/pwa-install.test.ts`)
- **الملف المستهدف**: `frontend/tests/pwa-install.test.ts`
- **الوصف**: التحقق من دقة كشف المتصفح، وعزل وضع الـ standalone، ومنع ظهور النافذة إذا كان المستخدم داخل التطبيق بالفعل.

```typescript
// frontend/tests/pwa-install.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePwaInstall } from '@/hooks/usePwaInstall';

describe('usePwaInstall Hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('detects standalone mode when display-mode matches', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('display-mode: standalone'),
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));

    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.isStandalone).toBe(true);
    expect(result.current.isInstallable).toBe(false);
  });

  it('allows dismissing prompt and stores cooldown in localStorage', () => {
    const { result } = renderHook(() => usePwaInstall());

    act(() => {
      result.current.dismissPrompt();
    });

    expect(localStorage.getItem('elkarooz_pwa_install_dismissed_until')).toBeTruthy();
    expect(result.current.isInstallable).toBe(false);
  });
});
```
- **أمر التحقق**:
  ```bash
  cd "E:/drive progect/ELKAROOZ SCHOOL/frontend" && npx vitest run tests/pwa-install.test.ts
  ```

---

### Task 3: نافذة اقتراح تحميل وتثبيت التطبيق (`AppInstallPromptModal.tsx`)
- **الملف المستهدف**: `frontend/src/components/AppInstallPromptModal.tsx`
- **الوصف**: نافذة منبثقة راقية بالهوية القبطية الملكية (كحلي ملكي + ذهب قبطي) تظهر للمستخدم عند فتح الموقع من المتصفح:
  - تعرض أيقونة التطبيق والفوائد الرئيسية.
  - زر تثبيت فوري بنقرة واحدة (لأجهزة الأندرويد).
  - إرشادات التثبيت المباشرة لأجهزة iPhone (زر Share -> Add to Home Screen).
  - زر اختياري لتحميل ملف APK المباشر.
  - زر "لاحقاً" لحفظ فترة التهدئة.

```tsx
// frontend/src/components/AppInstallPromptModal.tsx
'use client';

import React, { useState } from 'react';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import {
  Download,
  Smartphone,
  Share2,
  PlusSquare,
  CheckCircle2,
  X,
  Sparkles,
  Zap,
  BellRing,
  BookOpen,
} from 'lucide-react';

export default function AppInstallPromptModal() {
  const {
    isInstallable,
    isIOS,
    promptInstall,
    dismissPrompt,
  } = usePwaInstall();

  const [isInstalling, setIsInstalling] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  if (!isInstallable) return null;

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosGuide(true);
      return;
    }

    setIsInstalling(true);
    const installed = await promptInstall();
    setIsInstalling(false);
    if (installed) {
      dismissPrompt();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="تثبيت تطبيق مدرسة الكاروز"
      className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6 flex justify-center animate-slide-up pointer-events-none"
      dir="rtl"
    >
      <div className="w-full max-w-md rounded-3xl bg-nav/95 border-2 border-gold/40 backdrop-blur-2xl shadow-2xl shadow-black/80 p-5 pointer-events-auto relative overflow-hidden">
        {/* Glow Ambient Line */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent opacity-80" />

        {/* Close Button */}
        <button
          onClick={dismissPrompt}
          className="absolute left-4 top-4 p-1.5 rounded-full bg-canvas/60 text-content-muted hover:text-content border border-line transition-colors"
          aria-label="إغلاق التنبيه"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with App Logo & Title */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-gold/30 via-canvas to-gold/10 border-2 border-gold p-1 flex items-center justify-center shrink-0 shadow-lg shadow-gold/10">
            <Smartphone className="w-7 h-7 text-gold animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-black text-sm text-content">تطبيق مدرسة الكاروز للهاتف</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold/20 text-brand-gold border border-gold/40">
                مجاني وسريع
              </span>
            </div>
            <p className="text-xs text-content-muted mt-0.5">
              تصفح أسرع، بدون إنترنت للألحان، وتنبيهات فورية للمحاضرات
            </p>
          </div>
        </div>

        {/* Value Props Pills */}
        <div className="grid grid-cols-3 gap-2 py-3 border-y border-line/60 mb-4 text-center">
          <div className="p-2 rounded-xl bg-canvas/60 border border-line/40">
            <Zap className="w-4 h-4 text-gold mx-auto mb-1" />
            <span className="text-[10px] font-bold text-content block">أداء فائق</span>
          </div>
          <div className="p-2 rounded-xl bg-canvas/60 border border-line/40">
            <BellRing className="w-4 h-4 text-gold mx-auto mb-1" />
            <span className="text-[10px] font-bold text-content block">تنبيهات فورية</span>
          </div>
          <div className="p-2 rounded-xl bg-canvas/60 border border-line/40">
            <BookOpen className="w-4 h-4 text-gold mx-auto mb-1" />
            <span className="text-[10px] font-bold text-content block">مكتبة أوفلاين</span>
          </div>
        </div>

        {/* iOS Step-by-Step Instructions */}
        {showIosGuide && (
          <div className="p-3.5 rounded-2xl bg-canvas/80 border border-gold/30 mb-4 space-y-2 text-xs animate-fade-in">
            <p className="font-bold text-gold flex items-center gap-1.5">
              <Share2 className="w-4 h-4" />
              <span>طريقة التثبيت على آيفون (iOS Safari):</span>
            </p>
            <ol className="list-decimal list-inside space-y-1 text-content-secondary pr-1">
              <li>اضغط على زر المشاركة أسفل المتصفح <Share2 className="w-3.5 h-3.5 inline mx-1 text-content" /></li>
              <li>مرر للأسفل واختر <span className="font-bold text-content">«إضافة إلى الصفحة الرئيسية»</span> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-gold" /></li>
              <li>اضغط <span className="font-bold text-success">«إضافة (Add)»</span> أعلى الشاشة.</li>
            </ol>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={isInstalling}
            onClick={handleInstallClick}
            className="flex-1 app-btn app-btn-primary text-xs py-2.5"
          >
            <Download className="w-4 h-4" />
            <span>{isIOS ? 'إرشادات التثبيت على آيفون' : 'تثبيت التطبيق على الهاتف الآن'}</span>
          </button>

          <button
            type="button"
            onClick={dismissPrompt}
            className="px-3.5 py-2.5 rounded-xl bg-canvas border border-line hover:bg-nav text-content-secondary text-xs font-bold transition-colors"
          >
            لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### Task 4: محرك مراقبة وإشعار التحديث التلقائي الفوري (`ServiceWorkerUpdatePrompt.tsx`)
- **الملف المستهدف**: `frontend/src/components/ServiceWorkerUpdatePrompt.tsx`
- **الوصف**: عند قيام المطور برفع كود جديد للـ Backend أو الـ Frontend:
  1. يلتقط المتصفح وجود نسخة جديدة من ملف `sw.js`.
  2. يعرض Toast ناعم: "يوجد إصدار أحدث متوفر من مدرسة الكاروز [تحديث الآن]".
  3. يرسل رسالة `{ type: 'SKIP_WAITING' }` لعامل الخدمة لتبديل النسخة وعمل `window.location.reload()`.

```tsx
// frontend/src/components/ServiceWorkerUpdatePrompt.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';

export default function ServiceWorkerUpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showReload, setShowReload] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then((registration) => {
      // Check if there is already a waiting worker
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setShowReload(true);
      }

      // Listen for new workers entering installed state
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setShowReload(true);
          }
        });
      });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  if (!showReload) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-20 sm:bottom-6 left-4 z-50 animate-slide-up"
      dir="rtl"
    >
      <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-brand text-brand-on shadow-2xl border border-gold/40">
        <Sparkles className="w-5 h-5 text-gold animate-spin" />
        <div>
          <h4 className="text-xs font-black">تحديث جديد متوفر للمنظومة</h4>
          <p className="text-[11px] opacity-90">تم تحديث المناهج والميزات، انقر للتفعيل الفوري</p>
        </div>
        <button
          onClick={handleUpdate}
          className="mr-2 px-3 py-1.5 rounded-xl bg-gold text-brand-on text-xs font-black hover:bg-warning transition-all shadow-md flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>تحديث الآن</span>
        </button>
      </div>
    </div>
  );
}
```

---

### Task 5: دمج مكونات التثبيت والتحديث في شجرة التطبيق الرئيسية
- **الملف المستهدف**: `frontend/src/app/providers.tsx`
- **الوصف**: إضافة `AppInstallPromptModal` و `ServiceWorkerUpdatePrompt` داخل المزود الشامل `Providers` لتعمل تلقائياً في كافة صفحات التطبيق بدون تكرار الكود.

---

### Task 6: إعداد غلاف Capacitor لبناء تطبيق Android APK أصيل
- **الملف المستهدف**: `frontend/capacitor.config.ts`
- **الوصف**:
  1. تثبيت حزم Capacitor:
     ```bash
     cd "frontend" && npm install @capacitor/core @capacitor/cli @capacitor/android
     ```
  2. إنشاء `capacitor.config.ts` يوجه إلى الرابط المباشر للإنتاج:
     ```typescript
     import type { CapacitorConfig } from '@capacitor/cli';

     const config: CapacitorConfig = {
       appId: 'net.isbest.elkaroozschool',
       appName: 'مدرسة الكاروز',
       webDir: 'public',
       server: {
         url: 'http://elkaroozschool.is-best.net',
         cleartext: true, // يدعم HTTP على نطاق الاستضافة
       },
       plugins: {
         SplashScreen: {
           launchShowDuration: 2000,
           backgroundColor: '#070B14',
         },
       },
     };

     export default config;
     ```
  3. توليد مشروع أندرويد الأصلي:
     ```bash
     npx cap add android
     ```
  4. تفعيل التحديث التلقائي الفوري داخل الـ APK:
     * لأن الـ APK يعرض السيرفر الحي `url: 'http://elkaroozschool.is-best.net'`، **أي تعديل تقوم بنشره على السيرفر يظهر فوراً داخل تطبيق الهاتف على أجهزة الطلاب بمجرد فتح التطبيق** دون الحاجة لإعادة رفع أو إعادة تثبيت ملف APK جديد!

---

### Task 7: دليل بناء الـ APK وتوليد النسخة (`docs/MOBILE_APP_PWA_GUIDE.md`)
- **الملف المستهدف**: `docs/MOBILE_APP_PWA_GUIDE.md`
- **الوصف**: توثيق شامل باللغة العربية يشرح:
  1. كيفية بناء وتصدير ملف الـ APK عبر `npx cap open android` أو `gradlew assembleRelease`.
  2. كيفية نشر التطبيق على متجر Google Play أو رفعه كرابط تحميل مباشر على الموقع للطلاب.
  3. كيفية عمل التحديثات التلقائية عبر الـ PWA و Capacitor Live Server.

---

## 5. مصفوفة التحقق والاختبار (Verification & Test Suite)

1. **اختبارات الوحدة (Vitest)**:
   - كتابة `tests/pwa-install.test.ts` واجتيازه.
   - تشغيل `npm test -- --run` للتأكد من عدم حدوث أي تراجع في الـ 16 ملفاً الحالية (178 اختباراً).
2. **فحص الـ TypeScript**:
   - `npx tsc --noEmit` للتأكد من نظافة الأنواع 100%.
3. **محاكاة المتصفح (Browser Emulation & Mobile UA)**:
   - فحص استجابة النافذة على متصفح هاتف عادي (ظهور النافذة المقترحة للتثبيت).
   - فحص وضع `standalone` (اختفاء النافذة تماماً داخل التطبيق المثبت).
   - اختبار الضغط على زر "لاحقاً" والتأكد من عدم إزعاج المستخدم لمدة 7 أيام.
4. **فحص أمان الحزمة والبناء**:
   - تشغيل `scripts/package_zip.php` للتأكد من سلامة ملفات السيرفر.

---

## 6. المخاطر والبدائل والأسئلة المفتوحة (Risks & Tradeoffs)

1. **دعم HTTP مقابل HTTPS على النطاق المجاني**:
   - ميزة PWA `beforeinstallprompt` تشترط في المتصفحات الحديثة بروتوكول HTTPS أو `localhost`.
   - نطاق `is-best.net` يعمل حالياً عبر HTTP.
   - **الحل المقترح**:
     1. تفعيل شهادة SSL مجانية (Let's Encrypt / Cloudflare) من لوحة تحكم الاستضافة، أو ربط الواجهة بنطاق Vercel الآمن (`https://...vercel.app`).
     2. حزمة Capacitor APK تتجاوز هذا القيد عبر خيار `cleartext: true` فتعمل بسلاسة حتى على HTTP.
2. **استراتيجية التحديث التلقائي**:
   - الاعتماد على `server.url` في Capacitor يضمن أن التحديثات فورية 100% دون تدخل من المستخدم. في حالة عدم توفر إنترنت، يعمل كاش الـ Service Worker كبديل لتوفير تجربة أوفلاين لموسوعة الكتاب المقدس والألحان.

---
تم إعداد الخطة وحفظها في المسار:
`E:\drive progect\ELKAROOZ SCHOOL\.hermes\plans\2026-10-13_145637-mobile-app-pwa-capacitor-conversion.md`
