import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { phpApi, PhpApiError } from '@/lib/api/php';

/**
 * Suite for the single PHP gateway.
 *
 * This module is the one place the frontend is allowed to talk to the PHP backend, so
 * every request in the app inherits whatever it decides here. That makes its failure
 * modes unusually expensive:
 *
 *   - a success reported without the backend having been reached (the original bug)
 *   - a missing config silently becoming a no-op
 *   - a request that hangs forever with no operator-facing timeout
 *   - an error envelope surfacing as a raw HTTP code
 *
 * All of it is testable without a server by mocking fetch, which is why there is no
 * reason any of it should ship unverified.
 */

const BASE = 'https://php.example.test';

type FetchArgs = [input: string, init: RequestInit];

/** A fetch mock that resolves with the given JSON envelope and HTTP status. */
function respondWith(payload: unknown, status = 200) {
  return vi.fn(async () =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

/** A fetch mock whose body is not JSON -- a proxy error page, or an HTML 502. */
function respondWithHtml(status = 502) {
  return vi.fn(async () => new Response('<html>Bad Gateway</html>', { status }));
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env.NEXT_PUBLIC_PHP_API_URL = BASE;
  fetchMock = respondWith({ status: 'success', message: 'ok', data: { id: 7 } });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  delete process.env.NEXT_PUBLIC_PHP_API_URL;
});

const args = (): FetchArgs => fetchMock.mock.calls[0] as unknown as FetchArgs;

/**
 * Runs an operation expected to reject and returns the typed error.
 *
 * `.catch((e: unknown) => e as PhpApiError)` does not type the awaited result -- catch
 * infers its own return type from the callback, so the awaited value stays unknown and
 * tsc rejects every property access. This fails loudly if the call unexpectedly
 * resolves, which is what a silent pass here would mean.
 */
async function captureError(run: () => Promise<unknown>): Promise<PhpApiError> {
  try {
    const value = await run();
    throw new Error(`expected a PhpApiError, but it resolved with: ${JSON.stringify(value)}`);
  } catch (e) {
    if (!(e instanceof PhpApiError)) throw e;
    return e;
  }
}

describe('configuration', () => {
  it('fails loudly when the API URL is missing', async () => {
    // A silent no-op here is what let the backup UI claim success while never reaching
    // the server. An unconfigured gateway must be an error the operator can act on.
    delete process.env.NEXT_PUBLIC_PHP_API_URL;
    await expect(phpApi('/backup/create')).rejects.toThrow(PhpApiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the configuration error distinct from a network failure', async () => {
    // Asserted on the code, not just the error class: phpApiBaseUrl() used to be called
    // inside the request's try block, so a missing URL was caught and re-reported as
    // PHP_API_UNREACHABLE -- telling an operator to check their connection when the
    // actual problem is a missing environment variable. Both failures are PhpApiError,
    // so checking the class alone would not have caught it.
    delete process.env.NEXT_PUBLIC_PHP_API_URL;
    const err = await captureError(() => phpApi('/backup/create'));
    expect(err.code).toBe('PHP_API_URL_MISSING');
    expect(err.code).not.toBe('PHP_API_UNREACHABLE');
  });

  it('treats a whitespace-only URL as missing', async () => {
    // The emptiness check tested the trimmed string but the untrimmed one was returned,
    // so "   " survived and became a request to "   /backup/create".
    process.env.NEXT_PUBLIC_PHP_API_URL = '   ';
    await expect(phpApi('/backup/create')).rejects.toThrow(/غير مُعرَّف/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('trims a padded URL rather than requesting a host of spaces', async () => {
    process.env.NEXT_PUBLIC_PHP_API_URL = `  ${BASE}/  `;
    await phpApi('/backup/create');
    expect(args()[0]).toBe(`${BASE}/backup/create`);
  });

  it('strips trailing slashes so paths do not double up', async () => {
    // A base ending in "/" plus a path starting with "/" produces "//backup", which some
    // reverse proxies normalise and others route somewhere else entirely.
    process.env.NEXT_PUBLIC_PHP_API_URL = `${BASE}///`;
    await phpApi('/backup/create');
    expect(args()[0]).toBe(`${BASE}/backup/create`);
  });
});

describe('authentication', () => {
  it('forwards the caller\'s own JWT', async () => {
    await phpApi('/backup/create', {
      session: { access_token: 'user-jwt' } as never,
    });
    expect((args()[1].headers as Record<string, string>).Authorization).toBe(
      'Bearer user-jwt',
    );
  });

  it('sends no Authorization header when there is no session', async () => {
    // An unauthenticated request must be refused by the backend, not silently
    // authenticated as someone else.
    await phpApi('/backup/create', { session: null });
    expect((args()[1].headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('never sends a service-role style key', async () => {
    // The gateway must forward the user's token and nothing else. A service-role key in
    // the browser would bypass RLS for every visitor.
    await phpApi('/backup/create', {
      session: { access_token: 'user-jwt' } as never,
    });
    const headers = JSON.stringify(args()[1].headers).toLowerCase();
    expect(headers).not.toContain('service_role');
    expect(headers).not.toContain('apikey');
  });
});

describe('request shape', () => {
  it('serialises a JSON body and sets the content type', async () => {
    await phpApi('/backup/create', { body: { mode: 'full' } });
    expect(args()[1].body).toBe('{"mode":"full"}');
    expect((args()[1].headers as Record<string, string>)['Content-Type']).toBe(
      'application/json',
    );
  });

  it('leaves Content-Type alone for multipart, which carries its own boundary', async () => {
    // Setting application/json on FormData produces a body the server cannot parse.
    const form = new FormData();
    form.append('archive', new Blob(['x']), 'a.zip');
    await phpApi('/import/run', { formData: form });
    expect((args()[1].headers as Record<string, string>)['Content-Type']).toBeUndefined();
    expect(args()[1].body).toBe(form);
  });

  it('omits the body entirely when none is given', async () => {
    await phpApi('/backup/list', { method: 'GET' });
    expect(args()[1].body).toBeUndefined();
    expect(args()[1].method).toBe('GET');
  });

  it('never caches a response that may carry private data', async () => {
    await phpApi('/backup/list', { method: 'GET' });
    expect(args()[1].cache).toBe('no-store');
  });

  it('returns the data field of a success envelope', async () => {
    await expect(phpApi('/backup/list')).resolves.toEqual({ id: 7 });
  });
});

describe('failure is never reported as success', () => {
  it('throws when the envelope says error', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ status: 'error', code: 'FORBIDDEN', message: 'غير مصرح' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    await expect(phpApi('/backup/create')).rejects.toThrow('غير مصرح');
  });

  it('throws on HTTP 200 whose envelope is not a success', async () => {
    // The specific regression this gateway exists to prevent: a 200 with a body that
    // never came from Response::success() used to be read as "done".
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ status: 'weird', message: 'حسناً' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    await expect(phpApi('/backup/create')).rejects.toThrow(PhpApiError);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('throws on a 200 that carries no envelope at all', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ hello: 'world' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await expect(phpApi('/backup/create')).rejects.toThrow(PhpApiError);
  });

  it('throws on an empty 200 body', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 200 }));
    await expect(phpApi('/backup/create')).rejects.toThrow(PhpApiError);
  });

  it('preserves the backend error code and HTTP status for programmatic checks', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ status: 'error', code: 'RATE_LIMITED', message: 'كثير' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    // A caller that wants to show a specific message for 429 needs code and status
    // intact, not flattened into one string.
    const err = await captureError(() => phpApi('/backup/create'));
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.status).toBe(429);
  });

  it('reports a non-JSON body as a bad response, not as a network failure', async () => {
    // An HTML error page means a proxy or the host is in the way. Telling the operator
    // "check your connection" would send them in the wrong direction.
    fetchMock.mockResolvedValue(await respondWithHtml(502)());
    await expect(phpApi('/backup/create')).rejects.toThrow(/غير متوقعة/);
  });

  it('reports a network failure in Arabic', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await captureError(() => phpApi('/backup/create'));
    expect(err.code).toBe('PHP_API_UNREACHABLE');
    expect(err.message).toMatch(/تعذّر الاتصال/);
  });

  it('clears the timeout once a response arrives', async () => {
    // A 120s timer left pending per request keeps the Node process (and the test run)
    // alive long after the work finished.
    vi.useFakeTimers();
    await phpApi('/backup/list', { method: 'GET' });
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('timeouts', () => {
  it('aborts a hanging request and says the operation may still be running', async () => {
    // A backup that times out client-side has often still started on the server, so the
    // message must not claim it failed.
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    );

    const pending = phpApi('/backup/create', { timeoutMs: 5_000 });
    const assertion = expect(pending).rejects.toThrow(/قد تكون ما زالت تعمل/);
    await vi.advanceTimersByTimeAsync(5_001);
    await assertion;
  });

  it('clears the timeout after an abort too', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    );
    const pending = phpApi('/backup/create', { timeoutMs: 1_000 });
    const assertion = expect(pending).rejects.toThrow(PhpApiError);
    await vi.advanceTimersByTimeAsync(1_001);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('defaults to a long timeout, because a real backup is slow', async () => {
    vi.useFakeTimers();
    let seen: RequestInit | undefined;
    fetchMock.mockImplementation((_url: string, init: RequestInit) => {
      seen = init;
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        );
      });
    });
    const pending = phpApi('/backup/create');
    const assertion = expect(pending).rejects.toThrow(PhpApiError);

    // Still in flight well past any interactive timeout.
    await vi.advanceTimersByTimeAsync(119_000);
    expect(seen?.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(2_000);
    await assertion;
  });
});
