import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Suite 4 -- the PWA manifest must actually be installable.
 *
 * The manifest declared a 723x1024 PNG as both a 192x192 and a 512x512 icon. Browsers
 * compare the declared size against the decoded image and suppress the install prompt
 * on a mismatch, so the app looked installable in the manifest and was not installable
 * in the browser -- and nothing in the build or the test suite reported it.
 *
 * Reading PNG dimensions out of the IHDR chunk is the only way to catch this in CI.
 * The alternative, trusting the `sizes` field, is precisely what was wrong before.
 */

const publicDir = resolve(__dirname, '..', 'public');

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}
interface Manifest {
  name: string;
  short_name: string;
  start_url: string;
  display: string;
  lang: string;
  dir: string;
  icons: ManifestIcon[];
}

/** Decode width/height from a PNG's IHDR chunk, without an image library. */
function pngSize(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  // 8-byte PNG signature, then an IHDR chunk whose data starts at byte 16.
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buf.subarray(0, 8).equals(signature)) throw new Error(`${path} is not a PNG`);
  if (buf.toString('ascii', 12, 16) !== 'IHDR') throw new Error(`${path} has no IHDR chunk`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const manifest = JSON.parse(
  readFileSync(resolve(publicDir, 'manifest.json'), 'utf8'),
) as Manifest;

describe('PWA manifest', () => {
  it('parses as JSON', () => {
    expect(manifest).toBeTruthy();
    expect(typeof manifest.name).toBe('string');
    expect(typeof manifest.start_url).toBe('string');
  });

  it('is configured for an Arabic RTL standalone app', () => {
    expect(manifest.display).toBe('standalone');
    expect(manifest.lang).toBe('ar');
    expect(manifest.dir).toBe('rtl');
  });

  it('declares at least one icon', () => {
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  it('points every icon at a file that exists', () => {
    for (const icon of manifest.icons) {
      const path = resolve(publicDir, icon.src.replace(/^\//, ''));
      expect(existsSync(path), `${icon.src} is declared but missing from public/`).toBe(true);
    }
  });

  // The regression this suite exists for.
  it('declares each icon at the size the file actually is', () => {
    for (const icon of manifest.icons) {
      const path = resolve(publicDir, icon.src.replace(/^\//, ''));
      const actual = pngSize(path);
      const declared = icon.sizes.replace(/x$/, '').split('x').map(Number);

      expect(actual.width, `${icon.src} is ${actual.width}px wide, not ${declared[0]}px`)
        .toBe(declared[0]);
      expect(actual.height, `${icon.src} is ${actual.height}px tall, not ${declared[1]}px`)
        .toBe(declared[1]);
    }
  });

  it('declares square icons, since an icon set cannot be scaled from a non-square bitmap', () => {
    for (const icon of manifest.icons) {
      const path = resolve(publicDir, icon.src.replace(/^\//, ''));
      const { width, height } = pngSize(path);
      expect(width, `${icon.src} is not square`).toBe(height);
    }
  });

  it('provides the 192 and 512 sizes the install prompt requires', () => {
    const sizes = new Set(manifest.icons.map((i) => i.sizes));
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });

  it('provides a maskable icon, which Android needs to avoid cropping the logo', () => {
    const maskable = manifest.icons.filter((i) => i.purpose?.includes('maskable'));
    expect(maskable.length).toBeGreaterThan(0);
  });

  it('does not reuse one file for two different declared sizes', () => {
    // One bitmap cannot be 192 and 512 at once; the OS scales the decoded image, so a
    // 192-declared 512 file renders soft. Each size needs its own file.
    //
    // Keyed on size *and* purpose, because an `any` and a `maskable` variant at the
    // same size are deliberately different files -- the maskable one has its corners
    // knocked out.
    const bySizeAndPurpose = new Map<string, string>();
    for (const icon of manifest.icons) {
      const key = `${icon.sizes}|${icon.purpose ?? 'any'}`;
      const seen = bySizeAndPurpose.get(key);
      expect(seen, `${key} is declared by both ${seen} and ${icon.src}`).toBeUndefined();
      bySizeAndPurpose.set(key, icon.src);
    }
  });

  it('registers a service worker', () => {
    expect(existsSync(resolve(publicDir, 'sw.js'))).toBe(true);
  });
});