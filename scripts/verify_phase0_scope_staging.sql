-- Phase 0 read-scope probes. Run only after confirming that the connected Supabase
-- project host matches the intended application's configuration and the owner confirms staging.
-- The historical MCP target did not match frontend/.env.local on 2026-10-04; do not rerun
-- against that target or any production database until identity is confirmed.
--
-- The only writes are temporary tables/functions in this transaction. No public
-- table is changed; the final ROLLBACK removes the temporary harness. This does
-- not verify external file-byte access or prove that a hand-built claims payload
-- came from a live Auth token. Keep IDs, URLs and personal data out of output.
--
-- Uses one top-level DO block per actor so STABLE authorization helpers are not
-- accidentally cached across different simulated users in one statement.

BEGIN;

CREATE TEMP TABLE phase0_scope_inputs AS
SELECT
    (SELECT id FROM public.profiles WHERE role_id='trainee' AND group_id=1 AND is_active IS TRUE AND deleted_at IS NULL ORDER BY id LIMIT 1) AS trainee_g1,
    (SELECT id FROM public.profiles WHERE role_id='trainee' AND group_id=2 AND is_active IS TRUE AND deleted_at IS NULL ORDER BY id LIMIT 1) AS trainee_g2,
    (SELECT id FROM public.profiles WHERE role_id='servant' AND group_id=1 AND is_active IS TRUE AND deleted_at IS NULL ORDER BY id LIMIT 1) AS servant_g1,
    (SELECT id FROM public.profiles WHERE role_id='servant' AND group_id=2 AND is_active IS TRUE AND deleted_at IS NULL ORDER BY id LIMIT 1) AS servant_g2,
    (SELECT id FROM public.profiles WHERE role_id='secretariat' AND group_id=1 AND is_active IS TRUE AND deleted_at IS NULL ORDER BY id LIMIT 1) AS secretariat_g1,
    (SELECT id FROM public.profiles WHERE role_id='secretariat' AND group_id=2 AND is_active IS TRUE AND deleted_at IS NULL ORDER BY id LIMIT 1) AS secretariat_g2,
    (SELECT id FROM public.profiles WHERE role_id='admin' AND is_active IS TRUE AND deleted_at IS NULL ORDER BY id LIMIT 1) AS admin_id,
    (SELECT id FROM public.profiles WHERE role_id='super_user' AND is_active IS TRUE AND deleted_at IS NULL ORDER BY id LIMIT 1) AS super_user_id,
    (SELECT id FROM public.profiles WHERE role_id='trainee' AND group_id=1 AND is_active IS FALSE AND deleted_at IS NULL ORDER BY id LIMIT 1) AS inactive_trainee_g1,
    (SELECT r.target_id
       FROM public.reactions r
       JOIN public.feed_posts fp ON fp.id=r.target_id
      WHERE r.target_type='POST' AND fp.deleted_at IS NULL
      ORDER BY r.created_at DESC
      LIMIT 1) AS active_post_with_reaction;

CREATE TEMP TABLE phase0_scope_results (
    actor text NOT NULL,
    effective_role text NOT NULL,
    test_name text NOT NULL,
    outcome text NOT NULL,
    observed_count bigint
) ON COMMIT DROP;

GRANT SELECT ON phase0_scope_inputs TO authenticated;
GRANT INSERT, SELECT ON phase0_scope_results TO anon, authenticated;

