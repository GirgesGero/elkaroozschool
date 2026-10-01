/**
 * Single gateway to the PHP backend.
 *
 * This is the ONLY place allowed to talk to the PHP API. Pages import from here so
 * that there is one contract to audit, one place to attach the bearer token, and one
 * place where a failure can be turned into an error the user actually sees.
 *
 * The PHP API speaks this envelope (see backend-api/src/Utils/Response.php):
 *   success -> { status: 'success', message: string, data: any }
 *   failure -> { status: 'error',   code: string,   message: string, details?: any }
 *
 * A "success" message from the caller is therefore only ever produced from a real
 * HTTP 200 with status === 'success'. That is the whole point: the previous backup UI
 * reported success without ever reaching the backend.
 */
import type { Session } from '@supabase/supabase-js';

export class PhpApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'PhpApiError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Resolved lazily so a build without PHP_API_URL configured still compiles. When it is
 * missing the caller gets a clear, actionable error instead of a silent no-op.
 */
function phpApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_PHP_API_URL;
  if (!raw || !raw.trim()) {
    throw new PhpApiError(
      'خادم الـAPI غير مُعرَّف. راجع إعداد NEXT_PUBLIC_PHP_API_URL ثم أعد النشر.',
      'PHP_API_URL_MISSING',
      0,
    );
  }
  return raw.replace(/\/+$/, '');
}

interface RequestOptions {
  /** Supabase session, used to forward the caller's own JWT. */
  session?: Session | null;
  body?: unknown;
  /** Multipart upload — sets its own Content-Type. */
  formData?: FormData;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Abort after this many milliseconds. Defaults to 120s: a real backup is slow. */
  timeoutMs?: number;
}

/**
 * Performs the request and normalises every outcome — HTTP error, network failure,
 * unparseable body — into a thrown PhpApiError carrying an Arabic message.
 */
export async function phpApi<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { session, body, formData, method = 'POST', timeoutMs = 120_000 } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };

  // Forward the real user's JWT. Never substitute a service-role token: the backend
  // derives the acting user from these claims and enforces RBAC on them.
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  if (body !== undefined && !formData) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${phpApiBaseUrl()}${path}`, {
      method,
      headers,
      signal: controller.signal,
      cache: 'no-store',
      ...(formData ? { body: formData } : body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === 'AbortError';
    throw new PhpApiError(
      aborted
        ? 'انتهت مهلة الاتصال بالخادم. العملية قد تكون ما زالت تعمل في الخلفية.'
        : 'تعذّر الاتصال بخادم الـAPI. تحقق من الاتصال وحاول مرة أخرى.',
      aborted ? 'PHP_API_TIMEOUT' : 'PHP_API_UNREACHABLE',
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  let payload: { status?: string; code?: string; message?: string; data?: T } | null = null;
  try {
    payload = await response.json();
  } catch {
    // A non-JSON body means we are not talking to the PHP API (proxy error page, etc).
    throw new PhpApiError(
      `استجابة غير متوقعة من الخادم (HTTP ${response.status}).`,
      'PHP_API_BAD_RESPONSE',
      response.status,
    );
  }

  if (!response.ok || payload?.status !== 'success') {
    throw new PhpApiError(
      payload?.message || `فشل الطلب (HTTP ${response.status}).`,
      payload?.code || 'PHP_API_ERROR',
      response.status,
    );
  }

  return payload.data as T;
}

// ---- Backend payload shapes (mirrored from the PHP controllers) -------------------

export interface BackupCreateResult {
  backup_id: string;
  filename: string;
  file_size_bytes: number;
  checksum_sha256: string;
  files_included: number;
  includes_database: boolean;
  database_tables?: number;
  database_rows?: number;
}

export interface RestorePreviewResult {
  valid: boolean;
  mode?: string;
  includes_database?: boolean;
  has_rollback?: boolean;
  tables?: string[];
  file_count?: number;
  message?: string;
}

export interface RestoreExecuteResult {
  mode: string;
  restored_tables?: number;
  restored_files?: number;
  rolled_back?: boolean;
}
