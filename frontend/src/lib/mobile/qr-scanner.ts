/**
 * QR Scanner Service Adapter & Authoritative Payload Parser / Serializer
 *
 * Authoritative QR payload: PERSON NAME + PERSON ID
 * - PERSON ID = Primary and Authoritative Lookup Key
 * - PERSON NAME = Secondary Identity Verification
 */

import { getPlatformInfo } from './platform';

export interface QRScanResult {
  rawValue: string;
  format: string;
  parsedPayload: QRPayload;
}

export interface QRPayload {
  type: 'PERSON_IDENTITY' | 'GENERAL';
  personName?: string;
  personId?: string;
  id: string;
  isValid: boolean;
  identityStatus?: 'IDENTITY_MISMATCH' | 'PERSON_NOT_FOUND';
  actualName?: string;
  reason?: string;
}

export interface QRScanOptions {
  torch?: boolean;
  prompt?: string;
  formats?: string[];
}

export interface QRIdentityResolution {
  status: 'MATCH' | 'IDENTITY_MISMATCH' | 'PERSON_NOT_FOUND';
  personId: string;
  qrName: string;
  actualName?: string;
}

/**
 * Serializes a Person identity into the authoritative QR payload string.
 * Format: EKQR:v1|{personId}|{personName}
 */
export function serializePersonQR(name: string, personId: string): string {
  if (!name || !name.trim() || !personId || !personId.trim()) {
    throw new Error('Name and Person ID are required to serialize QR');
  }
  return `EKQR:v1|${personId.trim()}|${name.trim()}`;
}

/**
 * Parses raw QR payload into a normalized QRPayload object.
 * Supports canonical prefix, pipe delimiters, URI schemes, and JSON envelopes.
 */
export function parsePersonQR(raw: string): QRPayload {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return { type: 'GENERAL', id: '', isValid: false, reason: 'EMPTY_PAYLOAD' };
  }

  const trimmed = raw.trim();

  // Pattern 1: Canonical Prefix: EKQR:v1|{personId}|{personName} or ELKAROOZ:PERSON|{personId}|{personName}
  const prefixMatch = trimmed.match(/^(?:EKQR:v1|ELKAROOZ:PERSON)\|([^|]+)\|(.+)$/);
  if (prefixMatch) {
    const personId = prefixMatch[1].trim();
    const personName = prefixMatch[2].trim();
    if (personId && personName) {
      return {
        type: 'PERSON_IDENTITY',
        id: personId,
        personId,
        personName,
        isValid: true,
      };
    }
  }

  // Pattern 2: Pipe delimiter: {name}|{personId} or {personId}|{name}
  if (trimmed.includes('|')) {
    const parts = trimmed.split('|').map((s) => s.trim()).filter(Boolean);
    if (parts.length === 2) {
      const isUuid0 = /^[0-9a-fA-F-]{8,}$/.test(parts[0]);
      const isUuid1 = /^[0-9a-fA-F-]{8,}$/.test(parts[1]);

      if (isUuid0 && !isUuid1) {
        return {
          type: 'PERSON_IDENTITY',
          id: parts[0],
          personId: parts[0],
          personName: parts[1],
          isValid: true,
        };
      } else if (isUuid1 && !isUuid0) {
        return {
          type: 'PERSON_IDENTITY',
          id: parts[1],
          personId: parts[1],
          personName: parts[0],
          isValid: true,
        };
      } else if (parts[0] && parts[1]) {
        return {
          type: 'PERSON_IDENTITY',
          id: parts[1],
          personId: parts[1],
          personName: parts[0],
          isValid: true,
        };
      }
    }
  }

  // Pattern 3: URI: elkarooz://person?id=...&name=...
  if (trimmed.startsWith('elkarooz://')) {
    try {
      const url = new URL(trimmed.replace('elkarooz://', 'http://dummy/'));
      const id = url.searchParams.get('id') || url.pathname.replace(/^\//, '');
      const name = url.searchParams.get('name') || url.searchParams.get('user');
      if (id && name) {
        return {
          type: 'PERSON_IDENTITY',
          id,
          personId: id,
          personName: name,
          isValid: true,
        };
      }
    } catch {}
  }

  // Pattern 4: JSON envelope
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed);
      const personId = obj.personId || obj.id;
      const personName = obj.personName || obj.name || obj.full_name;
      if (personId && personName) {
        return {
          type: 'PERSON_IDENTITY',
          id: String(personId),
          personId: String(personId),
          personName: String(personName),
          isValid: true,
        };
      }
    } catch {}
  }

  // Unknown or opaque string
  return {
    type: 'GENERAL',
    id: trimmed,
    isValid: false,
    reason: 'UNKNOWN_OR_MALFORMED_FORMAT',
  };
}

