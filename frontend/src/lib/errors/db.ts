/**
 * Turns a Supabase/Postgres error into something an operator can act on.
 *
 * The database is the authority on what is allowed, so when it refuses a write the UI
 * has to say why instead of leaking a SQLSTATE. Each entry here corresponds to a case
 * that was actually observed in production, not a guess.
 */

interface PostgrestError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

/** Reasons the UI shows instead of the raw driver message. */
const EXPLANATIONS: { match: RegExp; message: string }[] = [
  {
    // RLS refused the row. The message explains the policy, not the query.
    match: /row-level security|violates row-level security policy/i,
    message: 'ليست لديك صلاحية لهذا الإجراء. راجع دورك في النظام.',
  },
  {
    // A required enum value was rejected.
    match: /invalid input value for enum/i,
    message: 'قيمة غير صالحة. النوع المُختار غير معروف في النظام.',
  },
  {
    match: /null value in column .* violates not-null constraint/i,
    message: 'هناك حقل إجباري فارغ. راجع البيانات المُدخلة.',
  },
  {
    match: /duplicate key value violates unique constraint/i,
    message: 'هذه البيانات موجودة بالفعل. لم يتم تكرارها.',
  },
  {
    match: /violates foreign key constraint/i,
    message: 'مرجع غير موجود. العنصر المرتبط غير متاح.',
  },
  {
    match: /new row violates row-level security/i,
    message: 'ليست لديك صلاحية لإضافة عنصر إلى هذا القسم.',
  },
  {
    match: /permission denied for (table|schema)/i,
    message: 'ليست لديك صلاحية للوصول إلى هذه البيانات.',
  },
  {
    match: /Failed to fetch|NetworkError|load failed/i,
    message: 'تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.',
  },
];

/**
 * Returns an Arabic explanation. Falls back to the driver's own message so a real bug
 * is still visible during development rather than being swallowed by a generic string.
 */
export function explainDbError(err: unknown): string {
  if (!err || typeof err !== 'object') return 'حدث خطأ غير متوقع.';

  const e = err as PostgrestError;
  const raw = [e.code, e.message, e.details, e.hint].filter(Boolean).join(' ');

  for (const { match, message } of EXPLANATIONS) {
    if (raw && match.test(raw)) return message;
  }

  // Unknown error: surface it, because hiding it would be exactly the silent failure
  // this whole change exists to remove.
  return raw || 'حدث خطأ غير متوقع.';
}

/**
 * Convenience wrapper for a Supabase write: returns either the data or throws an Error
 * carrying a message that is safe and useful to show.
 */
export async function dbWrite<T>(
  operation: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
  fallbackMessage: string,
): Promise<T> {
  const { data, error } = await operation;

  if (error) throw new Error(explainDbError(error));

  // data === null with no error is a write that reported success and returned nothing.
  // Passing the caller's fallback through verbatim would render an empty error box if
  // that fallback is itself empty, which is a blank screen with no explanation -- the
  // same silent failure this module exists to remove. So an empty fallback falls back
  // to a sentence instead.
  if (data === null) {
    throw new Error(fallbackMessage || 'تم الحفظ لكن لم يتم إرجاع البيانات. حدّث الصفحة وحاول مرة أخرى.');
  }

  return data;
}
