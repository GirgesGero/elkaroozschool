/**
 * EL KAROOZ SCHOOL — Self-Hosted Backend Client Adapter
 * 
 * Drop-in Supabase-compatible client adapter that communicates directly with
 * the self-hosted PHP/SQLite/MySQL backend on Hostinger instead of Supabase Cloud.
 * 
 * Supports:
 * - Fluent Query Builder: .from(table).select().eq().order().limit().single()
 * - Mutations: .insert(), .update(), .delete()
 * - Authentication: .auth.signInWithPassword(), .auth.signOut(), .auth.getUser(), .auth.getSession()
 * - Stored Procedures: .rpc(name, params)
 * - Channel / Realtime fallback stubs
 */

import { phpApiBaseUrl } from '@/lib/api/php';

interface SessionData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: number;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    group_id: number | null;
    user_metadata: Record<string, any>;
    app_metadata: Record<string, any>;
  };
}

const STORAGE_KEY = 'elkarooz_self_hosted_session';
const listeners = new Set<(event: string, session: any) => void>();

function getStoredSession(): SessionData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredSession(session: SessionData | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

function getApiBaseUrl(): string {
  try {
    return phpApiBaseUrl();
  } catch {
    return 'https://elkaroozschool.is-best.net';
  }
}

let refreshPromise: Promise<SessionData | null> | null = null;

async function ensureFreshSession(): Promise<SessionData | null> {
  const session = getStoredSession();
  if (!session) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (session.expires_at && session.expires_at - nowSec > 60) {
    return session;
  }

  if (!session.refresh_token) {
    return session;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ refresh_token: session.refresh_token }),
        });
        const json = await res.json();
        if (!res.ok || json.success === false || json.status === 'error' || !json.data?.access_token) {
          setStoredSession(null);
          listeners.forEach((fn) => fn('SIGNED_OUT', null));
          return null;
        }
        const rawData = json.data;
        const updated: SessionData = {
          access_token: rawData.access_token,
          refresh_token: rawData.refresh_token || session.refresh_token,
          token_type: rawData.token_type || 'bearer',
          expires_at: Math.floor(Date.now() / 1000) + (rawData.expires_in || 3600),
          user: session.user,
        };
        setStoredSession(updated);
        listeners.forEach((fn) => fn('TOKEN_REFRESHED', updated));
        return updated;
      } catch {
        return session;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

class QueryBuilder<T = any> implements PromiseLike<{ data: T | null; error: any; count?: number | null }> {
  private table: string;
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private fields: string = '*';
  private payload: any = null;
  private filters: Record<string, any> = {};
  private orderCol?: string;
  private orderAsc: boolean = false;
  private limitCount?: number;
  private offsetCount?: number;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(fields: string = '*', options?: { count?: 'exact' | 'planned' | 'estimated' }): this {
    this.action = 'select';
    this.fields = fields;
    return this;
  }

  insert(values: any): this {
    this.action = 'insert';
    this.payload = values;
    return this;
  }

  update(values: any): this {
    this.action = 'update';
    this.payload = values;
    return this;
  }

  delete(): this {
    this.action = 'delete';
    return this;
  }

  eq(column: string, value: any): this {
    this.filters[column] = value;
    return this;
  }

  neq(column: string, value: any): this {
    this.filters[`${column}!neq`] = value;
    return this;
  }

  is(column: string, value: any): this {
    if (value === null) {
      this.filters[`${column}!is`] = 'null';
    } else {
      this.filters[column] = value;
    }
    return this;
  }

  in(column: string, values: any[]): this {
    this.filters[`${column}!in`] = values.join(',');
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderCol = column;
    this.orderAsc = options?.ascending ?? false;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number): this {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  single(): this {
    this.isSingle = true;
    this.limitCount = 1;
    return this;
  }

  maybeSingle(): this {
    this.isMaybeSingle = true;
    this.limitCount = 1;
    return this;
  }

  async then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: T | null; error: any; count?: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    const session = await ensureFreshSession();
    const token = session?.access_token || '';
    const baseUrl = getApiBaseUrl();

    try {
      let url = `${baseUrl}/api/data/${this.table}`;
      const params = new URLSearchParams();

      if (this.orderCol) {
        params.append('order', `${this.orderCol}.${this.orderAsc ? 'asc' : 'desc'}`);
      }
      if (this.limitCount !== undefined) {
        params.append('limit', String(this.limitCount));
      }
      if (this.offsetCount !== undefined) {
        params.append('offset', String(this.offsetCount));
      }

      for (const [k, v] of Object.entries(this.filters)) {
        params.append(k, String(v));
      }

      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      let method = 'GET';
      let body: string | undefined = undefined;

      if (this.action === 'insert') {
        method = 'POST';
        body = JSON.stringify(this.payload);
      } else if (this.action === 'update') {
        method = 'PATCH';
        const id = this.filters['id'];
        if (id) {
          url = `${baseUrl}/api/data/${this.table}/${encodeURIComponent(id)}`;
        }
        body = JSON.stringify(this.payload);
      } else if (this.action === 'delete') {
        method = 'DELETE';
        const id = this.filters['id'];
        if (id) {
          url = `${baseUrl}/api/data/${this.table}/${encodeURIComponent(id)}`;
        }
      }

      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (body) {
        headers['Content-Type'] = 'application/json';
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['X-Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, { method, headers, body, cache: 'no-store' });
      const json = await response.json();

      if (!response.ok || json.success === false || json.status === 'error') {
        const error = {
          message: json.error?.message || json.message || 'Database request failed',
          code: json.error?.code || json.code || 'DB_ERROR',
          status: response.status,
        };
        const res = { data: null, error, count: 0 };
        return onfulfilled ? onfulfilled(res) : (res as any);
      }

      let data = json.data?.data ?? json.data ?? null;
      const count = json.data?.total ?? (Array.isArray(data) ? data.length : null);

      if (this.isSingle) {
        if (Array.isArray(data)) {
          data = data[0] ?? null;
        }
        if (!data) {
          const res = { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
          return onfulfilled ? onfulfilled(res as any) : (res as any);
        }
      } else if (this.isMaybeSingle) {
        if (Array.isArray(data)) {
          data = data[0] ?? null;
        }
      }

      const res = { data, error: null, count };
      return onfulfilled ? onfulfilled(res) : (res as any);
    } catch (err: any) {
      const res = { data: null, error: { message: err?.message || 'Network error' }, count: 0 };
      return onfulfilled ? onfulfilled(res) : (res as any);
    }
  }
}

export function createSelfHostedClient(): any {
  return {
    from: (table: string) => new QueryBuilder(table),

    auth: {
      async signInWithPassword({ email, password }: { email: string; password?: string }) {
        const baseUrl = getApiBaseUrl();
        try {
          const res = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ username: email, password }),
          });
          const json = await res.json();
          if (!res.ok || json.success === false || json.status === 'error') {
            return { data: { user: null, session: null }, error: { message: json.error?.message || json.message || 'فشل تسجيل الدخول' } };
          }

          const rawData = json.data;
          const user = {
            id: rawData.user.id,
            email: rawData.user.email,
            username: rawData.user.username,
            role: rawData.user.role,
            group_id: rawData.user.group_id,
            user_metadata: {
              full_name: rawData.user.full_name,
              username: rawData.user.username,
              role: rawData.user.role,
              group_id: rawData.user.group_id,
              avatar_url: rawData.user.avatar_url,
            },
            app_metadata: {
              provider: 'self_hosted',
              role: rawData.user.role,
            },
          };

          const session: SessionData = {
            access_token: rawData.access_token,
            refresh_token: rawData.refresh_token,
            token_type: rawData.token_type || 'bearer',
            expires_at: Math.floor(Date.now() / 1000) + (rawData.expires_in || 3600),
            user,
          };

          setStoredSession(session);
          listeners.forEach((fn) => fn('SIGNED_IN', session));

          return { data: { user, session }, error: null };
        } catch (err: any) {
          return { data: { user: null, session: null }, error: { message: err?.message || 'تعذر الاتصال بالخادم' } };
        }
      },

      async signOut() {
        const session = getStoredSession();
        if (session?.refresh_token) {
          try {
            const baseUrl = getApiBaseUrl();
            await fetch(`${baseUrl}/api/auth/logout`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: session.refresh_token }),
            });
          } catch {
            // ignore network failure on logout
          }
        }
        setStoredSession(null);
        listeners.forEach((fn) => fn('SIGNED_OUT', null));
        return { error: null };
      },

      async getUser() {
        const session = await ensureFreshSession();
        return { data: { user: session?.user ?? null }, error: null };
      },

      async getSession() {
        const session = await ensureFreshSession();
        return { data: { session: session ?? null }, error: null };
      },

      onAuthStateChange(callback: (event: string, session: any) => void) {
        listeners.add(callback);
        const session = getStoredSession();
        if (session) {
          callback('INITIAL_SESSION', session);
        }
        return {
          data: {
            subscription: {
              unsubscribe: () => listeners.delete(callback),
            },
          },
        };
      },
    },

    async rpc(functionName: string, params?: Record<string, any>) {
      const baseUrl = getApiBaseUrl();
      const session = await ensureFreshSession();
      try {
        const res = await fetch(`${baseUrl}/api/rpc/${functionName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify(params || {}),
        });
        const json = await res.json();
        if (!res.ok || json.success === false || json.status === 'error') {
          return { data: null, error: { message: json.error?.message || json.message || 'RPC Failed' } };
        }
        return { data: json.data, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err?.message || 'Network Error' } };
      }
    },

    channel(name: string) {
      return {
        on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
        subscribe: () => ({ unsubscribe: () => {} }),
      };
    },

    removeChannel() {
      // no-op stub for realtime channel cleanup
    },
  };
}
