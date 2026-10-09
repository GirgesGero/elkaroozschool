-- Logical export of the public schema, callable by service_role only.
--
-- WHY THIS EXISTS
--
-- BackupController previously recorded includes_database = false in every
-- manifest, because a logical Postgres dump was thought to be impossible here.
-- That was half true. pg_dump is indeed unavailable on shared hosting, but
-- pg_dump is not required to produce a restorable logical export: Postgres
-- itself can serialise any table to jsonb, and PostgREST can return that jsonb.
--
-- This function is that serialiser. It is the read half of database backup and
-- restore; without it the manifest could never honestly claim to contain data.
--
-- WHY service_role ONLY
--
-- This returns every row of every table, including profiles: names, birth
-- dates, phone numbers, addresses, church, and the confession father. That is
-- the full user base. It must not be reachable by anon or authenticated -- a
-- single exposed call would be a total data breach, so the grants below are the
-- security control, not a formality. REVOKE is issued explicitly even though a
-- fresh function defaults to PUBLIC EXECUTE.
--
-- It is deliberately NOT callable by authenticated even for an admin: the PHP
-- API already authorises the caller and then calls this with service_role, so
-- there is no reason to widen the database surface.
--
-- SECURITY
--
-- SECURITY DEFINER is NOT used. Reading public tables does not need it, and
-- avoiding it keeps this function subject to RLS like any other query -- an
-- accidental future change to the role would then fail closed instead of
-- silently exposing everything. search_path is pinned for the same reason.
--
-- The table name is matched against pg_class and passed to format('%I') as an
-- identifier. A table name is never interpolated as a string into the query, so
-- there is no injection path even if the catalogue were poisoned.
--
-- PAGINATION
--
-- p_limit / p_offset exist because a single jsonb holding every row of every
-- table would exceed both the Postgres row size and PostgREST's response limit
-- as the data grows. Callers walk tables and pages. has_more comes from a LIMIT
-- p_limit + 1 fetch so the count is exact without a second COUNT query.

CREATE OR REPLACE FUNCTION public.export_table(
    p_table text,
    p_limit  integer DEFAULT 1000,
    p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_relid     oid;
    v_sql       text;
    v_rows      jsonb;
    v_total     bigint;
    v_eff_limit integer;
    v_eff_offset integer;
BEGIN
    IF p_table IS NULL OR p_table !~ '^[a-z_][a-z0-9_]*$' THEN
        RAISE EXCEPTION 'invalid table name: %', coalesce(p_table, '(null)')
            USING ERRCODE = '22023';
    END IF;

    SELECT c.oid INTO v_relid
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = p_table
      AND c.relkind = 'r';   -- base tables only: no views, matviews, or sequences

    IF NOT FOUND THEN
        RAISE EXCEPTION 'table not found: %', p_table USING ERRCODE = '42P01';
    END IF;

    v_eff_limit  := greatest(coalesce(p_limit, 1000), 1);
    v_eff_offset := greatest(coalesce(p_offset, 0), 0);

    -- The FULL table row count, before any LIMIT. has_more MUST be derived from
    -- this, not from the page: the page length can never exceed the limit, so
    -- comparing it against the limit is always false and every multi-page table
    -- silently exports only its first page. That was the original bug here.
    EXECUTE format('SELECT count(*) FROM public.%I', p_table) INTO v_total;

    v_sql := format('SELECT coalesce(jsonb_agg(t ORDER BY t), ''[]''::jsonb) AS data
                       FROM (SELECT * FROM public.%I LIMIT %s OFFSET %s) t',
                    p_table, v_eff_limit, v_eff_offset);

    EXECUTE v_sql INTO v_rows;

    RETURN jsonb_build_object(
        'table',      p_table,
        'rows',       v_rows,
        'has_more',   (v_eff_offset + coalesce(jsonb_array_length(v_rows), 0)) < v_total,
        'row_count',  coalesce(jsonb_array_length(v_rows), 0),
        'total_rows', v_total,
        'limit',      v_eff_limit,
        'offset',     v_eff_offset
    );
END;
$function$;

COMMENT ON FUNCTION public.export_table(text, integer, integer) IS
    'Serialises one public table to jsonb for logical backup, paginated. has_more is computed from the FULL table row count, not from the page size, so a partial export is never reported as complete. service_role only: returns full PII.';

-- ---------------------------------------------------------------------------
-- List every exportable table with its row count, so the caller can plan
-- pagination without hardcoding a table list that will drift.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.export_manifest()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_out jsonb;
BEGIN
    SELECT coalesce(jsonb_agg(
               jsonb_build_object(
                   'table',      c.relname,
                   'row_count',  (xpath('/row/c/text()', query_to_xml(
                       format('SELECT count(*) AS c FROM public.%I', c.relname),
                       false, true, '')))[1]::text::bigint
               ) ORDER BY c.relname
           ), '[]'::jsonb)
    INTO v_out
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r';

    RETURN jsonb_build_object('tables', v_out);
END;
$function$;

COMMENT ON FUNCTION public.export_manifest() IS
    'Every exportable public table with its exact row count. service_role only.';

-- ---------------------------------------------------------------------------
-- Grants. Both functions return the entire user base, so anon and authenticated
-- must be excluded. PUBLIC covers anon and authenticated by inheritance, but it
-- is revoked explicitly so the intent survives a future DEFAULT privilege change.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.export_table(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.export_manifest()                  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.export_table(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.export_manifest()                  TO service_role;