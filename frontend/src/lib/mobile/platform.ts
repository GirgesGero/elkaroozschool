/**
 * Central Platform Abstraction & Detector
 * Safe for Next.js SSR, Static Generation, and Server Components.
 */

export type LogicalPlatform = 'WEB' | 'PWA' | 'ANDROID' | 'IOS';

export interface PlatformInfo {
  platform: LogicalPlatform;
  isBrowser: boolean;
  isSSR: boolean;
  isPWA: boolean;
  isNative: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  userAgent: string;
}

type CapacitorBridge = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

type BrowserRuntime = typeof globalThis & {
  window?: Window;
  navigator?: Navigator;
  document?: Document;
};

function browserRuntime(): BrowserRuntime | null {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return null;
  return globalThis as BrowserRuntime;
}

function getCapacitorBridge(runtime: BrowserRuntime | null): CapacitorBridge | undefined {
  return (runtime?.window as (Window & { Capacitor?: CapacitorBridge }) | undefined)?.Capacitor;
}

function isStandalonePwa(runtime: BrowserRuntime | null): boolean {
  if (!runtime?.window || !runtime.navigator) return false;
  const displayModeStandalone =
    typeof runtime.window.matchMedia === 'function' &&
    runtime.window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = (runtime.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const androidAppReferrer = runtime.document?.referrer.startsWith('android-app://') === true;
  return displayModeStandalone || iosStandalone || androidAppReferrer;
}

/**
 * Returns current platform detection state. Browser globals are read only after
 * runtime checks; native plugins are discovered but never imported on the server.
 */
export function getPlatformInfo(): PlatformInfo {
  const runtime = browserRuntime();
  if (!runtime?.navigator) {
    return {
      platform: 'WEB',
      isBrowser: false,
      isSSR: true,
      isPWA: false,
      isNative: false,
      isAndroid: false,
      isIOS: false,
      userAgent: 'SSR',
    };
  }

  const userAgent = runtime.navigator.userAgent || '';
  const isAndroid = /android/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent) ||
    (runtime.navigator.platform === 'MacIntel' && runtime.navigator.maxTouchPoints > 1);
  const bridge = getCapacitorBridge(runtime);

  let isNative = false;
  try {
    isNative = bridge?.isNativePlatform?.() === true;
  } catch {
    isNative = false;
  }

  const isPWA = !isNative && isStandalonePwa(runtime);
  const bridgePlatform = bridge?.getPlatform?.()?.toLowerCase();
  const platform: LogicalPlatform = isNative
    ? bridgePlatform === 'android' || isAndroid
      ? 'ANDROID'
      : bridgePlatform === 'ios' || isIOS
        ? 'IOS'
        : 'WEB'
    : isPWA
      ? 'PWA'
      : 'WEB';

  return { platform, isBrowser: true, isSSR: false, isPWA, isNative, isAndroid, isIOS, userAgent };
}

export const isSSR = (): boolean => getPlatformInfo().isSSR;
export const isBrowser = (): boolean => getPlatformInfo().isBrowser;
export const isNativePlatform = (): boolean => getPlatformInfo().isNative;
export const isPWA = (): boolean => getPlatformInfo().isPWA;
export const getPlatform = (): LogicalPlatform => getPlatformInfo().platform;
