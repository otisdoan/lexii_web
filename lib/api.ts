import { supabase } from './supabase';
import type {
  TestModel,
  QuestionModel,
  TestPartModel,
  VocabularyModel,
  GrammarModel,
  WritingPromptModel,
  PracticePartData,
} from './types';

export interface CreatePaymentRequest {
  planId: 'premium_6_months' | 'premium_1_year' | 'premium_lifetime';
  planName: string;
  amount: number;
  description: string;
  userId?: string;
}

export interface CreatePaymentResponse {
  checkoutUrl: string | null;
  paymentLinkId?: string | null;
  qrCode?: string | null;
  vietQrData?: string | null;
  orderCode: number;
}

export interface ConfirmPaymentResponse {
  status: 'paid' | 'pending' | 'cancelled' | 'failed';
  alreadyProcessed?: boolean;
  premiumExpiresAt?: string | null;
  isLifetime?: boolean;
  message?: string;
}

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

export async function getTestById(testId: string): Promise<TestModel | null> {
  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .eq('id', testId)
    .maybeSingle();
  if (error) throw error;
  return (data as TestModel | null) ?? null;
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

export async function getTestPartById(partId: string): Promise<TestPartModel | null> {
  const { data, error } = await supabase
    .from('test_parts')
    .select('*')
    .eq('id', partId)
    .maybeSingle();
  if (error) throw error;
  return (data as TestPartModel | null) ?? null;
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

export async function getQuestionsByIds(questionIds: string[]): Promise<QuestionModel[]> {
  if (!questionIds.length) return [];

  const { data, error } = await supabase
    .from('questions')
    .select(`
      *,
      question_options(*),
      question_media(*),
      passages(*)
    `)
    .in('id', questionIds)
    .order('order_index');
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

export async function getListeningPracticeParts(): Promise<PracticePartData[]> {
  const { data: tests, error: testsError } = await supabase
    .from('tests')
    .select('id')
    .or('type.eq.full_test,type.eq.fulltest,type.ilike.full%')
    .order('created_at', { ascending: true });
  if (testsError) throw testsError;
  if (!tests?.length) return [];

  const testIds = tests.map((t: { id: string }) => t.id);
  const fallbackTestId = testIds[0];

  const { data: parts, error: partsError } = await supabase
    .from('test_parts')
    .select('id,test_id,part_number')
    .in('test_id', testIds)
    .in('part_number', [1, 2, 3, 4])
    .order('part_number');
  if (partsError) throw partsError;
  if (!parts?.length) return [];

  const partIdsByNumber: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [] };
  const partNumberByPartId: Record<string, number> = {};
  for (const p of parts as Array<{ id: string; part_number: number }>) {
    partIdsByNumber[p.part_number]?.push(p.id);
    partNumberByPartId[p.id] = p.part_number;
  }

  const allPartIds = Object.keys(partNumberByPartId);
  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('id,part_id')
    .in('part_id', allPartIds);
  if (questionsError) throw questionsError;

  const questionCountByPartId: Record<string, number> = {};
  for (const q of (questions || []) as Array<{ part_id: string }>) {
    questionCountByPartId[q.part_id] = (questionCountByPartId[q.part_id] || 0) + 1;
  }

  const user = await getCurrentUser();
  const statsByPartNumber: Record<number, { answered: number; correct: number }> = {
    1: { answered: 0, correct: 0 },
    2: { answered: 0, correct: 0 },
    3: { answered: 0, correct: 0 },
    4: { answered: 0, correct: 0 },
  };

  if (user) {
    const { data: historyRows, error: historyError } = await supabase
      .from('listening_answer_history')
      .select('question_id,is_correct')
      .eq('user_id', user.id);
    if (historyError) throw historyError;

    const historyQuestionIds = [...new Set((historyRows || []).map((r: { question_id: string }) => r.question_id))];
    if (historyQuestionIds.length) {
      const { data: hqRows, error: hqError } = await supabase
        .from('questions')
        .select('id,part_id')
        .in('id', historyQuestionIds);
      if (hqError) throw hqError;

      const partIdByQuestionId: Record<string, string> = {};
      for (const q of (hqRows || []) as Array<{ id: string; part_id: string }>) {
        partIdByQuestionId[q.id] = q.part_id;
      }

      for (const row of (historyRows || []) as Array<{ question_id: string; is_correct: boolean | null }>) {
        const partId = partIdByQuestionId[row.question_id];
        if (!partId) continue;
        const partNumber = partNumberByPartId[partId];
        if (!partNumber || partNumber < 1 || partNumber > 4) continue;
        statsByPartNumber[partNumber].answered += 1;
        if (row.is_correct) statsByPartNumber[partNumber].correct += 1;
      }
    }
  }

  return [1, 2, 3, 4].map((partNumber) => {
    const ids = partIdsByNumber[partNumber] || [];
    const total = ids.reduce((sum, id) => sum + (questionCountByPartId[id] || 0), 0);
    const stats = statsByPartNumber[partNumber];
    return {
      partId: ids[0] || `part-${partNumber}`,
      testId: fallbackTestId,
      partNumber,
      partTitle: `Part ${partNumber}`,
      questionCount: total,
      answeredCount: stats.answered,
      correctCount: stats.correct,
      iconName: 'headphones',
      colorHex: '#0ea5e9',
      bgColorHex: '#eff6ff',
      questionType: 'mcq_audio',
    } as PracticePartData;
  });
}

export async function getWrongListeningQuestionIds(limit = 200): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data: wrongRows, error: wrongError } = await supabase
    .from('wrong_questions')
    .select('question_id,last_answered_at')
    .eq('user_id', user.id)
    .order('last_answered_at', { ascending: false })
    .limit(limit);
  if (wrongError) throw wrongError;
  const orderedIds = (wrongRows || []).map((r: { question_id: string }) => r.question_id);
  if (!orderedIds.length) return [];

  const { data: questionRows, error: qError } = await supabase
    .from('questions')
    .select('id,part_id')
    .in('id', orderedIds);
  if (qError) throw qError;

  const partIds = [...new Set((questionRows || []).map((q: { part_id: string }) => q.part_id))];
  if (!partIds.length) return [];

  const { data: partRows, error: partError } = await supabase
    .from('test_parts')
    .select('id,part_number')
    .in('id', partIds);
  if (partError) throw partError;

  const numberByPartId: Record<string, number> = {};
  for (const p of (partRows || []) as Array<{ id: string; part_number: number }>) {
    numberByPartId[p.id] = p.part_number;
  }
  const partIdByQuestionId: Record<string, string> = {};
  for (const q of (questionRows || []) as Array<{ id: string; part_id: string }>) {
    partIdByQuestionId[q.id] = q.part_id;
  }

  return orderedIds.filter((qid) => {
    const partId = partIdByQuestionId[qid];
    if (!partId) return false;
    const partNumber = numberByPartId[partId];
    return partNumber >= 1 && partNumber <= 4;
  });
}

