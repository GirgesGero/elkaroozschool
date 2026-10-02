import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

/**
 * Suite 5 -- the service worker's notification handling.
 *
 * The worker runs no framework and has no imports, so it can be evaluated directly
 * against a stub `self`. That makes the two hazards it carries testable without a
 * browser: an unvalidated push target, and a malformed payload killing the handler.
 *
 * Both are reachable from outside the app. A notification's target is opened as a
 * window by the click handler, so an unchecked `action_url` is a stored XSS against
 * every user who taps the notification.
 */

const swPath = resolve(__dirname, '..', 'public', 'sw.js');
const source = readFileSync(swPath, 'utf8');

interface Handler {
  (event: unknown): void;
}

/** Evaluate the worker with stubbed globals and return its registered handlers. */
function loadWorker(): { handlers: Map<string, Handler>; calls: Record<string, unknown[]> } {
  const handlers = new Map<string, Handler>();
  const calls: Record<string, unknown[]> = {};

  const registration = {
    showNotification: (title: string, options: unknown) => {
      calls.notifications = [...(calls.notifications ?? []), { title, options }];
      return Promise.resolve();
    },
  };

  const self = {
    addEventListener: (type: string, fn: Handler) => handlers.set(type, fn),
    skipWaiting: () => {},
    clients: { claim: () => {}, matchAll: () => Promise.resolve([]) },
    registration,
    caches: {
      open: () => Promise.resolve({ addAll: () => Promise.resolve() }),
      keys: () => Promise.resolve([]),
      delete: () => Promise.resolve(true),
    },
  };

  const sandbox: Record<string, unknown> = {
    self,
    clients: self.clients,
    caches: self.caches,
    URL,
    Promise,
    console,
  };
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);

  return { handlers, calls };
}

/** Fire the push handler with a payload and read back what was displayed. */
function firePush(payload: unknown | undefined): { title: string; options: Record<string, unknown> } | undefined {
  const { handlers, calls } = loadWorker();
  const onPush = handlers.get('push');
  expect(onPush, 'no push handler registered').toBeTruthy();

  const waitUntil = (p: unknown) => {
    void p;
  };
  const event = payload === undefined
    ? { waitUntil }
    : {
        waitUntil,
        data: { json: () => JSON.parse(payload as string) },
      };

  onPush!({ ...event });
  const shown = calls.notifications as { title: string; options: Record<string, unknown> }[] | undefined;
  return shown?.[0];
}

describe('service worker registration', () => {
  it('registers install, activate and push handlers', () => {
    const { handlers } = loadWorker();
    expect(handlers.has('install')).toBe(true);
    expect(handlers.has('activate')).toBe(true);
    expect(handlers.has('push')).toBe(true);
    expect(handlers.has('notificationclick')).toBe(true);
  });

  it('does not intercept network requests', () => {
    // A cache strategy over an authenticated app leaks one user's rendered pages to
    // the next person on a shared device. Its absence is a security property.
    const { handlers } = loadWorker();
    expect(handlers.has('fetch')).toBe(false);
  });
});

describe('push notifications survive a hostile or broken payload', () => {
  it('shows a notification for a well-formed payload', () => {
    const shown = firePush(JSON.stringify({ title: 'اختبار', body: 'نص', action_url: '/attendance' }));
    expect(shown?.title).toBe('اختبار');
    expect((shown?.options as Record<string, unknown>).body).toBe('نص');
  });

  it('still notifies when the payload is not valid JSON', () => {
    // A throw here would take down the handler and drop the notification silently.
    const { handlers, calls } = loadWorker();
    const onPush = handlers.get('push')!;
    expect(() => {
      onPush({ waitUntil: () => {}, data: { json: () => { throw new SyntaxError('Unexpected token <'); } } });
    }).not.toThrow();
    expect(calls.notifications).toHaveLength(1);
  });

  it('still notifies when there is no payload at all', () => {
    const shown = firePush(undefined);
    expect(shown?.title).toBeTruthy();
  });

  it('does not throw when the payload is JSON but not an object', () => {
    const shown = firePush(JSON.stringify('just a string'));
    expect(shown).toBeTruthy();
    expect(typeof (shown?.options as Record<string, unknown>).body).toBe('string');
  });

  it('renders an Arabic notification with no title in the payload', () => {
    const shown = firePush(JSON.stringify({}));
    expect(shown?.title).toMatch(/[\u0600-\u06FF]/);
  });
});

