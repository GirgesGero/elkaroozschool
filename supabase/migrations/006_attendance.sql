-- 006_attendance.sql
-- Attendance sessions (Friday cycles) and trainee attendance records

CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id SMALLINT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN', -- 'OPEN' | 'LOCKED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT uq_group_session_date UNIQUE (group_id, session_date),
    CONSTRAINT chk_session_status CHECK (status IN ('OPEN', 'LOCKED'))
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    group_id SMALLINT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    trainee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL, -- 'PRESENT' | 'ABSENT' | 'LATE'
    notes TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT uq_session_trainee UNIQUE (session_id, trainee_id),
    CONSTRAINT chk_attendance_status CHECK (status IN ('PRESENT', 'ABSENT', 'LATE'))
);
