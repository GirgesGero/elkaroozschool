'use client';

import Image from 'next/image';
import { useState } from 'react';

const OPTIMIZED_IMAGE_HOSTS = new Set([
  'kgqgnqjkrghvktymbimz.supabase.co',
  'elkaroozschool.is-best.net',
]);

export function isNextImageOptimizable(src: string): boolean {
  if (!src) return false;
  const trimmed = src.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' && OPTIMIZED_IMAGE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function isRenderableImageUrl(src: string): boolean {
  if (!src) return false;
  const trimmed = src.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * An avatar that renders whatever the database actually holds.
 *
 * `profiles.avatar_url` has been used for three different things across the
 * app's life: a plain https URL, nothing at all, and — as it does right now —
 * a full `data:image/png;base64,...` payload pasted straight into the column.
 * That last form is several megabytes of base64 in a text field.
 *
 * `next/image` refuses `data:` URLs by design (its optimizer only proxies
 * remote http(s) sources), so every `<Image src={avatar_url}>` in the app
 * silently rendered nothing for such a profile. Routing all avatars through
 * this component means one place decides:
 *   - data: URL  -> plain <img>, no optimizer
 *   - http(s)    -> next/image, still optimized
 *   - missing    -> the initial on a themed disc, never a broken image
 *
 * It also guards the load: a bad remote URL now falls back to the initial
 * instead of showing Next's broken-image glyph.
 */
export default function Avatar({
  src,
  name,
  size = 40,
  className = '',
  rounded = 'rounded-xl',
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
  rounded?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initial = (name || '؟').trim().charAt(0) || '؟';
  const usable = typeof src === 'string' && src.trim().length > 0 && !failed;

  const shell =
    `${rounded} overflow-hidden shrink-0 ` +
    `bg-gradient-to-br from-brand/25 to-info/20 border border-line ` +
    `text-brand font-black flex items-center justify-center ${className}`;

  if (!usable) {
    return (
      <span
        className={shell}
        style={{ width: size, height: size, fontSize: Math.max(12, size * 0.42) }}
        aria-hidden="true"
      >
        {initial}
      </span>
    );
  }

  const trimmedSrc = src!.trim();
  const isDataUrl = trimmedSrc.startsWith('data:');

  if (isDataUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={trimmedSrc}
        alt={name || 'صورة شخصية'}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className={`${rounded} object-cover shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  if (!isRenderableImageUrl(trimmedSrc)) {
    return (
      <span
        className={shell}
        style={{ width: size, height: size, fontSize: Math.max(12, size * 0.42) }}
        aria-hidden="true"
      >
        {initial}
      </span>
    );
  }

  return (
    <Image
      src={trimmedSrc}
      alt={name || 'صورة شخصية'}
      width={size}
      height={size}
      unoptimized={!isNextImageOptimizable(trimmedSrc)}
      onError={() => setFailed(true)}
      className={`${rounded} object-cover shrink-0 ${className}`}
    />
  );
}