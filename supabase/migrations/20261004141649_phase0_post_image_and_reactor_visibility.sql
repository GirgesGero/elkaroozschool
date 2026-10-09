-- Intended Phase 0 remediation for a confirmed staging project.
-- Historical apply target was the Supabase MCP project, which the owner described
-- as staging. On 2026-10-04, its host was found not to match frontend/.env.local.
-- Target environment is therefore not independently verified; do not infer that
-- production is untouched or reapply until the owner confirms the exact project.

BEGIN;

-- Images inherit the same authenticated read scope as their parent feed post.
DROP POLICY IF EXISTS "Public read post images" ON public.post_images;
CREATE POLICY "Read post images visible with parent post"
    ON public.post_images
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.feed_posts AS fp
            WHERE fp.id = post_images.post_id
              AND (fp.deleted_at IS NULL OR public.is_admin_or_super_user())
        )
    );

-- SECURITY DEFINER bypasses feed_posts RLS, so reproduce its read predicate
-- before returning reactors. A hidden or missing post returns an empty array.
CREATE OR REPLACE FUNCTION public.get_post_reactors(p_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_reactors JSONB;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.feed_posts AS fp
        WHERE fp.id = p_post_id
          AND (fp.deleted_at IS NULL OR public.is_admin_or_super_user())
    ) THEN
        RETURN '[]'::jsonb;
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'user_id', r.user_id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'reaction_type', r.reaction_type,
        'created_at', r.created_at
    ) ORDER BY r.created_at DESC), '[]'::jsonb)
    INTO v_reactors
    FROM public.reactions AS r
    JOIN public.profiles AS p ON p.id = r.user_id
    WHERE r.target_type = 'POST'
      AND r.target_id = p_post_id;

    RETURN v_reactors;
END;
$function$;

COMMIT;
