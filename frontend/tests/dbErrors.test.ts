import { describe, it, expect } from 'vitest';
import { explainDbError, dbWrite } from '@/lib/errors/db';

/**
 * Suite 3 -- database refusals must reach the operator as something actionable.
 *
 * These cases exist because the failure they guard against is invisible. The query is
 * correct, the types compile, and the screen is simply empty. A write refused by a
 * policy and a write that matched zero rows look identical, so the only way to tell
 * them apart is to assert on what is displayed.
 *
 * The expected mappings are written by hand from the Postgres and Supabase
 * documentation rather than read out of explainDbError's own table. Deriving them
 * from the implementation would make the suite circular: it would agree with any
 * change, including one that maps every code to the same friendly sentence.
 */

const ok = <T,>(data: T) => ({ data, error: null });
const fail = (error: Record<string, unknown>) => ({ data: null, error });

// Held in a constant rather than inlined: an Arabic literal sitting directly inside a
// call's parentheses gets mis-tokenised by esbuild, and naming it also documents what
// the caller is expected to supply.
const NO_ROW_WRITTEN = '\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u062d\u0641\u0638';

describe('explainDbError explains a refusal instead of echoing the driver', () => {
  it('turns an RLS denial into a permission problem', () => {
    const msg = explainDbError({ message: 'new row violates row-level security policy for table "profiles"' });
    expect(msg).toMatch(/صلاحية/);
    // The policy text is Postgres jargon and must not simply be echoed back.
    expect(msg).not.toMatch(/row-level security/i);
  });

  it('does not leak a SQLSTATE number the driver appended', () => {
    // PostgREST prefixes the descriptive phrase and appends the code, so the realistic
    // message carries both. The mapped sentence must replace it wholesale.
    const realistic = [
      'new row violates row-level security policy (42501)',
      'duplicate key value violates unique constraint "uq_x" (23505)',
      'insert violates foreign key constraint "fk_y" (23503)',
      'null value in column "z" violates not-null constraint (23502)',
    ];
    for (const raw of realistic) {
      const msg = explainDbError({ message: raw });
      expect(msg).not.toMatch(/42\d\d\d|235\d\d|PGRST\d+/);
    }
  });

  it('does not echo a constraint name back', () => {
    const msg = explainDbError({
      message: 'duplicate key value violates unique constraint "uq_profiles_username"',
    });
    expect(msg).not.toContain('uq_profiles_username');
    expect(msg).toMatch(/موجودة بالفعل/);
  });

  it('explains a missing required field as an input problem', () => {
    const msg = explainDbError({ message: 'null value in column "full_name" violates not-null constraint' });
    expect(msg).toMatch(/إجباري|فارغ/);
    expect(msg).not.toContain('not-null');
  });

  it('explains a foreign key failure as a missing reference', () => {
    const msg = explainDbError({ message: 'insert violates foreign key constraint "fk_group"' });
    expect(msg).toMatch(/مرجع|غير متاح/);
  });

  it('reports a network failure as a connection problem', () => {
    const msg = explainDbError({ message: 'TypeError: Failed to fetch' });
    expect(msg).toMatch(/الاتصال|الإنترنت/);
  });

  it('matches on details and hint too, not just message', () => {
    const viaDetails = explainDbError({ message: 'error', details: 'violates row-level security policy' });
    const viaHint = explainDbError({ message: 'error', hint: 'violates row-level security policy' });
    expect(viaDetails).toMatch(/صلاحية/);
    expect(viaHint).toMatch(/صلاحية/);
  });

  it('surfaces an unrecognised error rather than hiding it', () => {
    // Collapsing every unknown into one generic sentence is how a real bug survives to
    // production. The raw text has to stay recognisable.
    const msg = explainDbError({ message: 'connection reset by peer on 10.0.3.7' });
    expect(msg).toMatch(/10\.0\.3\.7|connection reset/i);
  });

  it('survives null, undefined and empty errors', () => {
    for (const input of [undefined, null, {}, { message: '' }, { message: null }]) {
      expect(() => explainDbError(input)).not.toThrow();
      expect(explainDbError(input).length).toBeGreaterThan(0);
    }
  });

  it('answers in Arabic, since every operator reads Arabic', () => {
    const msg = explainDbError({ message: 'violates row-level security policy' });
    expect(msg).toMatch(/[\u0600-\u06FF]/);
  });
});

describe('dbWrite turns a rejected write into a displayable error', () => {
  it('throws the explanation when the database refuses', async () => {
    await expect(
      dbWrite(fail({ message: 'new row violates row-level security policy' }) as never, 'fallback'),
    ).rejects.toThrow(/صلاحية/);
  });

  it('never throws the raw driver text', async () => {
    try {
      await dbWrite(fail({ message: 'permission denied for table profiles' }) as never, 'fallback');
      throw new Error('expected dbWrite to reject');
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).not.toBe('expected dbWrite to reject');
      expect(msg).not.toContain('permission denied');
      expect(msg).not.toMatch(/42501/);
    }
  });

  it('uses the caller-provided fallback when the write succeeded but returned nothing', async () => {
    // data===null with no error is the case that hides a silently dropped write, so it
    // must not pass through as success and must not read as a database error either.
    await expect(dbWrite(ok(null) as never, NO_ROW_WRITTEN)).rejects.toThrow(NO_ROW_WRITTEN);
  });

  it('returns the row when the write succeeded', async () => {
    const row = { id: 'abc' };
    await expect(dbWrite(ok(row) as never, 'fallback')).resolves.toEqual(row);
  });

  it('always rejects with a non-empty message, even given an empty fallback', async () => {
    // An empty message renders as a blank error box, which is worse than no box.
    for (const c of [fail({ message: '' }), fail({}), ok(null)]) {
      try {
        await dbWrite(c as never, '');
        throw new Error('sentinel: expected a rejection');
      } catch (err) {
        if ((err as Error).message === 'sentinel: expected a rejection') throw err;
        expect((err as Error).message.length).toBeGreaterThan(0);
      }
    }
  });
});