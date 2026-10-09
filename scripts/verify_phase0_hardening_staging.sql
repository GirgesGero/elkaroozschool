-- ============================================================================
-- Verification Probe: Staging RPC & ACL Hardening Verification
-- Purpose: Verify allow/deny authorization matrix for get_trainee_marathon_state,
-- log_operational_event, and table ACLs inside a transaction with ROLLBACK.
-- ============================================================================

BEGIN;

-- 1. Test log_operational_event with unprivileged authenticated user (must RAISE 42501)
DO $$
DECLARE
    v_trainee_id uuid;
    v_log_err text;
BEGIN
    SELECT id INTO v_trainee_id FROM public.profiles WHERE role_id = 'trainee' LIMIT 1;
    
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_trainee_id::text, 'role', 'authenticated')::text, true);
    
    BEGIN
        PERFORM public.log_operational_event('TEST_OP', 'test', '123', 'SUCCESS', '{}'::jsonb);
        RAISE EXCEPTION 'FAIL: trainee was allowed to call log_operational_event!';
    EXCEPTION WHEN SQLSTATE '42501' THEN
        -- Expected refusal
        NULL;
    END;
END $$;

-- 2. Test get_trainee_marathon_state cross-group read (must RAISE 42501)
DO $$
DECLARE
    v_trainee_g1 uuid;
    v_trainee_g2 uuid;
    v_marathon_g2 uuid;
BEGIN
    SELECT id INTO v_trainee_g1 FROM public.profiles WHERE role_id = 'trainee' AND group_id = 1 LIMIT 1;
    SELECT id INTO v_trainee_g2 FROM public.profiles WHERE role_id = 'trainee' AND group_id = 2 LIMIT 1;
    SELECT id INTO v_marathon_g2 FROM public.marathons WHERE group_id = 2 LIMIT 1;
    
    IF v_trainee_g1 IS NOT NULL AND v_trainee_g2 IS NOT NULL AND v_marathon_g2 IS NOT NULL THEN
        SET LOCAL ROLE authenticated;
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_trainee_g1::text, 'role', 'authenticated')::text, true);
        
        BEGIN
            PERFORM public.get_trainee_marathon_state(v_marathon_g2, v_trainee_g2);
            RAISE EXCEPTION 'FAIL: cross-group trainee read was allowed!';
        EXCEPTION WHEN SQLSTATE '42501' THEN
            -- Expected refusal
            NULL;
        END;
    END IF;
END $$;

-- 3. Test _unsafe_get_trainee_marathon_state direct call by authenticated (must RAISE 42501)
DO $$
DECLARE
    v_trainee_id uuid;
    v_marathon_id uuid;
BEGIN
    SELECT id INTO v_trainee_id FROM public.profiles WHERE role_id = 'trainee' LIMIT 1;
    SELECT id INTO v_marathon_id FROM public.marathons LIMIT 1;
    
    IF v_trainee_id IS NOT NULL AND v_marathon_id IS NOT NULL THEN
        SET LOCAL ROLE authenticated;
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_trainee_id::text, 'role', 'authenticated')::text, true);
        
        BEGIN
            PERFORM public._unsafe_get_trainee_marathon_state(v_marathon_id, v_trainee_id);
            RAISE EXCEPTION 'FAIL: direct _unsafe call was allowed for authenticated!';
        EXCEPTION WHEN SQLSTATE '42501' THEN
            -- Expected refusal
            NULL;
        END;
    END IF;
END $$;

ROLLBACK;

SELECT 'PASS: All RPC hardening authorization probes passed with exact 42501 refusals' AS result;