export async function getWrongReadingQuestionIds(limit = 200): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data: wrongRows, error: wrongError } = await supabase
    .from('wrong_questions')
    .select('question_id,last_answered_at')
    .eq('user_id', user.id)
    .order('last_answered_at', { ascending: false })
    .limit(limit);
  if (wrongError) throw wrongError;
  const orderedIds = (wrongRows || []).map((r: { question_id: string }) => r.question_id);
  if (!orderedIds.length) return [];

  const { data: questionRows, error: qError } = await supabase
    .from('questions')
    .select('id,part_id')
    .in('id', orderedIds);
  if (qError) throw qError;

  const partIds = [...new Set((questionRows || []).map((q: { part_id: string }) => q.part_id))];
  if (!partIds.length) return [];

  const { data: partRows, error: partError } = await supabase
    .from('test_parts')
    .select('id,part_number')
    .in('id', partIds);
  if (partError) throw partError;

  const numberByPartId: Record<string, number> = {};
  for (const p of (partRows || []) as Array<{ id: string; part_number: number }>) {
    numberByPartId[p.id] = p.part_number;
  }
  const partIdByQuestionId: Record<string, string> = {};
  for (const q of (questionRows || []) as Array<{ id: string; part_id: string }>) {
    partIdByQuestionId[q.id] = q.part_id;
  }

  return orderedIds.filter((qid) => {
    const partId = partIdByQuestionId[qid];
    if (!partId) return false;
    const partNumber = numberByPartId[partId];
    return partNumber >= 5 && partNumber <= 7;
  });
}

