-- Persist saved Theory items (Vocabulary, Grammar) per authenticated user.

CREATE TABLE IF NOT EXISTS public.user_saved_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocabulary_id UUID NOT NULL REFERENCES public.vocabulary(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, vocabulary_id)
);

CREATE TABLE IF NOT EXISTS public.user_saved_grammar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grammar_id UUID NOT NULL REFERENCES public.grammar(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, grammar_id)
);

CREATE INDEX IF NOT EXISTS idx_user_saved_vocabulary_user_created
  ON public.user_saved_vocabulary(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_saved_grammar_user_created
  ON public.user_saved_grammar(user_id, created_at DESC);

ALTER TABLE public.user_saved_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_grammar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own saved vocabulary" ON public.user_saved_vocabulary;
CREATE POLICY "Users can view own saved vocabulary"
  ON public.user_saved_vocabulary FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can save own vocabulary" ON public.user_saved_vocabulary;
CREATE POLICY "Users can save own vocabulary"
  ON public.user_saved_vocabulary FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unsave own vocabulary" ON public.user_saved_vocabulary;
CREATE POLICY "Users can unsave own vocabulary"
  ON public.user_saved_vocabulary FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own saved grammar" ON public.user_saved_grammar;
CREATE POLICY "Users can view own saved grammar"
  ON public.user_saved_grammar FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can save own grammar" ON public.user_saved_grammar;
CREATE POLICY "Users can save own grammar"
  ON public.user_saved_grammar FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unsave own grammar" ON public.user_saved_grammar;
CREATE POLICY "Users can unsave own grammar"
  ON public.user_saved_grammar FOR DELETE
  USING (auth.uid() = user_id);
