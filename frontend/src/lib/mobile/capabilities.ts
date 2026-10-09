/**
 * Central Capability Model
 * Exposes feature support and status across Web, PWA, Android, and iOS.
 */

import { getPlatformInfo, LogicalPlatform } from './platform';

export type CapabilityName =
  | 'camera'
  | 'qrScanner'
  | 'filePicker'
  | 'share'
  | 'pushNotifications'
  | 'deepLinks'
  | 'statusBar'
  | 'splashScreen'
  | 'haptics'
  | 'appBadge'
  | 'permissions';

export type CapabilityStatus = 'SUPPORTED' | 'UNSUPPORTED' | 'RESTRICTED' | 'FALLBACK_ONLY';

export interface CapabilityDescriptor {
  name: CapabilityName;
  supported: boolean;
  available: boolean;
  platform: LogicalPlatform;
  status: CapabilityStatus;
  notes?: string;
}

function hasNativePlugin(name: string): boolean {
  if (typeof window === 'undefined') return false;
  const plugins = (window as Window & { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor?.Plugins;
  return !!plugins?.[name];
}

export function getCapability(name: CapabilityName): CapabilityDescriptor {
  const p = getPlatformInfo();

  if (p.isSSR) {
    return {
      name,
      supported: false,
      available: false,
      platform: 'WEB',
      status: 'UNSUPPORTED',
      notes: 'SSR environment',
    };
  }

  switch (name) {
    case 'camera':
      return {
        name,
        supported: true,
        available: p.isNative ? hasNativePlugin('Camera') : typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
        platform: p.platform,
        status: p.isNative ? (hasNativePlugin('Camera') ? 'SUPPORTED' : 'UNSUPPORTED') : typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia ? 'SUPPORTED' : 'FALLBACK_ONLY',
        notes: p.isNative ? 'Capacitor Camera adapter seam' : 'HTML5 Media / input capture',
      };

    case 'qrScanner':
      const qrAvailable = p.isNative ? hasNativePlugin('BarcodeScanner') : typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
      return {
        name,
        supported: true,
        available: qrAvailable,
        platform: p.platform,
        status: qrAvailable ? 'SUPPORTED' : 'FALLBACK_ONLY',
        notes: p.isNative ? 'Native barcode scanner adapter seam' : 'Normalized input fallback; decoder remains application-owned',
      };

    case 'filePicker':
      return {
        name,
        supported: true,
        available: true,
        platform: p.platform,
        status: 'SUPPORTED',
        notes: p.isNative ? 'Native document picker adapter seam' : 'HTML5 File input',
      };

    case 'share':
      const hasWebShare = typeof navigator !== 'undefined' && !!navigator.share;
      const hasClipboard = typeof navigator !== 'undefined' && !!navigator.clipboard;
      return {
        name,
        supported: true,
        available: p.isNative ? hasNativePlugin('Share') : hasWebShare || hasClipboard,
        platform: p.platform,
        status: p.isNative ? (hasNativePlugin('Share') ? 'SUPPORTED' : 'UNSUPPORTED') : hasWebShare ? 'SUPPORTED' : hasClipboard ? 'FALLBACK_ONLY' : 'UNSUPPORTED',
        notes: hasWebShare ? 'Web Share API' : 'Clipboard fallback',
      };

    case 'pushNotifications':
      const hasNotification = typeof window !== 'undefined' && 'Notification' in window;
      const hasServiceWorker = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
      return {
        name,
        supported: true,
        available: p.isNative ? hasNativePlugin('PushNotifications') : hasNotification && hasServiceWorker,
        platform: p.platform,
        status: p.isNative ? (hasNativePlugin('PushNotifications') ? 'SUPPORTED' : 'UNSUPPORTED') : hasNotification && hasServiceWorker ? 'SUPPORTED' : 'UNSUPPORTED',
        notes: p.isNative ? 'Capacitor Push Notifications adapter seam' : 'ServiceWorker Web Push',
      };

    case 'deepLinks':
      return {
        name,
        supported: true,
        available: true,
        platform: p.platform,
        status: 'SUPPORTED',
        notes: 'Canonical HTTPS Routing / App Links / Universal Links',
      };

    case 'statusBar':
      return {
        name,
        supported: p.isNative,
        available: p.isNative ? hasNativePlugin('StatusBar') : true,
        platform: p.platform,
        status: p.isNative ? (hasNativePlugin('StatusBar') ? 'SUPPORTED' : 'UNSUPPORTED') : 'FALLBACK_ONLY',
        notes: p.isNative ? 'Native status bar adapter seam' : 'HTML meta theme-color',
      };

    case 'splashScreen':
      return {
        name,
        supported: p.isNative,
        available: p.isNative ? hasNativePlugin('SplashScreen') : true,
        platform: p.platform,
        status: p.isNative ? (hasNativePlugin('SplashScreen') ? 'SUPPORTED' : 'UNSUPPORTED') : 'FALLBACK_ONLY',
        notes: p.isNative ? 'Native splash adapter seam' : 'Existing web loading surface',
      };

    case 'haptics':
      const hasVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;
      const hapticsAvailable = p.isNative ? hasNativePlugin('Haptics') : hasVibrate;
      return {
        name,
        supported: hapticsAvailable,
        available: hapticsAvailable,
        platform: p.platform,
        status: hapticsAvailable ? 'SUPPORTED' : 'UNSUPPORTED',
        notes: p.isNative ? 'Capacitor Haptics adapter seam' : 'navigator.vibrate best effort',
      };

    case 'appBadge':
      const hasBadge = typeof navigator !== 'undefined' && typeof (navigator as Navigator & { setAppBadge?: unknown }).setAppBadge === 'function';
      const badgeAvailable = p.isNative ? hasNativePlugin('Badge') : hasBadge;
      return {
        name,
        supported: badgeAvailable,
        available: badgeAvailable,
        platform: p.platform,
        status: badgeAvailable ? 'SUPPORTED' : 'FALLBACK_ONLY',
        notes: hasBadge ? 'Web Badging API' : 'No-op; UI unread state remains authoritative',
      };

    case 'permissions':
      return {
        name,
        supported: true,
        available: true,
        platform: p.platform,
        status: 'SUPPORTED',
        notes: 'Just-in-time runtime permissions',
      };
  }
}

export function getAllCapabilities(): Record<CapabilityName, CapabilityDescriptor> {
  const names: CapabilityName[] = [
    'camera',
    'qrScanner',
    'filePicker',
    'share',
    'pushNotifications',
    'deepLinks',
    'statusBar',
    'splashScreen',
    'haptics',
    'appBadge',
    'permissions',
  ];

  return names.reduce((acc, name) => {
    acc[name] = getCapability(name);
    return acc;
  }, {} as Record<CapabilityName, CapabilityDescriptor>);
}