export async function getQuestionsByReadingPartNumber(
  partNumber: number,
  limit?: number,
): Promise<QuestionModel[]> {
  const { data: tests, error: testsError } = await supabase
    .from('tests')
    .select('id')
    .or('type.eq.full_test,type.eq.fulltest,type.ilike.full%')
    .order('created_at', { ascending: true });
  if (testsError) throw testsError;
  if (!tests?.length) return [];

  const testIds = tests.map((t: { id: string }) => t.id);
  const { data: parts, error: partsError } = await supabase
    .from('test_parts')
    .select('id')
    .in('test_id', testIds)
    .eq('part_number', partNumber);
  if (partsError) throw partsError;
  if (!parts?.length) return [];

  let query = supabase
    .from('questions')
    .select(`
      *,
      question_options(*),
      question_media(*),
      passages(*)
    `)
    .in('part_id', parts.map((p: { id: string }) => p.id))
    .order('order_index');

  if (limit && limit > 0) query = query.limit(limit);

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

export async function saveListeningPracticeTracking(
  questions: QuestionModel[],
  userAnswers: Record<number, number>,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const now = new Date().toISOString();
  const historyRows: Array<{ user_id: string; question_id: string; selected_option_id: string | null; is_correct: boolean; answered_at: string }> = [];
  const wrongSelectionByQuestionId: Record<string, string> = {};

  questions.forEach((q, i) => {
    const selectedIdx = userAnswers[i];
    if (selectedIdx === undefined || selectedIdx < 0 || selectedIdx >= q.options.length) return;
    const selected = q.options[selectedIdx];
    historyRows.push({
      user_id: user.id,
      question_id: q.id,
      selected_option_id: selected?.id || null,
      is_correct: Boolean(selected?.is_correct),
      answered_at: now,
    });
    if (!selected?.is_correct && selected?.id) {
      wrongSelectionByQuestionId[q.id] = selected.id;
    }
  });

  if (historyRows.length) {
    const { error } = await supabase.from('listening_answer_history').insert(historyRows);
    if (error) throw error;
  }

  const wrongIds = Object.keys(wrongSelectionByQuestionId);
  if (!wrongIds.length) return;

  const { data: existingRows, error: existingError } = await supabase
    .from('wrong_questions')
    .select('question_id,wrong_count')
    .eq('user_id', user.id)
    .in('question_id', wrongIds);
  if (existingError) throw existingError;

  const existingCountByQuestionId: Record<string, number> = {};
  for (const row of (existingRows || []) as Array<{ question_id: string; wrong_count: number | null }>) {
    existingCountByQuestionId[row.question_id] = row.wrong_count || 0;
  }

  const upsertRows = wrongIds.map((qid) => ({
    user_id: user.id,
    question_id: qid,
    last_selected_option_id: wrongSelectionByQuestionId[qid],
    wrong_count: (existingCountByQuestionId[qid] || 0) + 1,
    last_answered_at: now,
  }));

  const { error: upsertError } = await supabase
    .from('wrong_questions')
    .upsert(upsertRows, { onConflict: 'user_id,question_id' });
  if (upsertError) throw upsertError;
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

export async function getReadingPracticeParts(): Promise<PracticePartData[]> {
  const { data: tests, error: testsError } = await supabase
    .from('tests')
    .select('id')
    .or('type.eq.full_test,type.eq.fulltest,type.ilike.full%')
    .order('created_at', { ascending: true });
  if (testsError) throw testsError;
  if (!tests?.length) return [];

  const testIds = tests.map((t: { id: string }) => t.id);
  const fallbackTestId = testIds[0];

  const { data: parts, error: partsError } = await supabase
    .from('test_parts')
    .select('id,test_id,part_number')
    .in('test_id', testIds)
    .in('part_number', [5, 6, 7])
    .order('part_number');
  if (partsError) throw partsError;
  if (!parts?.length) return [];

  const partIdsByNumber: Record<number, string[]> = { 5: [], 6: [], 7: [] };
  const partNumberByPartId: Record<string, number> = {};
  for (const p of parts as Array<{ id: string; part_number: number }>) {
    partIdsByNumber[p.part_number]?.push(p.id);
    partNumberByPartId[p.id] = p.part_number;
  }

  const allPartIds = Object.keys(partNumberByPartId);
  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('id,part_id')
    .in('part_id', allPartIds);
  if (questionsError) throw questionsError;

  const questionCountByPartId: Record<string, number> = {};
  for (const q of (questions || []) as Array<{ part_id: string }>) {
    questionCountByPartId[q.part_id] = (questionCountByPartId[q.part_id] || 0) + 1;
  }

  const user = await getCurrentUser();
  const statsByPartNumber: Record<number, { answered: number; correct: number }> = {
    5: { answered: 0, correct: 0 },
    6: { answered: 0, correct: 0 },
    7: { answered: 0, correct: 0 },
  };

  if (user) {
    const { data: attempts, error: attemptsError } = await supabase
      .from('attempts')
      .select('id')
      .eq('user_id', user.id)
      .in('test_id', testIds);
    if (attemptsError) throw attemptsError;

    const attemptIds = (attempts || []).map((a: { id: string }) => a.id);
    if (attemptIds.length) {
      const { data: answers, error: answersError } = await supabase
        .from('answers')
        .select('question_id,is_correct')
        .in('attempt_id', attemptIds);
      if (answersError) throw answersError;

      const answerQuestionIds = [...new Set((answers || []).map((a: { question_id: string }) => a.question_id))];
      if (answerQuestionIds.length) {
        const { data: aqRows, error: aqError } = await supabase
          .from('questions')
          .select('id,part_id')
          .in('id', answerQuestionIds);
        if (aqError) throw aqError;

        const partIdByQuestionId: Record<string, string> = {};
        for (const q of (aqRows || []) as Array<{ id: string; part_id: string }>) {
          partIdByQuestionId[q.id] = q.part_id;
        }

        for (const row of (answers || []) as Array<{ question_id: string; is_correct: boolean | null }>) {
          const partId = partIdByQuestionId[row.question_id];
          if (!partId) continue;
          const partNumber = partNumberByPartId[partId];
          if (!partNumber || partNumber < 5 || partNumber > 7) continue;
          statsByPartNumber[partNumber].answered += 1;
          if (row.is_correct) statsByPartNumber[partNumber].correct += 1;
        }
      }
    }
  }

  return [5, 6, 7].map((partNumber) => {
    const ids = partIdsByNumber[partNumber] || [];
    const total = ids.reduce((sum, id) => sum + (questionCountByPartId[id] || 0), 0);
    const stats = statsByPartNumber[partNumber];
    return {
      partId: ids[0] || `part-${partNumber}`,
      testId: fallbackTestId,
      partNumber,
      partTitle: `Part ${partNumber}`,
      questionCount: total,
      answeredCount: stats.answered,
      correctCount: stats.correct,
      iconName: 'book-open',
      colorHex: '#059669',
      bgColorHex: '#ecfdf5',
      questionType: 'mcq_text',
    } as PracticePartData;
  });
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

export async function getCurrentUserRole(): Promise<'admin' | 'premium' | 'user'> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'user';

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const role = String(data?.role ?? 'user');
  if (role === 'admin' || role === 'premium') {
    return role;
  }
  return 'user';
}

// ========== Profile ==========
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as { id: string; full_name: string; phone: string; role: string; avatar_url: string; created_at: string; premium_expires_at?: string | null };
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

// ========== Payments ==========
export async function createPayosPayment(payload: CreatePaymentRequest): Promise<CreatePaymentResponse> {
  const { data, error } = await supabase.functions.invoke('create-payos-payment', {
    body: payload,
  });

  if (error) {
    throw new Error(error.message || 'Không thể khởi tạo thanh toán');
  }

  if (!data?.orderCode) {
    throw new Error(data?.error || 'Phản hồi thanh toán không hợp lệ');
  }

  return data as CreatePaymentResponse;
}

export async function confirmPayosPayment(orderCode: number, userId?: string): Promise<ConfirmPaymentResponse> {
  const { data, error } = await supabase.functions.invoke('confirm-payment', {
    body: {
      orderCode,
      userId,
    },
  });

  if (error) {
    throw new Error(error.message || 'Không thể xác nhận thanh toán');
  }

  if (!data?.status) {
    throw new Error(data?.error || 'Phản hồi xác nhận thanh toán không hợp lệ');
  }

  return data as ConfirmPaymentResponse;
}
