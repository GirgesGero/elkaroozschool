/**
 * Route access matrix.
 *
 * The middleware is the only thing standing between a trainee and the admin pages, and
 * it runs before the page renders. That makes it worth testing on its own: a mistake
 * here is a mistake nobody would notice until a user opened the wrong screen.
 *
 * The expectations below are read off the role rules the app already documents, not off
 * the implementation, so a change to the rules has to be made deliberately in two places.
 */

import { describe, it, expect } from 'vitest';
import { canAccessPath, requiredRolesFor, isKnownRole, type AppRole } from '@/lib/auth/routeAccess';

const ALL_ROLES: AppRole[] = ['admin', 'super_user', 'secretariat', 'servant', 'trainee'];

describe('requiredRolesFor', () => {
  it('gates the admin section to admin and super_user', () => {
    expect(requiredRolesFor('/admin')).toEqual(['admin', 'super_user']);
    expect(requiredRolesFor('/admin/backups')).toEqual(['admin', 'super_user']);
    expect(requiredRolesFor('/admin/imports')).toEqual(['admin', 'super_user']);
    expect(requiredRolesFor('/admin/notifications')).toEqual(['admin', 'super_user']);
  });

  it('leaves ungated pages open to any signed-in role', () => {
    for (const path of ['/', '/books', '/bible', '/marathon', '/gallery', '/favorites', '/about']) {
      expect(requiredRolesFor(path)).toBeNull();
    }
  });

  it('does not treat a prefix match as a whole-segment match', () => {
    // '/administer' must not inherit the '/admin' rule.
    expect(requiredRolesFor('/administer')).toBeNull();
    expect(requiredRolesFor('/administrators')).toBeNull();
  });

  it('does not let a broad prefix shadow a specific one', () => {
    // '/marathon' is ungated, '/marathon/manage' is not. Longest prefix must win.
    expect(requiredRolesFor('/marathon/manage')).not.toBeNull();
    expect(requiredRolesFor('/marathon')).toBeNull();
  });
});

describe('canAccessPath', () => {
  it('refuses a trainee every admin page', () => {
    for (const path of ['/admin', '/admin/backups', '/admin/imports', '/admin/notifications']) {
      expect(canAccessPath('trainee', path)).toBe(false);
    }
  });

  it('admits both admin and super_user to every admin page', () => {
    for (const role of ['admin', 'super_user'] as AppRole[]) {
      for (const path of ['/admin', '/admin/backups', '/admin/imports', '/admin/notifications']) {
        expect(canAccessPath(role, path)).toBe(true);
      }
    }
  });

  it('keeps group-scoped roles inside the group tooling', () => {
    for (const role of ['secretariat', 'servant'] as AppRole[]) {
      expect(canAccessPath(role, '/trainees')).toBe(true);
      expect(canAccessPath(role, '/attendance')).toBe(true);
      expect(canAccessPath(role, '/exams')).toBe(true);
      expect(canAccessPath(role, '/marathon/manage')).toBe(true);
    }
  });

  it('keeps a trainee out of staff pages while leaving public pages open', () => {
    expect(canAccessPath('trainee', '/trainees')).toBe(false);
    expect(canAccessPath('trainee', '/attendance')).toBe(false);
    expect(canAccessPath('trainee', '/exams')).toBe(false);
    expect(canAccessPath('trainee', '/marathon/manage')).toBe(false);

    expect(canAccessPath('trainee', '/')).toBe(true);
    expect(canAccessPath('trainee', '/books')).toBe(true);
    expect(canAccessPath('trainee', '/marathon')).toBe(true);
  });

  it('denies a gated path when the role is missing or unrecognised', () => {
    // The claim can be absent if the mirror trigger has not run, and a role the app
    // does not know must never be treated as safe.
    for (const bad of [undefined, null, '', 'ADMIN', 'root', 'owner', 0, 1, {}]) {
      expect(canAccessPath(bad, '/admin')).toBe(false);
    }
  });

  it('still admits a signed-in user of an unknown role to ungated pages', () => {
    // Blocking these would lock a user out entirely; the RLS layer is what restricts
    // their data, and the pages themselves are not sensitive.
    expect(canAccessPath(undefined, '/books')).toBe(true);
    expect(canAccessPath('unknown_future_role', '/')).toBe(true);
  });

  it('is not fooled by a role string containing an allowed role', () => {
    for (const spoof of ['trainee,admin', 'admin;trainee', 'admin admin', 'xadmin']) {
      expect(canAccessPath(spoof, '/admin')).toBe(false);
    }
  });
});

describe('isKnownRole', () => {
  it('recognises exactly the five application roles', () => {
    for (const role of ALL_ROLES) expect(isKnownRole(role)).toBe(true);
    for (const role of ['moderator', 'superuser', 'ADMIN', '', null, undefined, 1]) {
      expect(isKnownRole(role)).toBe(false);
    }
  });
});

describe('full role-by-path matrix', () => {
  // Written out by hand rather than derived from the rule table on purpose. A test that
  // reads its expectations out of the code under test cannot fail, so it would only ever
  // confirm that the implementation agrees with itself.
  const expected: Record<string, AppRole[]> = {
    '/admin': ['admin', 'super_user'],
    '/admin/backups': ['admin', 'super_user'],
    '/admin/imports': ['admin', 'super_user'],
    '/admin/notifications': ['admin', 'super_user'],
    '/trainees': ['admin', 'super_user', 'secretariat', 'servant'],
    '/attendance': ['admin', 'super_user', 'secretariat', 'servant'],
    '/exams': ['admin', 'super_user', 'secretariat', 'servant'],
    '/marathon/manage': ['admin', 'super_user', 'servant', 'secretariat'],
    '/': ['admin', 'super_user', 'secretariat', 'servant', 'trainee'],
    '/books': ['admin', 'super_user', 'secretariat', 'servant', 'trainee'],
    '/bible': ['admin', 'super_user', 'secretariat', 'servant', 'trainee'],
    '/marathon': ['admin', 'super_user', 'secretariat', 'servant', 'trainee'],
    '/gallery': ['admin', 'super_user', 'secretariat', 'servant', 'trainee'],
    '/favorites': ['admin', 'super_user', 'secretariat', 'servant', 'trainee'],
    '/mp3': ['admin', 'super_user', 'secretariat', 'servant', 'trainee'],
    '/research': ['admin', 'super_user', 'secretariat', 'servant', 'trainee'],
  };

  it('admits exactly the listed roles on every path', () => {
    for (const [path, permitted] of Object.entries(expected)) {
      for (const role of ALL_ROLES) {
        expect(
          canAccessPath(role, path),
          `${role} on ${path} should be ${permitted.includes(role) ? 'allowed' : 'denied'}`,
        ).toBe(permitted.includes(role));
      }
    }
  });

  it('covers every application role on every listed path', () => {
    for (const path of Object.keys(expected)) {
      expect(ALL_ROLES).toHaveLength(5);
      expect(expected[path].length).toBeGreaterThan(0);
    }
  });
});
