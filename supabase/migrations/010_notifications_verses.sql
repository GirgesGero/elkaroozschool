-- 010_notifications_verses.sql
-- In-App Notifications (Absence, Birthday, Daily Verse), Web Push Subscriptions, and Daily Verse Bank

CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key VARCHAR(64) NOT NULL UNIQUE, -- 'PASTORAL' | 'BIRTHDAY' | 'SYSTEM'
    template_body TEXT NOT NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category VARCHAR(32) NOT NULL, -- 'PASTORAL' | 'BIRTHDAY' | 'DAILY_VERSE' | 'SYSTEM'
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    action_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_notification_category CHECK (category IN ('PASTORAL', 'BIRTHDAY', 'DAILY_VERSE', 'SYSTEM'))
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    keys_p256dh TEXT NOT NULL,
    keys_auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_profile_endpoint UNIQUE (profile_id, endpoint)
);

CREATE TABLE IF NOT EXISTS public.daily_verses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verse_text TEXT NOT NULL,
    reference VARCHAR(150) NOT NULL,
    display_order INT NOT NULL DEFAULT 1,
    is_sent BOOLEAN NOT NULL DEFAULT false,
    last_sent_date DATE DEFAULT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.daily_verse_dispatch_state (
    id INT PRIMARY KEY DEFAULT 1,
    last_dispatch_date DATE,
    last_verse_id UUID REFERENCES public.daily_verses(id) ON DELETE SET NULL,
    mode VARCHAR(32) NOT NULL DEFAULT 'SEQUENTIAL',
    current_cycle INT NOT NULL DEFAULT 1,
    CONSTRAINT chk_single_dispatch_state CHECK (id = 1)
);
