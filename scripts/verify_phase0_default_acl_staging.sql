-- Phase 0: observe defaults applied to brand-new public objects on CONFIRMED STAGING only.
-- Creates one synthetic table, sequence and SECURITY DEFINER function with unique names,
-- checks effective ACLs/calls as anon, then rolls the entire transaction back.
-- No TRUNCATE, sequence nextval, real user data, or external side effect is used.
-- Do not run on production. Send this whole file as one SQL batch.

BEGIN;

CREATE TEMP TABLE phase0_acl_results(test_name text PRIMARY KEY, observed jsonb) ON COMMIT DROP;
GRANT INSERT, SELECT ON pg_temp.phase0_acl_results TO anon;

CREATE SEQUENCE public.phase0_acl_probe_seq_20261003;
CREATE TABLE public.phase0_acl_probe_20261003(value integer NOT NULL);
CREATE FUNCTION public.phase0_acl_probe_20261003()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$ SELECT 73 $$;

INSERT INTO pg_temp.phase0_acl_results(test_name,observed)
SELECT 'effective_privileges', jsonb_build_object(
  'anon_table_select',has_table_privilege('anon','public.phase0_acl_probe_20261003','SELECT'),
  'anon_table_insert',has_table_privilege('anon','public.phase0_acl_probe_20261003','INSERT'),
  'anon_table_truncate',has_table_privilege('anon','public.phase0_acl_probe_20261003','TRUNCATE'),
  'anon_table_maintain',has_table_privilege('anon','public.phase0_acl_probe_20261003','MAINTAIN'),
  'authenticated_table_select',has_table_privilege('authenticated','public.phase0_acl_probe_20261003','SELECT'),
  'authenticated_table_insert',has_table_privilege('authenticated','public.phase0_acl_probe_20261003','INSERT'),
  'anon_sequence_usage',has_sequence_privilege('anon','public.phase0_acl_probe_seq_20261003','USAGE'),
  'authenticated_sequence_usage',has_sequence_privilege('authenticated','public.phase0_acl_probe_seq_20261003','USAGE'),
  'anon_function_execute',has_function_privilege('anon','public.phase0_acl_probe_20261003()','EXECUTE'),
  'authenticated_function_execute',has_function_privilege('authenticated','public.phase0_acl_probe_20261003()','EXECUTE'),
  'explicit_public_execute_acl',EXISTS(
    SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(p.proacl) a
    WHERE p.oid='public.phase0_acl_probe_20261003()'::regprocedure
      AND a.grantee=0 AND a.privilege_type='EXECUTE'
  )
);

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{}',true);
DO $$
DECLARE v_value integer; v_count bigint;
BEGIN
  SELECT public.phase0_acl_probe_20261003() INTO v_value;
  INSERT INTO pg_temp.phase0_acl_results VALUES
    ('anon_function_call',jsonb_build_object('returned_value',v_value));

  INSERT INTO public.phase0_acl_probe_20261003(value) VALUES (v_value);
  SELECT count(*) INTO v_count FROM public.phase0_acl_probe_20261003;
  INSERT INTO pg_temp.phase0_acl_results VALUES
    ('anon_table_read_write',jsonb_build_object('rows_after_insert',v_count));
END $$;
RESET ROLE;

SELECT jsonb_object_agg(test_name,observed ORDER BY test_name) AS staging_probe_results
FROM pg_temp.phase0_acl_results;

ROLLBACK;