describe('a notification cannot be pointed at an attacker-controlled target', () => {
  const targetOf = (payload: unknown) =>
    ((firePush(JSON.stringify(payload))?.options as Record<string, unknown>).data as
      Record<string, unknown>).url;

  it('keeps an ordinary in-app path', () => {
    expect(targetOf({ action_url: '/attendance' })).toBe('/attendance');
  });

  it('falls back to the root when no target is given', () => {
    expect(targetOf({})).toBe('/');
  });

  // Each of these would be opened by clients.openWindow() on tap.
  const hostile = [
    'javascript:alert(document.cookie)',
    '//evil.test/steal',
    'https://evil.test/steal',
    'http://evil.test',
    'data:text/html,<script>alert(1)</script>',
    'attendance',              // relative, not rooted
    '',
  ];

  for (const value of hostile) {
    it(`refuses ${JSON.stringify(value)}`, () => {
      const url = targetOf({ action_url: value });
      expect(url, `"${value}" was accepted as a notification target`).toBe('/');
      expect(String(url)).not.toMatch(/^[a-z]+:/i);
      expect(String(url)).not.toContain('//');
    });
  }

  it('refuses a non-string target', () => {
    for (const value of [null, 42, {}, ['/a'], true]) {
      expect(targetOf({ action_url: value })).toBe('/');
    }
  });
});

describe('notification presentation', () => {
  it('points at square icons, since a non-square bitmap is letterboxed by the platform', () => {
    const shown = firePush(JSON.stringify({ title: 'x' }));
    const icon = (shown?.options as Record<string, unknown>).icon as string;
    const badge = (shown?.options as Record<string, unknown>).badge as string;
    expect(icon).toBe('/icons/icon-192x192.png');
    expect(badge).toBe('/icons/icon-192x192-maskable.png');
  });

  it('sets RTL and Arabic, since every notification is Arabic', () => {
    const options = firePush(JSON.stringify({ title: 'x' }))?.options as Record<string, unknown>;
    expect(options.dir).toBe('rtl');
    expect(options.lang).toBe('ar');
  });
});

describe('precache list', () => {
  /** Load the worker with a caches stub that records what addAll was asked to cache. */
  function capturedPrecache(): Promise<string[]> {
    const captured: string[] = [];
    const stub = {
      open: () => Promise.resolve({ addAll: (list: string[]) => { captured.push(...list); return Promise.resolve(); } }),
      keys: () => Promise.resolve([]),
      delete: () => Promise.resolve(true),
    };
    const handlers = new Map<string, Handler>();
    const self = {
      addEventListener: (t: string, fn: Handler) => handlers.set(t, fn),
      skipWaiting: () => {},
      caches: stub,
      registration: { showNotification: () => Promise.resolve() },
      clients: { claim: () => {}, matchAll: () => Promise.resolve([]) },
    };
    const sb: Record<string, unknown> = { self, clients: self.clients, caches: stub, URL, Promise, console };
    sb.globalThis = sb;
    vm.createContext(sb);
    vm.runInContext(source, sb);
    handlers.get('install')!({ waitUntil: (p: unknown) => { void p; } });
    // addAll runs inside a promise chain, so read the capture after it settles.
    return Promise.resolve().then(() => captured);
  }

  it('does not precache the 264 KB master logo', async () => {
    // A precache is paid on every install, on a metered mobile connection. The 512 icon
    // is the largest asset an install actually needs.
    expect(await capturedPrecache()).not.toContain('/logo.png');
  });

  it('precaches the icon and the manifest it declares', async () => {
    const list = await capturedPrecache();
    expect(list).toContain('/manifest.json');
    expect(list).toContain('/icons/icon-512x512.png');
  });

  it('precaches only files that exist in public/', async () => {
    for (const asset of await capturedPrecache()) {
      if (asset === '/') continue; // the app root is served by Next, not a static file
      const path = resolve(__dirname, '..', 'public', asset.replace(/^\//, ''));
      expect(() => readFileSync(path), `${asset} is precached but missing`).not.toThrow();
    }
  });
});
