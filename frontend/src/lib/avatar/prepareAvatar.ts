/**
 * Client-side avatar preparation.
 *
 * The profile editor used to call `FileReader.readAsDataURL` and write the
 * whole file straight into `profiles.avatar_url` — a text column. A 3MB phone
 * photo became ~4MB of base64 in one row, and because `next/image` refuses
 * `data:` sources, the avatar then rendered blank everywhere in the app.
 *
 * There is no storage bucket on this project, so the column stays the
 * transport. What changes is the payload: downscale to a square thumbnail and
 * re-encode to WebP (falling back to JPEG) so the stored value is tens of KB
 * instead of megabytes. If a Supabase Storage bucket is ever added, this file
 * is the single place to swap the transport — every caller goes through it.
 */

export const AVATAR_MAX_EDGE = 512;
export const AVATAR_MAX_BYTES = 300 * 1024;
export const AVATAR_INPUT_MAX_BYTES = 3 * 1024 * 1024;

/** WebP first for size; JPEG is the universally safe fallback. */
const MIME_PREFERENCE = ['image/webp', 'image/jpeg'];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('تعذّر قراءة الصورة'));
    img.src = src;
  });
}

/** Scale into an `edge`-square, cropping the centre so a face survives. */
function drawSquare(ctx: CanvasRenderingContext2D, img: HTMLImageElement, edge: number) {
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  ctx.drawImage(img, sx, sy, side, side, 0, 0, edge, edge);
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('تعذّر ضغط الصورة، جرّب صورة أخرى'))),
      mime,
      quality,
    );
  });
}

async function canEncode(mime: string): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const probe = document.createElement('canvas');
  probe.width = 1;
  probe.height = 1;
  try {
    await canvasToBlob(probe, mime, 0.8);
    return true;
  } catch {
    return false;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('تعذّر قراءة الصورة'));
    r.readAsDataURL(blob);
  });
}

export interface PreparedAvatar {
  /** A `data:` URL small enough to live in a text column. */
  dataUrl: string;
  mime: string;
  bytes: number;
  width: number;
  height: number;
  /** True when the source was already small and compressed. */
  passthrough: boolean;
}

export class AvatarTooLargeError extends Error {
  constructor(public readonly mb: number) {
    super(`حجم الصورة ${mb} ميجابايت، الحد الأقصى 3 ميجابايت.`);
    this.name = 'AvatarTooLargeError';
  }
}

export async function prepareAvatar(file: File): Promise<PreparedAvatar> {
  if (file.size > AVATAR_INPUT_MAX_BYTES) {
    throw new AvatarTooLargeError(Math.round((file.size / 1024 / 1024) * 10) / 10);
  }

  // Already small and compressed: storing it as-is is cheaper than a resample.
  if (file.size <= 40 * 1024 && (file.type === 'image/webp' || file.type === 'image/jpeg')) {
    return {
      dataUrl: await blobToDataUrl(file),
      mime: file.type,
      bytes: file.size,
      width: 0,
      height: 0,
      passthrough: true,
    };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const edge = Math.min(AVATAR_MAX_EDGE, img.naturalWidth, img.naturalHeight) || AVATAR_MAX_EDGE;

    let mime = 'image/jpeg';
    for (const candidate of MIME_PREFERENCE) {
      if (await canEncode(candidate)) {
        mime = candidate;
        break;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = edge;
    canvas.height = edge;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('متصفحك لا يدعم معالجة الصور');

    // Step quality down until the thumbnail fits the column's budget.
    let blob: Blob | null = null;
    for (const q of [0.86, 0.78, 0.7, 0.62, 0.5]) {
      drawSquare(ctx, img, edge);
      blob = await canvasToBlob(canvas, mime, q);
      if (blob && blob.size <= AVATAR_MAX_BYTES) break;
    }

    if (!blob) throw new Error('تعذّر ضغط الصورة، جرّب صورة أخرى');

    // Last resort: shrink the square once more and retry.
    let finalBlob = blob;
    if (finalBlob && finalBlob.size > AVATAR_MAX_BYTES && edge > 256) {
      const small = Math.max(256, Math.round(edge * 0.75));
      canvas.width = small;
      canvas.height = small;
      ctx.clearRect(0, 0, small, small);
      drawSquare(ctx, img, small);
      finalBlob = await canvasToBlob(canvas, mime, 0.7);
    }
    if (!finalBlob) throw new Error('تعذّر ضغط الصورة، جرّب صورة أخرى');

    return {
      dataUrl: await blobToDataUrl(finalBlob),
      mime,
      bytes: finalBlob.size,
      width: canvas.width,
      height: canvas.height,
      passthrough: false,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} كيلوبايت`;
  return `${(bytes / 1024 / 1024).toFixed(1)} ميجابايت`;
}