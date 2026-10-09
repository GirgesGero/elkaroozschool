/**
 * File Picker Service Adapter
 * Standardized across Browser HTML5 file input and Future Native Capacitor Filesystem plugins.
 */

import { getPlatformInfo } from './platform';

export type FileCategory = 'IMAGE' | 'PDF' | 'AUDIO' | 'DOCUMENT' | 'ALL';

export interface SelectedFile {
  file: File;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
}

export interface FilePickerOptions {
  category?: FileCategory;
  multiple?: boolean;
  maxSizeBytes?: number;
}

const MIME_MAP: Record<FileCategory, string> = {
  IMAGE: 'image/jpeg,image/png,image/webp,image/gif',
  PDF: 'application/pdf',
  AUDIO: 'audio/mpeg,audio/mp3,audio/wav,audio/aac',
  DOCUMENT: 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv',
  ALL: '*/*',
};

export class FilePickerService {
  /**
   * Pick single or multiple files matching category.
   */
  static async pick(options: FilePickerOptions = {}): Promise<SelectedFile[]> {
    const category = options.category || 'ALL';
    const accept = MIME_MAP[category] || '*/*';
    const multiple = !!options.multiple;
    const maxSize = options.maxSizeBytes || 50 * 1024 * 1024; // 50MB default

    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        return reject(new Error('Cannot open file picker during SSR'));
      }

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.multiple = multiple;

      input.onchange = async () => {
        const files = Array.from(input.files || []);
        if (files.length === 0) {
          return resolve([]);
        }

        const validFiles: SelectedFile[] = [];
        for (const file of files) {
          if (file.size > maxSize) {
            console.warn(`File ${file.name} exceeds max size limit of ${maxSize} bytes.`);
            continue;
          }

          validFiles.push({
            file,
            name: file.name,
            size: file.size,
            type: file.type,
          });
        }

        resolve(validFiles);
      };

      input.click();
    });
  }

  /**
   * Convenience helper for single image picking.
   */
  static async pickImage(): Promise<SelectedFile | null> {
    const files = await this.pick({ category: 'IMAGE', multiple: false });
    return files[0] || null;
  }

  /**
   * Convenience helper for PDF picking.
   */
  static async pickPdf(): Promise<SelectedFile | null> {
    const files = await this.pick({ category: 'PDF', multiple: false });
    return files[0] || null;
  }

  /**
   * Convenience helper for MP3 audio picking.
   */
  static async pickAudio(): Promise<SelectedFile | null> {
    const files = await this.pick({ category: 'AUDIO', multiple: false });
    return files[0] || null;
  }
}
