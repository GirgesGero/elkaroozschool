import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLockoutState,
  recordFailedAttempt,
  clearLockout,
  resetLockoutStore,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_SECONDS,
  LOCKOUT_DURATION_MS,
} from '@/lib/auth/login-lockout';

describe('Login Lockout Engine', () => {
  beforeEach(() => {
    resetLockoutStore();
  });

  it('starts with a clean unlocked state', () => {
    const state = getLockoutState();
    expect(state.failedAttempts).toBe(0);
    expect(state.isLocked).toBe(false);
    expect(state.remainingSeconds).toBe(0);
    expect(state.remainingAttempts).toBe(MAX_FAILED_ATTEMPTS);
    expect(state.lockedUntil).toBeNull();
  });

  it('increments failed attempts without locking before reaching threshold', () => {
    const t0 = 1000000;
    const res1 = recordFailedAttempt('user1', t0);
    expect(res1.isNewlyLocked).toBe(false);
    expect(res1.state.failedAttempts).toBe(1);
    expect(res1.state.remainingAttempts).toBe(4);
    expect(res1.state.isLocked).toBe(false);

    const res2 = recordFailedAttempt('user1', t0);
    expect(res2.state.failedAttempts).toBe(2);
    expect(res2.state.remainingAttempts).toBe(3);

    const res3 = recordFailedAttempt('user1', t0);
    expect(res3.state.failedAttempts).toBe(3);
    expect(res3.state.remainingAttempts).toBe(2);

    const res4 = recordFailedAttempt('user1', t0);
    expect(res4.state.failedAttempts).toBe(4);
    expect(res4.state.remainingAttempts).toBe(1);
  });

  it('activates cooldown lockout on the 5th consecutive failure', () => {
    const t0 = 1000000;
    recordFailedAttempt('user1', t0);
    recordFailedAttempt('user1', t0);
    recordFailedAttempt('user1', t0);
    recordFailedAttempt('user1', t0);

    const fifth = recordFailedAttempt('user1', t0);
    expect(fifth.isNewlyLocked).toBe(true);
    expect(fifth.state.isLocked).toBe(true);
    expect(fifth.state.failedAttempts).toBe(5);
    expect(fifth.state.remainingSeconds).toBe(LOCKOUT_DURATION_SECONDS);
    expect(fifth.state.remainingAttempts).toBe(0);
    expect(fifth.state.lockedUntil).toBe(t0 + LOCKOUT_DURATION_MS);

    // Current state check
    const current = getLockoutState(t0);
    expect(current.isLocked).toBe(true);
    expect(current.remainingSeconds).toBe(LOCKOUT_DURATION_SECONDS);
  });

  it('correctly calculates remaining seconds during cooldown', () => {
    const t0 = 1000000;
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
      recordFailedAttempt('user1', t0);
    }

    // 25 seconds later
    const midState = getLockoutState(t0 + 25000);
    expect(midState.isLocked).toBe(true);
    expect(midState.remainingSeconds).toBe(35);
  });

  it('automatically resets and unlocks once the cooldown duration passes', () => {
    const t0 = 1000000;
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
      recordFailedAttempt('user1', t0);
    }

    // 61 seconds later (expired)
    const expiredState = getLockoutState(t0 + 61000);
    expect(expiredState.isLocked).toBe(false);
    expect(expiredState.failedAttempts).toBe(0);
    expect(expiredState.remainingAttempts).toBe(MAX_FAILED_ATTEMPTS);
    expect(expiredState.remainingSeconds).toBe(0);
    expect(expiredState.lockedUntil).toBeNull();
  });

  it('immediately clears lockout and failed attempts on clearLockout', () => {
    const t0 = 1000000;
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
      recordFailedAttempt('user1', t0);
    }

    expect(getLockoutState(t0).isLocked).toBe(true);

    clearLockout();

    const afterClear = getLockoutState(t0);
    expect(afterClear.isLocked).toBe(false);
    expect(afterClear.failedAttempts).toBe(0);
    expect(afterClear.remainingAttempts).toBe(MAX_FAILED_ATTEMPTS);
  });
});
