import { describe, expect, it } from 'vitest';
import { canAccessPath, requiredRolesFor } from '@/lib/auth/routeAccess';

describe('phase 1 curriculum access contract', () => {
  it('keeps curriculum management under the existing protected group surface', () => {
    expect(canAccessPath('trainee', '/curriculum')).toBe(true);
    expect(canAccessPath('secretariat', '/curriculum')).toBe(true);
    expect(canAccessPath('servant', '/curriculum')).toBe(true);
    expect(requiredRolesFor('/curriculum')).toBeNull();
  });

  it('does not broaden the admin-only control plane', () => {
    expect(canAccessPath('secretariat', '/admin')).toBe(false);
    expect(canAccessPath('servant', '/admin')).toBe(false);
    expect(canAccessPath('admin', '/admin')).toBe(true);
  });

  it('matches nested admin routes by longest prefix', () => {
    expect(canAccessPath('secretariat', '/admin/backups')).toBe(false);
    expect(canAccessPath('super_user', '/admin/backups')).toBe(true);
  });
});
