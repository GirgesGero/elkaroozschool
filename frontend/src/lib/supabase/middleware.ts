import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { canAccessPath } from '@/lib/auth/routeAccess';
import type { Database } from '@/types/supabase';

function isPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith('/login') ||
    pathname.startsWith('/bible') ||
    pathname.startsWith('/about') ||
    pathname.startsWith('/icons') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/logo.png'
  );
}

export async function updateSession(request: NextRequest) {
  // If the Supabase env vars are missing, do not crash every request with a
  // 500 — fail open on public paths and redirect protected ones to /login.
  // On Vercel a missing var must produce a login page, not a hard failure.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const publicPath = isPublicPath(request.nextUrl.pathname);

  if (!supabaseUrl || !supabaseKey) {
    if (!publicPath) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !publicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Role gate. This runs after getUser() and before the response is returned, so a
  // role that is not allowed on this path is redirected without the page ever
  // rendering. The role comes from the JWT, which is signed by Supabase — not from
  // anything the client can set.
  if (user) {
    // getClaims() verifies the signature, so the role read here cannot be forged by
    // the client the way a cookie or a header could. The metadata is mirrored onto the
    // JWT by the sync_profile_app_metadata trigger whenever a profile changes.
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims as
      | { app_metadata?: { role?: unknown }; user_metadata?: { role_id?: unknown } }
      | undefined;
    const role = claims?.app_metadata?.role ?? claims?.user_metadata?.role_id;

    if (!canAccessPath(role, request.nextUrl.pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  // Redirect from login to feed if already logged in
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