export class QRScannerService {
  /**
   * Parse payload using the canonical person QR parser.
   */
  static parsePayload(raw: string): QRPayload {
    return parsePersonQR(raw);
  }

  /**
   * Resolve Person identity from scanned payload against stored profile record.
   * Authoritative lookup key is Person ID. Name is secondary verification.
   * Never falls back to searching by name.
   */
  static resolvePersonIdentity(
    parsed: QRPayload,
    person: { id: string; full_name: string } | null
  ): QRIdentityResolution {
    const personId = parsed.personId || (parsed.type === 'PERSON_IDENTITY' ? parsed.id : '');
    const qrName = parsed.personName || '';

    if (!parsed.isValid || parsed.type !== 'PERSON_IDENTITY' || !personId) {
      return { status: 'PERSON_NOT_FOUND', personId: personId || parsed.id, qrName };
    }

    if (!person || person.id !== personId) {
      return { status: 'PERSON_NOT_FOUND', personId, qrName };
    }

    if (!qrName || person.full_name.trim() !== qrName.trim()) {
      return { status: 'IDENTITY_MISMATCH', personId, qrName, actualName: person.full_name };
    }

    return { status: 'MATCH', personId, qrName, actualName: person.full_name };
  }

  static formatTraineePayload(traineeId: string, _groupId?: number, username?: string): string {
    return serializePersonQR(username || 'Trainee', traineeId);
  }

  /**
   * Scan QR code using Camera Scanner / BarcodeDetector seam.
   */
  static async scan(_options: QRScanOptions = {}): Promise<QRScanResult> {
    const p = getPlatformInfo();

    // Future Native Adapter Seam (Capacitor Barcode Scanner)
    if (p.isNative && (window as unknown as { Capacitor?: { Plugins?: { BarcodeScanner?: any } } }).Capacitor?.Plugins?.BarcodeScanner) {
      const Scanner = (window as unknown as { Capacitor: { Plugins: { BarcodeScanner: any } } }).Capacitor.Plugins.BarcodeScanner;
      await Scanner.checkPermission({ force: true });
      const result = await Scanner.startScan();
      if (result.hasContent) {
        const parsed = this.parsePayload(result.content);
        return {
          rawValue: result.content,
          format: result.format || 'QR_CODE',
          parsedPayload: parsed,
        };
      }
      throw new Error('لم يتم رصد أي رمز QR');
    }

    // Web execution: SSR guard
    if (typeof window === 'undefined') {
      throw new Error('Cannot scan during SSR');
    }

    // Web Browser Seam: Native BarcodeDetector if available
    if ('BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });

        const video = document.createElement('video');
        video.srcObject = mediaStream;
        video.playsInline = true;
        await video.play();

        const barcodes = await detector.detect(video);
        mediaStream.getTracks().forEach((track) => track.stop());

        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          const raw = barcodes[0].rawValue;
          return {
            rawValue: raw,
            format: 'QR_CODE',
            parsedPayload: this.parsePayload(raw),
          };
        }
      } catch (err) {
        // Fallback gracefully if camera stream or detector throws
      }
    }

    throw new Error('WEB_SCANNER_REQUIRES_UI_MODAL');
  }
}

