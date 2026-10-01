/**
 * Server-side role gating for page routes.
 *
 * Why this lives here and not only in the page components: the per-page checks in
 * the admin page components run in the browser, after Next.js has already streamed the
 * page's HTML to the client. A logged-in trainee could therefore load the admin
 * markup - the shell, the labels, the data already inlined - before the client-side
 * check pushed them away. The RLS policies stop them reading the rows; nothing was
 * stopping them seeing the screen.
 *
 * This module is consulted from the middleware, so an unauthorized role is redirected
 * before any rendering happens. The client-side checks stay in place as a second layer:
 * they still cover in-app navigation, where the middleware has already run.
 */

export type AppRole = 'admin' | 'super_user' | 'secretariat' | 'servant' | 'trainee';

/**
 * Paths that require a specific role. A path not listed here needs only a signed-in
 * user; the default is the least restrictive rule, so a new page is not accidentally
 * gated shut.
 */
const ROLE_RULES: { prefix: string; roles: AppRole[] }[] = [
  { prefix: '/admin', roles: ['admin', 'super_user'] },
  { prefix: '/trainees', roles: ['admin', 'super_user', 'secretariat', 'servant'] },
  { prefix: '/marathon/manage', roles: ['admin', 'super_user', 'servant', 'secretariat'] },
  { prefix: '/attendance', roles: ['admin', 'super_user', 'secretariat', 'servant'] },
  { prefix: '/exams', roles: ['admin', 'super_user', 'secretariat', 'servant'] },
];

/** Roles that may administer a group's own members but not the whole platform. */
export const ADMIN_ONLY: AppRole[] = ['admin', 'super_user'];

/** Roles whose reach is limited to their own group. */
export const GROUP_SCOPED: AppRole[] = ['secretariat', 'servant', 'trainee'];

export function isKnownRole(value: unknown): value is AppRole {
  return (
    value === 'admin' ||
    value === 'super_user' ||
    value === 'secretariat' ||
    value === 'servant' ||
    value === 'trainee'
  );
}

/**
 * The roles allowed to view 'pathname', or null when the path is not role-gated.
 * Longest prefix wins, so '/marathon/manage' is matched before '/marathon'.
 */
export function requiredRolesFor(pathname: string): AppRole[] | null {
  let match: { prefix: string; roles: AppRole[] } | null = null;

  for (const rule of ROLE_RULES) {
    const isMatch =
      pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`);
    if (isMatch && (!match || rule.prefix.length > match.prefix.length)) {
      match = rule;
    }
  }

  return match ? match.roles : null;
}

/**
 * Whether a user holding 'role' may view 'pathname'.
 * Unknown roles are denied on a gated path: a role the app does not recognise must
 * not be assumed safe.
 */
export function canAccessPath(role: unknown, pathname: string): boolean {
  const required = requiredRolesFor(pathname);
  if (required === null) return true;
  if (!isKnownRole(role)) return false;
  return required.includes(role);
}
