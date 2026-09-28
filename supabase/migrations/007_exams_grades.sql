-- 007_exams_grades.sql
-- Exams (Strictly 1 exam per term) and Trainee Grades with automatic appreciation grade calculation

CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
    group_id SMALLINT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    max_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    exam_date DATE NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT uq_exam_per_term UNIQUE (term_id, group_id)
);

CREATE TABLE IF NOT EXISTS public.exam_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    group_id SMALLINT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    trainee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    numeric_score NUMERIC(5,2) NOT NULL,
    appreciation_grade VARCHAR(32) NOT NULL,
    notes TEXT,
    graded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    graded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT uq_exam_trainee UNIQUE (exam_id, trainee_id),
    CONSTRAINT chk_exam_appreciation CHECK (appreciation_grade IN ('ضعيف', 'مقبول', 'جيد', 'جيد جدًا', 'ممتاز'))
);

-- Trigger Function to calculate appreciation grade automatically before insert/update
CREATE OR REPLACE FUNCTION compute_exam_appreciation()
RETURNS TRIGGER AS $$
DECLARE
    exam_max NUMERIC(5,2);
    percentage NUMERIC(5,2);
BEGIN
    SELECT max_score INTO exam_max FROM public.exams WHERE id = NEW.exam_id;
    IF exam_max IS NULL OR exam_max <= 0 THEN
        exam_max := 100.00;
    END IF;

    percentage := (NEW.numeric_score / exam_max) * 100.0;

    IF percentage < 60.0 THEN
        NEW.appreciation_grade := 'ضعيف';
    ELSIF percentage < 70.0 THEN
        NEW.appreciation_grade := 'مقبول';
    ELSIF percentage < 80.0 THEN
        NEW.appreciation_grade := 'جيد';
    ELSIF percentage < 90.0 THEN
        NEW.appreciation_grade := 'جيد جدًا';
    ELSE
        NEW.appreciation_grade := 'ممتاز';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_compute_exam_appreciation ON public.exam_grades;
CREATE TRIGGER trg_compute_exam_appreciation
BEFORE INSERT OR UPDATE ON public.exam_grades
FOR EACH ROW
EXECUTE FUNCTION compute_exam_appreciation();
