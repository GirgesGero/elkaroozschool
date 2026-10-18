/**
 * Smart Client-side Login Rate Limiting & Account Lockout
 *
 * Protects against rapid brute-force credential stuffing by tracking failed
 * login attempts locally. After MAX_FAILED_ATTEMPTS (5 attempts), the login
 * form enters a temporary cooldown lockout (60 seconds) with an active countdown timer.
 */

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_SECONDS = 60;
export const LOCKOUT_DURATION_MS = LOCKOUT_DURATION_SECONDS * 1000;
export const LOCKOUT_STORAGE_KEY = 'elkarooz_login_lockout_v1';

export interface LockoutRecord {
  failedAttempts: number;
  lockedUntil: number | null;
  lastIdentifier?: string;
}

export interface LockoutState {
  failedAttempts: number;
  isLocked: boolean;
  remainingSeconds: number;
  remainingAttempts: number;
  lockedUntil: number | null;
}

// In-memory fallback if localStorage is disabled or throws SecurityError
let inMemoryStore: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Storage access denied or sandboxed
  }
  return inMemoryStore[key] || null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
  } catch {
    // Storage access denied
  }
  inMemoryStore[key] = value;
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }
  } catch {
    // Storage access denied
  }
  delete inMemoryStore[key];
}

/**
 * Reset memory store (useful for automated testing)
 */
export function resetLockoutStore(): void {
  inMemoryStore = {};
  safeRemoveItem(LOCKOUT_STORAGE_KEY);
}

/**
 * Retrieve current lockout status from storage
 */
export function getLockoutState(now = Date.now()): LockoutState {
  const raw = safeGetItem(LOCKOUT_STORAGE_KEY);
  if (!raw) {
    return {
      failedAttempts: 0,
      isLocked: false,
      remainingSeconds: 0,
      remainingAttempts: MAX_FAILED_ATTEMPTS,
      lockedUntil: null,
    };
  }

  try {
    const data: LockoutRecord = JSON.parse(raw);
    const lockedUntil = data.lockedUntil || null;

    if (lockedUntil && lockedUntil > now) {
      const remainingSeconds = Math.max(1, Math.ceil((lockedUntil - now) / 1000));
      return {
        failedAttempts: data.failedAttempts || MAX_FAILED_ATTEMPTS,
        isLocked: true,
        remainingSeconds,
        remainingAttempts: 0,
        lockedUntil,
      };
    }

    // Lockout expired or never locked
    if (lockedUntil && lockedUntil <= now) {
      // Cooldown finished: reset state
      clearLockout();
      return {
        failedAttempts: 0,
        isLocked: false,
        remainingSeconds: 0,
        remainingAttempts: MAX_FAILED_ATTEMPTS,
        lockedUntil: null,
      };
    }

    const failed = Math.max(0, data.failedAttempts || 0);
    const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - failed);

    return {
      failedAttempts: failed,
      isLocked: false,
      remainingSeconds: 0,
      remainingAttempts,
      lockedUntil: null,
    };
  } catch {
    clearLockout();
    return {
      failedAttempts: 0,
      isLocked: false,
      remainingSeconds: 0,
      remainingAttempts: MAX_FAILED_ATTEMPTS,
      lockedUntil: null,
    };
  }
}

/**
 * Record a failed authentication attempt.
 * If failed attempts reach MAX_FAILED_ATTEMPTS, activates the cooldown lock.
 */
export function recordFailedAttempt(
  identifier?: string,
  now = Date.now()
): { state: LockoutState; isNewlyLocked: boolean } {
  const current = getLockoutState(now);

  // If already locked, keep existing lock
  if (current.isLocked) {
    return { state: current, isNewlyLocked: false };
  }

  const nextAttempts = current.failedAttempts + 1;

  if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = now + LOCKOUT_DURATION_MS;
    const record: LockoutRecord = {
      failedAttempts: nextAttempts,
      lockedUntil,
      lastIdentifier: identifier?.trim() || undefined,
    };
    safeSetItem(LOCKOUT_STORAGE_KEY, JSON.stringify(record));

    return {
      state: {
        failedAttempts: nextAttempts,
        isLocked: true,
        remainingSeconds: LOCKOUT_DURATION_SECONDS,
        remainingAttempts: 0,
        lockedUntil,
      },
      isNewlyLocked: true,
    };
  }

  const record: LockoutRecord = {
    failedAttempts: nextAttempts,
    lockedUntil: null,
    lastIdentifier: identifier?.trim() || undefined,
  };
  safeSetItem(LOCKOUT_STORAGE_KEY, JSON.stringify(record));

  return {
    state: {
      failedAttempts: nextAttempts,
      isLocked: false,
      remainingSeconds: 0,
      remainingAttempts: MAX_FAILED_ATTEMPTS - nextAttempts,
      lockedUntil: null,
    },
    isNewlyLocked: false,
  };
}

/**
 * Clear lockout state upon successful authentication or admin reset
 */
export function clearLockout(): void {
  safeRemoveItem(LOCKOUT_STORAGE_KEY);
}
