/**
 * Share Service Adapter
 * Standardized across Web Share API, Clipboard Fallback, and Future Capacitor Share.
 */

import { getPlatformInfo } from './platform';

export interface SharePayload {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

export interface ShareResult {
  completed: boolean;
  method: 'NATIVE_SHARE' | 'WEB_SHARE' | 'CLIPBOARD_FALLBACK';
  message?: string;
}

export class ShareService {
  /**
   * Check if Web Share or Native Share is available.
   */
  static canShare(): boolean {
    const p = getPlatformInfo();
    if (p.isSSR) return false;
    if (p.isNative) return true;
    return typeof navigator !== 'undefined' && !!navigator.share;
  }

  /**
   * Share content or fallback to copying URL to clipboard.
   */
  static async share(payload: SharePayload): Promise<ShareResult> {
    const p = getPlatformInfo();

    // 1. Future Native Adapter Seam (Capacitor Share)
    if (p.isNative && (window as unknown as { Capacitor?: { Plugins?: { Share?: any } } }).Capacitor?.Plugins?.Share) {
      const NativeShare = (window as unknown as { Capacitor: { Plugins: { Share: any } } }).Capacitor.Plugins.Share;
      await NativeShare.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
        dialogTitle: payload.dialogTitle || 'مشاركة عبر مدرسة الكاروز',
      });
      return { completed: true, method: 'NATIVE_SHARE' };
    }

    // 2. Web Share API
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: payload.title,
          text: payload.text,
          url: payload.url,
        });
        return { completed: true, method: 'WEB_SHARE' };
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return { completed: false, method: 'WEB_SHARE', message: 'تم إلغاء المشاركة' };
        }
        // If web share fails with another error, fall through to clipboard
      }
    }

    // 3. Fallback: Copy link/text to clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      const targetText = payload.url || payload.text || payload.title || '';
      if (targetText) {
        await navigator.clipboard.writeText(targetText);
        return {
          completed: true,
          method: 'CLIPBOARD_FALLBACK',
          message: 'تم نسخ الرابط إلى الحافظة بنجاح',
        };
      }
    }

    return { completed: false, method: 'CLIPBOARD_FALLBACK', message: 'المشاركة غير مدعومة في هذا المتصفح' };
  }
}
