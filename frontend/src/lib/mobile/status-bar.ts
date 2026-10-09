/**
 * Status Bar Service Adapter
 * Coordinates Status Bar style with the EL KAROOZ Theme Engine.
 */

import { getPlatformInfo } from './platform';
import type { AppTheme } from '@/context/ThemeContext';

export interface StatusBarStyleConfig {
  style: 'DARK' | 'LIGHT';
  backgroundColor: string;
}

export class StatusBarService {
  /**
   * Maps current theme to status bar style and color tokens.
   */
  static getThemeStatusConfig(theme: AppTheme): StatusBarStyleConfig {
    switch (theme) {
      case 'luxury':
        return { style: 'LIGHT', backgroundColor: '#070B14' };
      case 'dark':
        return { style: 'LIGHT', backgroundColor: '#121316' };
      case 'light':
        return { style: 'DARK', backgroundColor: '#F8F9FA' };
      case 'system':
      default:
        return { style: 'LIGHT', backgroundColor: '#070B14' };
    }
  }

  /**
   * Applies the status bar style according to the active theme.
   */
  static async applyTheme(theme: AppTheme): Promise<void> {
    const p = getPlatformInfo();
    const config = this.getThemeStatusConfig(theme);

    // 1. Future Native Adapter Seam (Capacitor StatusBar)
    if (p.isNative && (window as unknown as { Capacitor?: { Plugins?: { StatusBar?: any } } }).Capacitor?.Plugins?.StatusBar) {
      const StatusBar = (window as unknown as { Capacitor: { Plugins: { StatusBar: any } } }).Capacitor.Plugins.StatusBar;
      await StatusBar.setStyle({ style: config.style });
      await StatusBar.setBackgroundColor({ color: config.backgroundColor });
      return;
    }

    // 2. Web Fallback: Update HTML Meta Theme-Color
    if (typeof document !== 'undefined') {
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', config.backgroundColor);
    }
  }
}
