import { supabase } from './supabase';
import type {
  TestModel,
  QuestionModel,
  TestPartModel,
  VocabularyModel,
  GrammarModel,
  WritingPromptModel,
  RoadmapTemplateModel,
  RoadmapTaskModel,
  UserRoadmapModel,
  UserTaskProgressModel,
  SelfAssessedLevel,
  PracticePartData,
  AiGradeResult,
  AttemptHistoryItem,
  AttemptDetail,
  SubscriptionTransactionItem,
  UserPremiumSubscriptionInfo,
  NotificationItem,
} from './types';

export interface CreatePaymentRequest {
  planId: 'premium_6_months' | 'premium_1_year' | 'premium_lifetime';
  planName: string;
  amount: number;
  description: string;
  userId?: string;
  returnUrl?: string;
  cancelUrl?: string;
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

/** Lấy câu hỏi theo test, đảm bảo thứ tự: Part 1 (order_index) → Part 2 → … → Part 7. */
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
  const parts = await getTestParts(testId);
  if (!parts.length) return [];

  const result: QuestionModel[] = [];
  for (const part of parts) {
    const qs = await getQuestionsByPartId(part.id);
    result.push(...qs);
  }
  return result;
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

  const sortOptionsById = (opts: unknown[]) =>
    [...opts].sort((a, b) => String((a as { id?: string }).id ?? '').localeCompare(String((b as { id?: string }).id ?? '')));

  return (data || []).map((q: Record<string, unknown>) => ({
    id: q.id as string,
    part_id: q.part_id as string,
    passage_id: q.passage_id as string | null,
    question_text: q.question_text as string | null,
    order_index: q.order_index as number,
    options: sortOptionsById((q.question_options || []) as { id: string }[]) as unknown as QuestionModel['options'],
    media: (q.question_media || []) as unknown as QuestionModel['media'],
    passage: (q.passages || null) as unknown as QuestionModel['passage'],
  })) as QuestionModel[];
}

// ========== Placement Test (for Roadmap) ==========
// 15 câu rải đều 7 Parts từ một đề full test (vd TEST 1 - ETS 2023):
// Listening (8): Part 1 (2), Part 2 (2), Part 3 (2), Part 4 (2)
// Reading (7):  Part 5 (2), Part 6 (2), Part 7 (3)
const PLACEMENT_PER_PART = [2, 2, 2, 2, 2, 2, 3] as const; // Part 1..7

export async function getPlacementTestId(): Promise<string | null> {
  const fullTests = await getFullTests();
  if (!fullTests.length) return null;
  const preferred = fullTests.find(
    (t) => /TEST\s*1|ETS\s*2023/i.test(t.title || '')
  );
  return (preferred ?? fullTests[0]).id;
}

