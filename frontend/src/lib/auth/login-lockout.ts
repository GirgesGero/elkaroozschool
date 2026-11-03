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

function normalizeIdentifier(identifier?: string): string {
  return (identifier ?? '').trim().toLowerCase().replace(/[^a-z0-9._@-]/g, '');
}

function storageKeyFor(identifier?: string): string {
  const norm = normalizeIdentifier(identifier);
  return norm ? `${LOCKOUT_STORAGE_KEY}:${norm}` : LOCKOUT_STORAGE_KEY;
}

/**
 * Reset memory store (useful for automated testing)
 */
export function resetLockoutStore(): void {
  const keysToRemove = Object.keys(inMemoryStore);
  inMemoryStore = {};
  for (const k of keysToRemove) {
    safeRemoveItem(k);
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const localKeys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(LOCKOUT_STORAGE_KEY)) {
          localKeys.push(k);
        }
      }
      for (const k of localKeys) {
        window.localStorage.removeItem(k);
      }
    }
  } catch {
    // Storage access denied
  }
  safeRemoveItem(LOCKOUT_STORAGE_KEY);
}

/**
 * Retrieve current lockout status from storage
 */
export function getLockoutState(now = Date.now(), identifier?: string): LockoutState {
  const key = storageKeyFor(identifier);
  const raw = safeGetItem(key);
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
      clearLockout(identifier || data.lastIdentifier);
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
    clearLockout(identifier);
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
  const normId = normalizeIdentifier(identifier);
  const current = getLockoutState(now, normId || undefined);

  // If already locked, keep existing lock
  if (current.isLocked) {
    return { state: current, isNewlyLocked: false };
  }

  const nextAttempts = current.failedAttempts + 1;
  const scopedKey = storageKeyFor(normId || undefined);

  if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = now + LOCKOUT_DURATION_MS;
    const record: LockoutRecord = {
      failedAttempts: nextAttempts,
      lockedUntil,
      lastIdentifier: normId || undefined,
    };
    const serialized = JSON.stringify(record);
    safeSetItem(scopedKey, serialized);
    if (scopedKey !== LOCKOUT_STORAGE_KEY) {
      safeSetItem(LOCKOUT_STORAGE_KEY, serialized);
    }

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
    lastIdentifier: normId || undefined,
  };
  const serialized = JSON.stringify(record);
  safeSetItem(scopedKey, serialized);
  if (scopedKey !== LOCKOUT_STORAGE_KEY) {
    safeSetItem(LOCKOUT_STORAGE_KEY, serialized);
  }

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
export function clearLockout(identifier?: string): void {
  const rawDefault = safeGetItem(LOCKOUT_STORAGE_KEY);
  if (rawDefault) {
    try {
      const parsed: LockoutRecord = JSON.parse(rawDefault);
      if (parsed.lastIdentifier) {
        safeRemoveItem(storageKeyFor(parsed.lastIdentifier));
      }
    } catch {
      // ignore malformed JSON
    }
  }
  if (identifier) {
    safeRemoveItem(storageKeyFor(identifier));
  }
  safeRemoveItem(LOCKOUT_STORAGE_KEY);
}
