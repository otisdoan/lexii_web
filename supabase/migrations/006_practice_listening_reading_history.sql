-- Practice history for Listening/Reading attempts
-- Keep this separate from full-test attempts to avoid mixing data sources on practice screens.

CREATE TABLE IF NOT EXISTS practice_listening_reading_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attempt_id UUID REFERENCES attempts(id) ON DELETE SET NULL,
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

ALTER TABLE practice_listening_reading_history
  ADD COLUMN IF NOT EXISTS question_ids UUID[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_practice_lr_history_user_created
  ON practice_listening_reading_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_practice_lr_history_user_section
  ON practice_listening_reading_history(user_id, section, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_practice_lr_history_attempt
  ON practice_listening_reading_history(attempt_id);
