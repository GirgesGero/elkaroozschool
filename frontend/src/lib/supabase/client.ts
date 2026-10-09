import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Lazily-initialised browser Supabase client.
 *
 * Why lazy: several pages call `createClient()` directly in the render body.
 * Next.js prerenders those routes at build time, where NEXT_PUBLIC_SUPABASE_*
 * is not necessarily present. Constructing the real client eagerly throws
 * during prerender and fails the entire production build.
 *
 * The real client is built on first property access, which only happens inside
 * effects/handlers — never during prerender. If the env vars are genuinely
 * missing at runtime the original @supabase/ssr error is still raised, just at
 * the point of actual use.
 */
export function createClient(): SupabaseClient {
  let real: SupabaseClient | null = null;

  const resolve = (): SupabaseClient => {
    if (!real) {
      real = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }
    return real;
  };

  return new Proxy({} as SupabaseClient, {
    get(_target, prop, receiver) {
      const value = Reflect.get(resolve() as object, prop, receiver);
      return typeof value === 'function' ? value.bind(resolve()) : value;
    },
  });
}
