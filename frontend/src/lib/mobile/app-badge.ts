/**
 * Application Badge Service Adapter
 * Single Source of Truth: Central Unread Notification Count.
 */

import { getPlatformInfo } from './platform';

export class BadgeService {
  private static currentBadgeCount = 0;

  /**
   * Sets app icon badge count.
   */
  static async set(count: number): Promise<void> {
    const validCount = Math.max(0, Math.floor(count));
    this.currentBadgeCount = validCount;
    const p = getPlatformInfo();

    // 1. Future Native Adapter Seam (Capacitor Badge plugin)
    if (p.isNative && (window as unknown as { Capacitor?: { Plugins?: { Badge?: any } } }).Capacitor?.Plugins?.Badge) {
      const Badge = (window as unknown as { Capacitor: { Plugins: { Badge: any } } }).Capacitor.Plugins.Badge;
      if (validCount > 0) {
        await Badge.set({ count: validCount });
      } else {
        await Badge.clear();
      }
      return;
    }

    // 2. Web Badging API Fallback
    if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
      try {
        if (validCount > 0) {
          await (navigator as unknown as { setAppBadge: (c: number) => Promise<void> }).setAppBadge(validCount);
        } else {
          await (navigator as unknown as { clearAppBadge: () => Promise<void> }).clearAppBadge();
        }
      } catch {
        // Ignore unhandled badging permission errors
      }
    }
  }

  /**
   * Clears app icon badge.
   */
  static async clear(): Promise<void> {
    await this.set(0);
  }

  /**
   * Returns in-memory badge count.
   */
  static getCount(): number {
    return this.currentBadgeCount;
  }
}
