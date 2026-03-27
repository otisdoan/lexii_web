-- Standalone practice history tables for Listening/Reading (MCQ)
-- Do not reuse full-test attempts/answers tables.

CREATE TABLE IF NOT EXISTS practice_mcq_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  test_id UUID REFERENCES tests(id) ON DELETE SET NULL,
  section VARCHAR(20) NOT NULL CHECK (section IN ('listening', 'reading')),
  part_number INTEGER NOT NULL CHECK (part_number BETWEEN 1 AND 7),
  question_ids UUID[] NOT NULL DEFAULT '{}',
  question_count INTEGER NOT NULL DEFAULT 0 CHECK (question_count >= 0),
  answered_count INTEGER NOT NULL DEFAULT 0 CHECK (answered_count >= 0),
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS practice_mcq_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES practice_mcq_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option_id UUID NOT NULL REFERENCES question_options(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_mcq_attempts_user_created
  ON practice_mcq_attempts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_practice_mcq_attempts_user_section
  ON practice_mcq_attempts(user_id, section, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_practice_mcq_answers_attempt
  ON practice_mcq_answers(attempt_id);
