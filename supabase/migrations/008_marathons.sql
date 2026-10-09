-- 008_marathons.sql
-- Marathons, sections, questions, answers, submissions and automated 100-mark equal distribution

CREATE TABLE IF NOT EXISTS public.marathons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
    group_id SMALLINT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    total_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.marathon_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marathon_id UUID NOT NULL REFERENCES public.marathons(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    order_index INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marathon_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marathon_id UUID NOT NULL REFERENCES public.marathons(id) ON DELETE CASCADE,
    section_id UUID REFERENCES public.marathon_sections(id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(32) NOT NULL DEFAULT 'MCQ', -- 'MCQ'
    score_weight NUMERIC(6,3) NOT NULL DEFAULT 0.000,
    order_index INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marathon_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.marathon_questions(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    order_index INT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.marathon_trainee_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marathon_id UUID NOT NULL REFERENCES public.marathons(id) ON DELETE CASCADE,
    trainee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    group_id SMALLINT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    total_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    appreciation_grade VARCHAR(32) NOT NULL DEFAULT 'ضعيف',
    is_submitted BOOLEAN NOT NULL DEFAULT false,
    submitted_at TIMESTAMPTZ DEFAULT NULL,
    is_reopened BOOLEAN NOT NULL DEFAULT false,
    reopened_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reopened_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT uq_marathon_trainee_submission UNIQUE (marathon_id, trainee_id)
);

CREATE TABLE IF NOT EXISTS public.marathon_trainee_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.marathon_trainee_submissions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.marathon_questions(id) ON DELETE CASCADE,
    selected_answer_id UUID REFERENCES public.marathon_answers(id) ON DELETE CASCADE,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    score_awarded NUMERIC(6,3) NOT NULL DEFAULT 0.000,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_submission_question UNIQUE (submission_id, question_id)
);

-- Trigger Function to redistribute 100 marks equally across questions
CREATE OR REPLACE FUNCTION rebalance_marathon_question_weights()
RETURNS TRIGGER AS $$
DECLARE
    target_marathon_id UUID;
    total_q INT;
    weight_per_q NUMERIC(6,3);
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_marathon_id := OLD.marathon_id;
    ELSE
        target_marathon_id := NEW.marathon_id;
    END IF;

    SELECT COUNT(*) INTO total_q FROM public.marathon_questions WHERE marathon_id = target_marathon_id;

    IF total_q > 0 THEN
        weight_per_q := 100.000 / total_q;
        UPDATE public.marathon_questions
        SET score_weight = weight_per_q
        WHERE marathon_id = target_marathon_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rebalance_marathon_weights ON public.marathon_questions;
CREATE TRIGGER trg_rebalance_marathon_weights
AFTER INSERT OR DELETE ON public.marathon_questions
FOR EACH ROW
EXECUTE FUNCTION rebalance_marathon_question_weights();
