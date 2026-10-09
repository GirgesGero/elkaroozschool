/**
 * Splash Screen Service Adapter & Configuration
 * Standardized across Web Preloader and Future Capacitor Splash Screen.
 */

import { getPlatformInfo } from './platform';

export interface SplashConfiguration {
  backgroundColor: string;
  logoUrl: string;
  brandTitle: string;
  brandSubtitle: string;
  showSpinner: boolean;
  spinnerColor: string;
  launchAutoHide: boolean;
  launchShowDuration: number;
}

export class SplashScreenService {
  /**
   * Returns authoritative splash screen configurations for Light and Dark / Luxury themes.
   */
  static getSplashConfig(isDarkMode: boolean = true): SplashConfiguration {
    if (isDarkMode) {
      return {
        backgroundColor: '#070B14',
        logoUrl: '/logo.png',
        brandTitle: 'مدرسة الكاروز للكتاب المقدس',
        brandSubtitle: 'كنيسة مارمرقس الرسول بالمنشية',
        showSpinner: true,
        spinnerColor: '#C29938',
        launchAutoHide: true,
        launchShowDuration: 1500,
      };
    }

    return {
      backgroundColor: '#F8F9FA',
      logoUrl: '/logo.png',
      brandTitle: 'مدرسة الكاروز للكتاب المقدس',
      brandSubtitle: 'كنيسة مارمرقس الرسول بالمنشية',
      showSpinner: true,
      spinnerColor: '#C29938',
      launchAutoHide: true,
      launchShowDuration: 1500,
    };
  }

  /**
   * Hide the native or web splash screen after hydration.
   */
  static async hide(): Promise<void> {
    const p = getPlatformInfo();

    // 1. Future Native Adapter Seam (Capacitor SplashScreen)
    if (p.isNative && (window as unknown as { Capacitor?: { Plugins?: { SplashScreen?: any } } }).Capacitor?.Plugins?.SplashScreen) {
      const SplashScreen = (window as unknown as { Capacitor: { Plugins: { SplashScreen: any } } }).Capacitor.Plugins.SplashScreen;
      await SplashScreen.hide();
      return;
    }

    // 2. Web Fallback: Dismiss any DOM preloader element
    if (typeof document !== 'undefined') {
      const preloader = document.getElementById('app-preloader');
      if (preloader) {
        preloader.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => preloader.remove(), 300);
      }
    }
  }
}
