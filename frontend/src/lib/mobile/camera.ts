/**
 * Camera Service Adapter
 * Standardized interface across Browser and Future Capacitor Camera.
 */

import { getPlatformInfo } from './platform';

export interface CameraPhotoResult {
  dataUrl: string;
  blob?: Blob;
  format: 'jpeg' | 'png' | 'webp';
  source: 'CAMERA' | 'GALLERY';
}

export interface CameraOptions {
  quality?: number; // 0-100
  allowEditing?: boolean;
  source?: 'CAMERA' | 'PHOTOS' | 'PROMPT';
  targetWidth?: number;
  targetHeight?: number;
}

export class CameraService {
  /**
   * Check if camera is available in current environment.
   */
  static async checkAvailability(): Promise<boolean> {
    const p = getPlatformInfo();
    if (p.isSSR) return false;
    if (p.isNative) return true;
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  }

  /**
   * Take a photo using camera or file picker fallback.
   */
  static async takePhoto(options: CameraOptions = {}): Promise<CameraPhotoResult> {
    const p = getPlatformInfo();

    // Future Native Adapter Seam (Capacitor Camera)
    if (p.isNative && (window as unknown as { Capacitor?: { Plugins?: { Camera?: any } } }).Capacitor?.Plugins?.Camera) {
      const Camera = (window as unknown as { Capacitor: { Plugins: { Camera: any } } }).Capacitor.Plugins.Camera;
      const image = await Camera.getPhoto({
        quality: options.quality || 90,
        allowEditing: options.allowEditing || false,
        resultType: 'dataUrl',
        source: options.source === 'PHOTOS' ? 'PHOTOS' : 'CAMERA',
      });
      return {
        dataUrl: image.dataUrl,
        format: image.format || 'jpeg',
        source: options.source === 'PHOTOS' ? 'GALLERY' : 'CAMERA',
      };
    }

    // Web Implementation: HTML File Input with capture
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        return reject(new Error('Cannot capture photo during SSR'));
      }

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp';
      if (options.source !== 'PHOTOS') {
        input.capture = 'environment';
      }

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          return reject(new Error('لم يتم التقاط أو اختيار أي صورة'));
        }

        const reader = new FileReader();
        reader.onload = () => {
          const format = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpeg';
          resolve({
            dataUrl: reader.result as string,
            blob: file,
            format,
            source: input.capture ? 'CAMERA' : 'GALLERY',
          });
        };
        reader.onerror = () => reject(new Error('فشل قراءة ملف الصورة'));
        reader.readAsDataURL(file);
      };

      input.click();
    });
  }

  /**
   * Pick photo from device gallery.
   */
  static async pickPhoto(options: CameraOptions = {}): Promise<CameraPhotoResult> {
    return this.takePhoto({ ...options, source: 'PHOTOS' });
  }
}
