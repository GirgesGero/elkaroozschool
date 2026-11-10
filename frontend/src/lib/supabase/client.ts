import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSelfHostedClient } from '@/lib/self-hosted/client';

/**
 * Lazily-initialised browser Supabase client.
 *
 * Supports dual-mode:
 * 1. Cloud mode: Supabase Cloud (when NEXT_PUBLIC_SUPABASE_URL is provided)
 * 2. Self-Hosted mode: Hostinger/local backend (when NEXT_PUBLIC_DATABASE_DRIVER === 'self_hosted'
 *    or NEXT_PUBLIC_SUPABASE_URL is omitted or 'self_hosted')
 */
let sharedBrowserInstance: SupabaseClient | null = null;
let sharedProxyInstance: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (typeof window !== 'undefined' && sharedProxyInstance) {
    return sharedProxyInstance;
  }

  let real: SupabaseClient | null = null;

  const resolve = (): SupabaseClient => {
    if (typeof window !== 'undefined' && sharedBrowserInstance) {
      return sharedBrowserInstance;
    }
    if (!real) {
      const isSelfHosted =
        process.env.NEXT_PUBLIC_DATABASE_DRIVER === 'self_hosted' ||
        process.env.NEXT_PUBLIC_SUPABASE_URL === 'self_hosted';

      if (isSelfHosted) {
        real = createSelfHostedClient() as SupabaseClient;
      } else {
        real = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
      }
      if (typeof window !== 'undefined') {
        sharedBrowserInstance = real;
      }
    }
    return real;
  };

  const proxy = new Proxy({} as SupabaseClient, {
    get(_target, prop, receiver) {
      const value = Reflect.get(resolve() as object, prop, receiver);
      return typeof value === 'function' ? value.bind(resolve()) : value;
    },
  });

  if (typeof window !== 'undefined') {
    sharedProxyInstance = proxy;
  }

  return proxy;
}
