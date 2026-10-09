/**
 * Push Notification Service Adapter
 * Standardized across Web Push (ServiceWorker) and Future Native Capacitor Push Notifications.
 */

import { getPlatformInfo, LogicalPlatform } from './platform';
import { DeepLinkService } from './deep-links';
import { PermissionService } from './permissions';

export interface PushNotificationPayload {
  notificationId: string;
  category: 'LECTURE' | 'BIRTHDAY' | 'PASTORAL' | 'MARATHON' | 'EXAM' | 'SYSTEM';
  title: string;
  body: string;
  deepLink?: string;
  data?: Record<string, unknown>;
}

export interface DeviceRegistrationState {
  registered: boolean;
  token?: string;
  platform: LogicalPlatform;
  permission: 'granted' | 'denied' | 'prompt';
}

type NativePushPlugin = {
  requestPermissions: () => Promise<{ receive: string }>;
  register: () => Promise<void>;
};

function nativePushPlugin(): NativePushPlugin | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { Capacitor?: { Plugins?: { PushNotifications?: NativePushPlugin } } })
    .Capacitor?.Plugins?.PushNotifications;
}

export class PushNotificationService {
  /**
   * Register the existing PWA service worker. This keeps browser registration
   * behind the same push adapter used by future native implementations.
   */
  static async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
    return navigator.serviceWorker.register('/sw.js');
  }

  /**
   * One adapter-owned foreground notification path. Existing notification UI
   * should call this method instead of constructing browser notifications.
   */
  static showForegroundNotification(payload: Pick<PushNotificationPayload, 'title' | 'body'>): boolean {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return false;
    }
    new Notification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192x192.png',
    });
    return true;
  }

  /**
   * Register device for push notifications.
   */
  static async registerDevice(_userId: string): Promise<DeviceRegistrationState> {
    const p = getPlatformInfo();

    if (p.isSSR) {
      return { registered: false, platform: 'WEB', permission: 'prompt' };
    }

    const nativePush = nativePushPlugin();
    if (p.isNative && nativePush) {
      const permission = await nativePush.requestPermissions();
      if (permission.receive !== 'granted') {
        return { registered: false, platform: p.platform, permission: 'denied' };
      }
      await nativePush.register();
      return { registered: true, platform: p.platform, permission: 'granted' };
    }

    // 2. Web Push via ServiceWorker
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      const permission = await PermissionService.request('notifications');
      if (permission !== 'granted') {
        return { registered: false, platform: 'WEB', permission };
      }
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager?.getSubscription();
        return {
          registered: !!subscription,
          token: subscription?.endpoint,
          platform: 'WEB',
          permission: 'granted',
        };
      } catch {
        return { registered: false, platform: 'WEB', permission: 'granted' };
      }
    }

    return { registered: false, platform: 'WEB', permission: 'denied' };
  }

  /**
   * Handles user tapping on a push notification.
   * Resolves deepLink and navigates safely.
   */
  static handleNotificationOpen(payload: PushNotificationPayload, router: { push: (url: string) => void }): boolean {
    if (payload.deepLink) {
      return DeepLinkService.navigate(payload.deepLink, router) || (router.push('/notifications'), true);
    }
    // Default fallback to notifications center
    router.push('/notifications');
    return true;
  }
}
