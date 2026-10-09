/**
 * Haptics Service Adapter
 * Provides semantic tactile feedback across Web and Future Capacitor Haptics.
 * 
 * Rules:
 *   - Do NOT attach haptics to every trivial button.
 *   - Use only for meaningful milestones: QR scan success, attendance toggle, exam submit.
 */

import { getPlatformInfo } from './platform';

export class HapticsService {
  /**
   * Light tactile tap (e.g. key press, tab switch).
   */
  static async impactLight(): Promise<void> {
    await this.triggerVibrate(15);
  }

  /**
   * Medium tactile click (e.g. selection toggle).
   */
  static async impactMedium(): Promise<void> {
    await this.triggerVibrate(30);
  }

  /**
   * Positive completion feedback (e.g. QR scanned, attendance saved).
   */
  static async success(): Promise<void> {
    await this.triggerPattern([30, 50, 60]);
  }

  /**
   * Warning vibration pattern.
   */
  static async warning(): Promise<void> {
    await this.triggerPattern([50, 40, 50]);
  }

  /**
   * Error / Refusal vibration pattern.
   */
  static async error(): Promise<void> {
    await this.triggerPattern([70, 50, 70, 50, 70]);
  }

  /**
   * Selection tick.
   */
  static async selection(): Promise<void> {
    await this.triggerVibrate(10);
  }

  private static async triggerVibrate(durationMs: number): Promise<void> {
    const p = getPlatformInfo();

    // 1. Future Native Adapter Seam (Capacitor Haptics)
    if (p.isNative && (window as unknown as { Capacitor?: { Plugins?: { Haptics?: any } } }).Capacitor?.Plugins?.Haptics) {
      const Haptics = (window as unknown as { Capacitor: { Plugins: { Haptics: any } } }).Capacitor.Plugins.Haptics;
      await Haptics.impact({ style: 'LIGHT' });
      return;
    }

    // 2. Browser Vibrate API Fallback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(durationMs);
      } catch {
        // Safe ignore
      }
    }
  }

  private static async triggerPattern(pattern: number[]): Promise<void> {
    const p = getPlatformInfo();

    // 1. Future Native Adapter Seam
    if (p.isNative && (window as unknown as { Capacitor?: { Plugins?: { Haptics?: any } } }).Capacitor?.Plugins?.Haptics) {
      const Haptics = (window as unknown as { Capacitor: { Plugins: { Haptics: any } } }).Capacitor.Plugins.Haptics;
      await Haptics.notification({ type: 'SUCCESS' });
      return;
    }

    // 2. Browser Vibrate Pattern Fallback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Safe ignore
      }
    }
  }
}
