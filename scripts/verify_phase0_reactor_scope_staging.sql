-- Phase 0: re-test post-image and reactor scope on the owner-confirmed STAGING project only.
-- Synthetic public-table rows exist only inside this transaction and are rolled back.
-- No IDs, URLs, profiles, or image bytes are returned; the URL uses example.invalid.
-- After this batch, run the read-only marker count to confirm rollback cleanup.

BEGIN;

CREATE TEMP TABLE phase0_reactor_probe (
  post_id uuid PRIMARY KEY,
  author_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  is_deleted boolean NOT NULL,
  marker text NOT NULL
) ON COMMIT DROP;

INSERT INTO pg_temp.phase0_reactor_probe(post_id,author_id,actor_id,is_deleted,marker)
SELECT gen_random_uuid(),
       (SELECT id FROM public.profiles WHERE role_id='trainee' AND group_id=1 AND is_active IS TRUE AND deleted_at IS NULL ORDER BY id LIMIT 1),
       (SELECT id FROM public.profiles WHERE role_id='trainee' AND group_id=2 AND is_active IS TRUE AND deleted_at IS NULL ORDER BY id LIMIT 1),
       g.n=1,
       'phase0-reactor-visibility-probe-20261004-v1'
FROM generate_series(1,2) AS g(n);

DO $$
DECLARE v_author uuid; v_actor uuid; v_count integer;
BEGIN
  SELECT author_id,actor_id INTO v_author,v_actor FROM pg_temp.phase0_reactor_probe LIMIT 1;
  SELECT count(*) INTO v_count FROM pg_temp.phase0_reactor_probe;
  IF v_author IS NULL OR v_actor IS NULL OR v_author=v_actor OR v_count<>2 THEN
    RAISE EXCEPTION 'probe fixture actor selection invalid';
  END IF;
  IF EXISTS (SELECT 1 FROM public.feed_posts WHERE content_text='phase0-reactor-visibility-probe-20261004-v1') THEN
    RAISE EXCEPTION 'probe marker already exists';
  END IF;
END $$;

INSERT INTO public.feed_posts(id,author_id,content_text,deleted_at)
SELECT post_id,author_id,marker,CASE WHEN is_deleted THEN now() ELSE NULL END
FROM pg_temp.phase0_reactor_probe;

INSERT INTO public.reactions(target_type,target_id,user_id,reaction_type)
SELECT 'POST',post_id,author_id,'LIKE' FROM pg_temp.phase0_reactor_probe;

INSERT INTO public.post_images(post_id,storage_path,image_url,order_index)
SELECT post_id,'phase0-probe/'||post_id::text||'.jpg','https://example.invalid/phase0-probe/'||post_id::text,1
FROM pg_temp.phase0_reactor_probe;

GRANT SELECT ON pg_temp.phase0_reactor_probe TO authenticated, anon;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  (SELECT jsonb_build_object('sub',actor_id::text,'role','authenticated',
     'app_metadata',jsonb_build_object('role','trainee','group_id',2,'is_active',true))::text
   FROM pg_temp.phase0_reactor_probe LIMIT 1), true);

SELECT
  (SELECT count(*) FROM public.feed_posts fp JOIN pg_temp.phase0_reactor_probe p ON fp.id=p.post_id WHERE p.is_deleted) AS hidden_posts_visible,
  (SELECT count(*) FROM public.feed_posts fp JOIN pg_temp.phase0_reactor_probe p ON fp.id=p.post_id WHERE NOT p.is_deleted) AS active_posts_visible,
  (SELECT count(*) FROM public.post_images pi JOIN pg_temp.phase0_reactor_probe p ON pi.post_id=p.post_id WHERE p.is_deleted) AS hidden_images_visible,
  (SELECT count(*) FROM public.post_images pi JOIN pg_temp.phase0_reactor_probe p ON pi.post_id=p.post_id WHERE NOT p.is_deleted) AS active_images_visible,
  jsonb_array_length(public.get_post_reactors((SELECT post_id FROM pg_temp.phase0_reactor_probe WHERE is_deleted))) AS hidden_reactor_count,
  jsonb_array_length(public.get_post_reactors((SELECT post_id FROM pg_temp.phase0_reactor_probe WHERE NOT is_deleted))) AS active_reactor_count;

RESET ROLE;
SET LOCAL ROLE anon;
SELECT count(*) AS anon_probe_images_visible
FROM public.post_images pi
JOIN pg_temp.phase0_reactor_probe p ON pi.post_id=p.post_id;
RESET ROLE;

ROLLBACK;