-- Owner-created invoker helper. Each caller invokes it in its own DO statement.
CREATE FUNCTION pg_temp.phase0_probe_actor(
    p_actor text,
    p_uid uuid,
    p_role text,
    p_group smallint,
    p_active boolean,
    p_post uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $probe$
DECLARE
    v_count bigint;
    v_state text;
BEGIN
    PERFORM set_config(
        'request.jwt.claims',
        jsonb_build_object(
            'sub', p_uid::text,
            'role', 'authenticated',
            'app_metadata', jsonb_build_object(
                'role', p_role,
                'group_id', p_group,
                'is_active', p_active
            )
        )::text,
        true
    );

    BEGIN
        SELECT count(*) INTO v_count FROM public.gallery_albums WHERE group_id=1;
        INSERT INTO pg_temp.phase0_scope_results VALUES (p_actor,current_user,'gallery_albums group 1','allowed',v_count);
    EXCEPTION WHEN others THEN
        GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
        INSERT INTO pg_temp.phase0_scope_results VALUES (p_actor,current_user,'gallery_albums group 1','error:'||v_state,NULL);
    END;

    BEGIN
        SELECT count(*) INTO v_count FROM public.gallery_items WHERE group_id=1;
        INSERT INTO pg_temp.phase0_scope_results VALUES (p_actor,current_user,'gallery_items group 1','allowed',v_count);
    EXCEPTION WHEN others THEN
        GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
        INSERT INTO pg_temp.phase0_scope_results VALUES (p_actor,current_user,'gallery_items group 1','error:'||v_state,NULL);
    END;

    BEGIN
        SELECT count(*) INTO v_count FROM public.feed_posts;
        INSERT INTO pg_temp.phase0_scope_results VALUES (p_actor,current_user,'feed_posts visible','allowed',v_count);
    EXCEPTION WHEN others THEN
        GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
        INSERT INTO pg_temp.phase0_scope_results VALUES (p_actor,current_user,'feed_posts visible','error:'||v_state,NULL);
    END;

    BEGIN
        SELECT count(*) INTO v_count FROM public.post_images;
        INSERT INTO pg_temp.phase0_scope_results VALUES (p_actor,current_user,'post_images visible','allowed',v_count);
    EXCEPTION WHEN others THEN
        GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
        INSERT INTO pg_temp.phase0_scope_results VALUES (p_actor,current_user,'post_images visible','error:'||v_state,NULL);
    END;

    BEGIN
        SELECT jsonb_array_length(public.get_post_reactors(p_post)) INTO v_count;
        INSERT INTO pg_temp.phase0_scope_results VALUES (p_actor,current_user,'get_post_reactors active post','allowed',v_count);
    EXCEPTION WHEN others THEN
        GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
        INSERT INTO pg_temp.phase0_scope_results VALUES (p_actor,current_user,'get_post_reactors active post','error:'||v_state,NULL);
    END;
END;
$probe$;
GRANT EXECUTE ON FUNCTION pg_temp.phase0_probe_actor(text,uuid,text,smallint,boolean,uuid) TO authenticated;

-- Anonymous behavior: record counts only; no IDs, URLs, or profile fields.
SET LOCAL ROLE anon;
DO $anon$
DECLARE
    v_count bigint;
    v_state text;
BEGIN

    BEGIN
        SELECT count(*) INTO v_count FROM public.feed_posts;
        INSERT INTO pg_temp.phase0_scope_results VALUES ('anon','anon','feed_posts visible','allowed',v_count);
    EXCEPTION WHEN others THEN
        GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
        INSERT INTO pg_temp.phase0_scope_results VALUES ('anon','anon','feed_posts visible','error:'||v_state,NULL);
    END;

    BEGIN
        SELECT count(*) INTO v_count FROM public.post_images;
        INSERT INTO pg_temp.phase0_scope_results VALUES ('anon','anon','post_images visible','allowed',v_count);
    EXCEPTION WHEN others THEN
        GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
        INSERT INTO pg_temp.phase0_scope_results VALUES ('anon','anon','post_images visible','error:'||v_state,NULL);
    END;

    BEGIN
        SELECT jsonb_array_length(public.get_post_reactors('00000000-0000-0000-0000-000000000000'::uuid)) INTO v_count;
        INSERT INTO pg_temp.phase0_scope_results VALUES ('anon','anon','get_post_reactors EXECUTE gate','allowed',v_count);
    EXCEPTION WHEN others THEN
        GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
        INSERT INTO pg_temp.phase0_scope_results VALUES ('anon','anon','get_post_reactors EXECUTE gate','error:'||v_state,NULL);
    END;
END;
$anon$;
RESET ROLE;

SET LOCAL ROLE authenticated;
DO $$ BEGIN PERFORM pg_temp.phase0_probe_actor('active trainee group 1',(SELECT trainee_g1 FROM pg_temp.phase0_scope_inputs),'trainee',1::smallint,true,(SELECT active_post_with_reaction FROM pg_temp.phase0_scope_inputs)); END $$;
DO $$ BEGIN PERFORM pg_temp.phase0_probe_actor('active trainee group 2',(SELECT trainee_g2 FROM pg_temp.phase0_scope_inputs),'trainee',2::smallint,true,(SELECT active_post_with_reaction FROM pg_temp.phase0_scope_inputs)); END $$;
DO $$ BEGIN PERFORM pg_temp.phase0_probe_actor('active servant group 1',(SELECT servant_g1 FROM pg_temp.phase0_scope_inputs),'servant',1::smallint,true,(SELECT active_post_with_reaction FROM pg_temp.phase0_scope_inputs)); END $$;
DO $$ BEGIN PERFORM pg_temp.phase0_probe_actor('active servant group 2',(SELECT servant_g2 FROM pg_temp.phase0_scope_inputs),'servant',2::smallint,true,(SELECT active_post_with_reaction FROM pg_temp.phase0_scope_inputs)); END $$;
DO $$ BEGIN PERFORM pg_temp.phase0_probe_actor('active secretariat group 1',(SELECT secretariat_g1 FROM pg_temp.phase0_scope_inputs),'secretariat',1::smallint,true,(SELECT active_post_with_reaction FROM pg_temp.phase0_scope_inputs)); END $$;
DO $$ BEGIN PERFORM pg_temp.phase0_probe_actor('active secretariat group 2',(SELECT secretariat_g2 FROM pg_temp.phase0_scope_inputs),'secretariat',2::smallint,true,(SELECT active_post_with_reaction FROM pg_temp.phase0_scope_inputs)); END $$;
DO $$ BEGIN PERFORM pg_temp.phase0_probe_actor('admin',(SELECT admin_id FROM pg_temp.phase0_scope_inputs),'admin',1::smallint,true,(SELECT active_post_with_reaction FROM pg_temp.phase0_scope_inputs)); END $$;
DO $$ BEGIN PERFORM pg_temp.phase0_probe_actor('super_user',(SELECT super_user_id FROM pg_temp.phase0_scope_inputs),'super_user',1::smallint,true,(SELECT active_post_with_reaction FROM pg_temp.phase0_scope_inputs)); END $$;
DO $$ BEGIN PERFORM pg_temp.phase0_probe_actor('inactive trainee group 1',(SELECT inactive_trainee_g1 FROM pg_temp.phase0_scope_inputs),'trainee',1::smallint,false,(SELECT active_post_with_reaction FROM pg_temp.phase0_scope_inputs)); END $$;
RESET ROLE;

SELECT actor,effective_role,test_name,outcome,observed_count
FROM pg_temp.phase0_scope_results
ORDER BY actor,test_name;

ROLLBACK;