export async function getPlacementQuestions(_level?: SelfAssessedLevel): Promise<QuestionModel[]> {
  const testId = await getPlacementTestId();
  if (!testId) return [];
  const parts = await getTestParts(testId);
  if (!parts.length) return [];
  const orderedParts = [...parts].sort((a, b) => a.part_number - b.part_number);
  const result: QuestionModel[] = [];
  for (let i = 0; i < 7; i++) {
    const part = orderedParts.find((p) => p.part_number === i + 1);
    if (!part) continue;
    const limit = PLACEMENT_PER_PART[i];
    const questions = await getQuestionsByPartId(part.id, limit);
    result.push(...questions);
  }
  return result.slice(0, 15);
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

  const sortOptionsById = (opts: unknown[]) =>
    [...opts].sort((a, b) => String((a as { id?: string }).id ?? '').localeCompare(String((b as { id?: string }).id ?? '')));

  return (data || []).map((q: Record<string, unknown>) => ({
    id: q.id as string,
    part_id: q.part_id as string,
    passage_id: q.passage_id as string | null,
    question_text: q.question_text as string | null,
    order_index: q.order_index as number,
    options: sortOptionsById((q.question_options || []) as { id: string }[]) as unknown as QuestionModel['options'],
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

  const { data: test } = await supabase
    .from('tests')
    .select('title')
    .eq('id', testId)
    .maybeSingle();

  const submittedAt = new Date().toISOString();
  const submittedLabel = new Date(submittedAt).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  await supabase.from('notifications').insert({
    recipient_user_id: userId,
    type: 'test_completed',
    title: 'Ban vua hoan thanh bai test',
    body: `${(test?.title as string | undefined) || 'Bai thi TOEIC'} - diem ${score} luc ${submittedLabel}.`,
    metadata: {
      attemptId: attempt.id,
      testId,
      testTitle: (test?.title as string | undefined) || 'Bai thi TOEIC',
      score,
      submittedAt,
    },
  });

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

// ========== AI Grading ==========
export async function gradeAiAnswer(input: {
  mode: 'speaking' | 'writing';
  taskType: string;
  prompt: string;
  answer: string;
}): Promise<AiGradeResult> {
  const res = await fetch('/api/ai/grade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error('Không thể chấm bài bằng AI');
  }

  const data = (await res.json()) as { result: AiGradeResult };
  return data.result;
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

// ========== Roadmap ==========
export async function getRoadmapTemplates(): Promise<RoadmapTemplateModel[]> {
  const { data, error } = await supabase
    .from('roadmap_templates')
    .select('*')
    .order('target_score', { ascending: true })
    .order('duration_days', { ascending: true });
  if (error) throw error;
  return (data || []) as RoadmapTemplateModel[];
}

export async function getRoadmapTemplateByTargetAndDuration(
  targetScore: number,
  durationDays: number
): Promise<RoadmapTemplateModel | null> {
  const { data, error } = await supabase
    .from('roadmap_templates')
    .select('*')
    .eq('target_score', targetScore)
    .eq('duration_days', durationDays)
    .maybeSingle();
  if (error) throw error;
  return data as RoadmapTemplateModel | null;
}

export async function getRoadmapTasks(templateId: string): Promise<RoadmapTaskModel[]> {
  const { data, error } = await supabase
    .from('roadmap_tasks')
    .select('*')
    .eq('template_id', templateId)
    .order('day_number');
  if (error) throw error;
  return (data || []) as RoadmapTaskModel[];
}

export async function createUserRoadmap(
  userId: string,
  templateId: string,
  initialScore: number,
  targetScore: number
): Promise<UserRoadmapModel> {
  const { data, error } = await supabase
    .from('user_roadmaps')
    .insert({
      user_id: userId,
      template_id: templateId,
      initial_score: initialScore,
      target_score: targetScore,
      current_day: 1,
      status: 'active',
    })
    .select()
    .single();
  if (error) throw error;
  return data as UserRoadmapModel;
}

export async function getActiveUserRoadmap(userId: string): Promise<UserRoadmapModel | null> {
  const { data, error } = await supabase
    .from('user_roadmaps')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as UserRoadmapModel | null;
}

export async function getRoadmapById(roadmapId: string): Promise<UserRoadmapModel | null> {
  const { data, error } = await supabase
    .from('user_roadmaps')
    .select('*')
    .eq('id', roadmapId)
    .maybeSingle();
  if (error) throw error;
  return data as UserRoadmapModel | null;
}

export async function getUserTaskProgress(userRoadmapId: string): Promise<UserTaskProgressModel[]> {
  const { data, error } = await supabase
    .from('user_task_progress')
    .select('*')
    .eq('user_roadmap_id', userRoadmapId);
  if (error) throw error;
  return (data || []) as UserTaskProgressModel[];
}

export async function updateUserRoadmapCurrentDay(userRoadmapId: string, currentDay: number) {
  const { error } = await supabase
    .from('user_roadmaps')
    .update({ current_day: currentDay })
    .eq('id', userRoadmapId);
  if (error) throw error;
}

export async function dropUserRoadmap(userRoadmapId: string) {
  const { error } = await supabase
    .from('user_roadmaps')
    .update({ status: 'dropped' })
    .eq('id', userRoadmapId);
  if (error) throw error;
}

export async function getCurrentUserPremiumSubscriptionInfo(): Promise<UserPremiumSubscriptionInfo | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role,premium_expires_at')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) throw profileError;

  if ((profile?.role as string | undefined) !== 'premium') {
    return null;
  }

  const { data: paidOrders, error: orderError } = await supabase
    .from('subscription_orders')
    .select('plan_name,paid_at,is_lifetime')
    .eq('user_id', user.id)
    .eq('status', 'paid')
    .order('paid_at', { ascending: true });
  if (orderError) throw orderError;

  if (!paidOrders?.length) {
    return {
      startedAt: null,
      expiresAt: (profile?.premium_expires_at as string | null | undefined) ?? null,
      isLifetime: !profile?.premium_expires_at,
      planName: null,
    };
  }

  const firstPaidOrder = paidOrders[0] as { paid_at?: string | null };
  const latestPaidOrder = paidOrders[paidOrders.length - 1] as {
    plan_name?: string | null;
    is_lifetime?: boolean | null;
  };

  return {
    startedAt: firstPaidOrder.paid_at ?? null,
    expiresAt: (profile?.premium_expires_at as string | null | undefined) ?? null,
    isLifetime: Boolean(latestPaidOrder.is_lifetime) || !(profile?.premium_expires_at as string | null | undefined),
    planName: latestPaidOrder.plan_name ?? null,
  };
}

export async function getAdminSubscriptionTransactions(limit = 300): Promise<SubscriptionTransactionItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data: currentProfile, error: currentProfileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (currentProfileError) throw currentProfileError;
  if ((currentProfile?.role as string | undefined) !== 'admin') {
    throw new Error('Bạn không có quyền truy cập dữ liệu giao dịch');
  }

  const { data: orders, error: ordersError } = await supabase
    .from('subscription_orders')
    .select('id,user_id,plan_id,plan_name,amount,currency,order_code,status,provider,is_lifetime,paid_at,created_at,granted_until')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (ordersError) throw ordersError;

  if (!orders?.length) return [];

  const userIds = [...new Set((orders as Array<{ user_id: string }>).map((o) => o.user_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id,full_name,phone,premium_expires_at')
    .in('id', userIds);
  if (profilesError) throw profilesError;

  const profileMap = new Map<string, { full_name?: string | null; phone?: string | null; premium_expires_at?: string | null }>();
  for (const profile of (profiles || []) as Array<{ id: string; full_name?: string | null; phone?: string | null; premium_expires_at?: string | null }>) {
    profileMap.set(profile.id, profile);
  }

  return (orders as Array<{
    id: string;
    user_id: string;
    plan_id: string;
    plan_name: string;
    amount: number;
    currency: string;
    order_code: number;
    status: string;
    provider: string;
    is_lifetime: boolean;
    paid_at: string | null;
    created_at: string;
    granted_until: string | null;
  }>).map((order) => {
    const profile = profileMap.get(order.user_id);
    return {
      id: order.id,
      userId: order.user_id,
      userName: profile?.full_name || `User ${order.user_id.slice(0, 8)}`,
      userPhone: profile?.phone ?? null,
      planId: order.plan_id,
      planName: order.plan_name,
      amount: order.amount,
      currency: order.currency,
      orderCode: order.order_code,
      status: order.status,
      provider: order.provider,
      isLifetime: Boolean(order.is_lifetime),
      paidAt: order.paid_at,
      createdAt: order.created_at,
      grantedUntil: order.granted_until,
      premiumExpiresAt: profile?.premium_expires_at ?? null,
    };
  });
}

export async function getUserAttemptHistory(limit = 50): Promise<AttemptHistoryItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data: attempts, error: attemptsError } = await supabase
    .from('attempts')
    .select('id,test_id,score,submitted_at')
    .eq('user_id', user.id)
    .order('submitted_at', { ascending: false })
    .limit(limit);
  if (attemptsError) throw attemptsError;

  if (!attempts?.length) return [];

  const attemptIds = attempts.map((a: { id: string }) => a.id);
  const testIds = [...new Set(attempts.map((a: { test_id: string }) => a.test_id))];

  const [{ data: tests, error: testsError }, { data: answers, error: answersError }] = await Promise.all([
    supabase.from('tests').select('id,title').in('id', testIds),
    supabase.from('answers').select('attempt_id,is_correct').in('attempt_id', attemptIds),
  ]);
  if (testsError) throw testsError;
  if (answersError) throw answersError;

  const testTitleById: Record<string, string> = {};
  for (const t of (tests || []) as Array<{ id: string; title: string }>) {
    testTitleById[t.id] = t.title;
  }

  const statsByAttemptId: Record<string, { answered: number; correct: number }> = {};
  for (const row of (answers || []) as Array<{ attempt_id: string; is_correct: boolean | null }>) {
    if (!statsByAttemptId[row.attempt_id]) {
      statsByAttemptId[row.attempt_id] = { answered: 0, correct: 0 };
    }
    statsByAttemptId[row.attempt_id].answered += 1;
    if (row.is_correct) statsByAttemptId[row.attempt_id].correct += 1;
  }

  return attempts.map((a: { id: string; test_id: string; score: number; submitted_at: string }) => ({
    id: a.id,
    testId: a.test_id,
    testTitle: testTitleById[a.test_id] || 'Bài thi TOEIC',
    score: a.score || 0,
    submittedAt: a.submitted_at,
    answeredCount: statsByAttemptId[a.id]?.answered || 0,
    correctCount: statsByAttemptId[a.id]?.correct || 0,
  }));
}

export async function getAttemptDetail(attemptId: string): Promise<AttemptDetail | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data: attempt, error: attemptError } = await supabase
    .from('attempts')
    .select('id,test_id,score,submitted_at')
    .eq('id', attemptId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (attemptError) throw attemptError;
  if (!attempt) return null;

  const [{ data: test, error: testError }, { data: parts, error: partsError }, { data: answers, error: answersError }] = await Promise.all([
    supabase.from('tests').select('id,title').eq('id', attempt.test_id).maybeSingle(),
    supabase.from('test_parts').select('id,part_number').eq('test_id', attempt.test_id),
    supabase.from('answers').select('question_id,option_id,is_correct').eq('attempt_id', attempt.id),
  ]);
  if (testError) throw testError;
  if (partsError) throw partsError;
  if (answersError) throw answersError;

  const answerRows = (answers || []) as Array<{ question_id: string; option_id: string; is_correct: boolean | null }>;
  const questions = await getQuestionsByTestId(attempt.test_id);

  const partNumberByPartId: Record<string, number> = {};
  for (const p of (parts || []) as Array<{ id: string; part_number: number }>) {
    partNumberByPartId[p.id] = p.part_number;
  }

  const orderedQuestions = [...questions].sort((a, b) => {
    const partA = partNumberByPartId[a.part_id] || 999;
    const partB = partNumberByPartId[b.part_id] || 999;
    if (partA !== partB) return partA - partB;
    return a.order_index - b.order_index;
  });

  const selectedOptionIdByQuestionId: Record<string, string> = {};
  let correctCount = 0;
  for (const row of answerRows) {
    selectedOptionIdByQuestionId[row.question_id] = row.option_id;
    if (row.is_correct) correctCount += 1;
  }

  return {
    id: attempt.id,
    testId: attempt.test_id,
    testTitle: (test as { title?: string } | null)?.title || 'Bài thi TOEIC',
    score: attempt.score || 0,
    submittedAt: attempt.submitted_at,
    questions: orderedQuestions,
    selectedOptionIdByQuestionId,
    correctCount,
  };
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

function mapNotificationRow(row: {
  id: string;
  recipient_user_id: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}): NotificationItem {
  return {
    id: row.id,
    recipientUserId: row.recipient_user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    metadata: row.metadata || {},
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export async function getMyNotifications(limit = 10, offset = 0): Promise<NotificationItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('id,recipient_user_id,type,title,body,metadata,is_read,created_at')
    .eq('recipient_user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return ((data || []) as Array<{
    id: string;
    recipient_user_id: string;
    type: string;
    title: string;
    body: string;
    metadata: Record<string, unknown> | null;
    is_read: boolean;
    created_at: string;
  }>).map(mapNotificationRow);
}

export async function getMyUnreadNotificationCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_user_id', user.id)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
}

export async function markAllMyNotificationsAsRead(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_user_id', user.id)
    .eq('is_read', false);

  if (error) throw error;
}

export async function markMyNotificationAsRead(notificationId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('recipient_user_id', user.id);

  if (error) throw error;
}
