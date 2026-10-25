BEGIN;

-- 20261024100000_attendance_thursday_freeze.sql
-- Enforce Friday-to-Wednesday cycle and Thursday mandatory lock on attendance records

CREATE OR REPLACE FUNCTION public.check_attendance_thursday_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_session record;
    v_diff_days integer;
BEGIN
    SELECT id, session_date, status
    INTO v_session
    FROM public.attendance_sessions
    WHERE id = NEW.session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'جلسة الحضور المحددة غير موجودة'
            USING ERRCODE = 'P0002';
    END IF;

    -- 1. Check if session is explicitly locked
    IF v_session.status = 'LOCKED' THEN
        RAISE EXCEPTION 'الجلسة مغلقة نهائياً؛ لا يمكن تسجيل أو تعديل الحضور'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Enforce Friday-to-Wednesday cycle (Thursday freeze)
    -- Friday = Day 0, Wednesday = Day +5, Thursday = Day +6 (Locked)
    v_diff_days := (CURRENT_DATE - v_session.session_date);

    IF v_diff_days < 0 THEN
        RAISE EXCEPTION 'لا يمكن تسجيل الحضور قبل تاريخ الجلسة'
            USING ERRCODE = '42501';
    END IF;

    IF v_diff_days > 5 THEN
        -- Update session status to LOCKED
        UPDATE public.attendance_sessions
        SET status = 'LOCKED', closed_at = COALESCE(closed_at, now())
        WHERE id = v_session.id AND status = 'OPEN';

        RAISE EXCEPTION 'الجلسة مغلقة نهائياً (قفل الخميس الإجباري)؛ لا يمكن تسجيل أو تعديل الحضور'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attendance_thursday_freeze ON public.attendance_records;
CREATE TRIGGER trg_attendance_thursday_freeze
    BEFORE INSERT OR UPDATE ON public.attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION public.check_attendance_thursday_lock();

COMMIT;
