import { supabase } from './supabase';
import type { TestModel, QuestionModel, TestPartModel, VocabularyModel, GrammarModel, WritingPromptModel } from './types';

// ========== Test Repository ==========
export async function getFullTests(): Promise<TestModel[]> {
  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .or('type.eq.full_test,type.eq.fulltest,type.ilike.full%')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getMiniTests(): Promise<TestModel[]> {
  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .eq('type', 'mini_test')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAllTests(): Promise<TestModel[]> {
  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ========== Question Repository ==========
export async function getTestParts(testId: string): Promise<TestPartModel[]> {
  const { data, error } = await supabase
    .from('test_parts')
    .select('*')
    .eq('test_id', testId)
    .order('part_number');
  if (error) throw error;
  return data || [];
}

export async function getQuestionsByTestId(testId: string): Promise<QuestionModel[]> {
  const { data: parts, error: partsError } = await supabase
    .from('test_parts')
    .select('id')
    .eq('test_id', testId)
    .order('part_number');
  if (partsError) throw partsError;
  if (!parts?.length) return [];

  const partIds = parts.map(p => p.id);
  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select(`
      *,
      question_options(*),
      question_media(*),
      passages(*)
    `)
    .in('part_id', partIds)
    .order('order_index');
  if (qError) throw qError;

  return (questions || []).map((q: Record<string, unknown>) => ({
    id: q.id as string,
    part_id: q.part_id as string,
    passage_id: q.passage_id as string | null,
    question_text: q.question_text as string | null,
    order_index: q.order_index as number,
    options: (q.question_options || []) as unknown as QuestionModel['options'],
    media: (q.question_media || []) as unknown as QuestionModel['media'],
    passage: (q.passages || null) as unknown as QuestionModel['passage'],
  })) as QuestionModel[];
}

export async function getQuestionsByPartId(partId: string, limit?: number): Promise<QuestionModel[]> {
  let query = supabase
    .from('questions')
    .select(`
      *,
      question_options(*),
      question_media(*),
      passages(*)
    `)
    .eq('part_id', partId)
    .order('order_index');

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((q: Record<string, unknown>) => ({
    id: q.id as string,
    part_id: q.part_id as string,
    passage_id: q.passage_id as string | null,
    question_text: q.question_text as string | null,
    order_index: q.order_index as number,
    options: (q.question_options || []) as unknown as QuestionModel['options'],
    media: (q.question_media || []) as unknown as QuestionModel['media'],
    passage: (q.passages || null) as unknown as QuestionModel['passage'],
  })) as QuestionModel[];
}

export async function submitAttempt(
  userId: string,
  testId: string,
  score: number,
  answers: { question_id: string; option_id: string; is_correct: boolean }[]
) {
  const { data: attempt, error: attemptError } = await supabase
    .from('attempts')
    .insert({
      user_id: userId,
      test_id: testId,
      started_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      score,
    })
    .select()
    .single();
  if (attemptError) throw attemptError;

  const answerRows = answers.map(a => ({
    attempt_id: attempt.id,
    question_id: a.question_id,
    option_id: a.option_id,
    is_correct: a.is_correct,
  }));

  const { error: ansError } = await supabase.from('answers').insert(answerRows);
  if (ansError) throw ansError;
  return attempt;
}

// ========== Vocabulary & Grammar ==========
export async function getVocabulary(lesson?: number, scoreLevel?: number): Promise<VocabularyModel[]> {
  let query = supabase.from('vocabulary').select('*');
  if (lesson) query = query.eq('lesson', lesson);
  if (scoreLevel) query = query.eq('score_level', scoreLevel);
  query = query.order('sort_order');
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getGrammar(lesson?: number): Promise<GrammarModel[]> {
  let query = supabase.from('grammar').select('*');
  if (lesson) query = query.eq('lesson', lesson);
  query = query.order('sort_order');
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getLessonNumbers(): Promise<number[]> {
  const { data, error } = await supabase
    .from('vocabulary')
    .select('lesson')
    .order('lesson');
  if (error) throw error;
  const unique = [...new Set((data || []).map((d: { lesson: number }) => d.lesson))];
  return unique;
}

// ========== Writing ==========
export async function getWritingPrompts(partNumber: number): Promise<WritingPromptModel[]> {
  const { data, error } = await supabase
    .from('writing_prompts')
    .select('*')
    .eq('part_number', partNumber)
    .order('order_index');
  if (error) throw error;
  return data || [];
}

// ========== Practice ==========
export async function getListeningParts(testId: string) {
  const { data, error } = await supabase
    .from('test_parts')
    .select('*')
    .eq('test_id', testId)
    .in('part_number', [1, 2, 3, 4])
    .order('part_number');
  if (error) throw error;
  return data || [];
}

export async function getReadingParts(testId: string) {
  const { data, error } = await supabase
    .from('test_parts')
    .select('*')
    .eq('test_id', testId)
    .in('part_number', [5, 6, 7])
    .order('part_number');
  if (error) throw error;
  return data || [];
}

// ========== Auth ==========
export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const redirectTo = `${window.location.origin}/auth/callback`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Không thể khởi tạo đăng nhập Google');
  window.location.href = data.url;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ========== Profile ==========
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as { id: string; full_name: string; phone: string; role: string; avatar_url: string; created_at: string };
}

export async function updateUserProfile(userId: string, updates: { full_name?: string; phone?: string; avatar_url?: string }) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getUserStats(userId: string) {
  const { data, error } = await supabase
    .from('attempts')
    .select('score, submitted_at')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  const attempts = data || [];
  const totalTests = attempts.length;
  const bestScore = totalTests > 0 ? Math.max(...attempts.map((a: { score: number }) => a.score)) : 0;
  const avgScore = totalTests > 0 ? Math.round(attempts.reduce((s: number, a: { score: number }) => s + a.score, 0) / totalTests) : 0;
  return { totalTests, bestScore, avgScore };
}
