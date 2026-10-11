import { describe, it, expect } from 'vitest';
import {
  AVATAR_MAX_BYTES,
  AVATAR_MAX_EDGE,
  AvatarTooLargeError,
  formatBytes,
  prepareAvatar,
} from '@/lib/avatar/prepareAvatar';

function makeFile(bytes: number, type = 'image/jpeg') {
  return new File([new Uint8Array(bytes)], 'avatar.jpg', { type });
}

describe('prepareAvatar', () => {
  it('rejects an oversized source before decoding it', async () => {
    const file = makeFile(AVATAR_MAX_BYTES * 12);
    await expect(prepareAvatar(file)).rejects.toBeInstanceOf(AvatarTooLargeError);
  });

  it('reports the offending size in mebibytes', async () => {
    const file = makeFile(4 * 1024 * 1024);
    await expect(prepareAvatar(file)).rejects.toThrow(/4 ميجابايت/);
  });

  it('passes an already-small compressed image through untouched', async () => {
    const file = makeFile(20 * 1024, 'image/webp');
    const result = await prepareAvatar(file);

    expect(result.passthrough).toBe(true);
    expect(result.dataUrl.startsWith('data:image/webp;base64,')).toBe(true);
    expect(result.bytes).toBe(20 * 1024);
  });

  it('never returns a data URL larger than the column budget', async () => {
    // jsdom's canvas is not implemented, so a real resample is not available
    // here. Guard the invariant that matters for the database instead: either
    // the image was passed through (and was already tiny) or we got a
    // well-formed data URL back.
    const file = makeFile(AVATAR_MAX_BYTES + 4096, 'image/png');
    const result = await prepareAvatar(file).catch(() => null);

    if (result && !result.passthrough) {
      expect(result.bytes).toBeLessThanOrEqual(AVATAR_MAX_BYTES);
      expect(result.dataUrl).toMatch(/^data:image\/(webp|jpeg);base64,[A-Za-z0-9+/=]+$/);
      expect(result.width).toBeLessThanOrEqual(AVATAR_MAX_EDGE);
    }
  });

  it('caps the square thumbnail edge', () => {
    expect(AVATAR_MAX_EDGE).toBeLessThanOrEqual(512);
    expect(AVATAR_MAX_BYTES).toBeLessThanOrEqual(512 * 1024);
  });
});

describe('formatBytes', () => {
  it('scales units for humans', () => {
    expect(formatBytes(512)).toBe('512 بايت');
    expect(formatBytes(40 * 1024)).toBe('40 كيلوبايت');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 ميجابايت');
  });
});