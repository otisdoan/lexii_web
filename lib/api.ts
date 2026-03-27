import { supabase } from './supabase';
import type {
  TestModel,
  QuestionModel,
  TestPartModel,
  VocabularyModel,
  GrammarModel,
  WritingPromptModel,
  SpeakingPromptModel,
  PracticeHistoryItem,
  PracticeListeningReadingHistoryItem,
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

const QUESTIONS_PAGE_SIZE = 1000;
const MAX_READING_PART5_QUESTIONS = 200;
const MAX_HEAVY_READING_QUESTIONS = 300;

type QuestionBaseRow = {
  id: string;
  part_id: string;
  passage_id: string | null;
  question_text: string | null;
  order_index: number;
};

async function fetchQuestionsByPartIdsLight(
  partIds: string[],
  limit?: number,
): Promise<QuestionModel[]> {
  if (!partIds.length) return [];

  const maxRows = typeof limit === 'number' && limit > 0 ? limit : undefined;
  const questionRows: QuestionBaseRow[] = [];
  let from = 0;

  while (true) {
    const to = from + QUESTIONS_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('questions')
      .select('id,part_id,passage_id,question_text,order_index')
      .in('part_id', partIds)
      .order('order_index')
      .range(from, to);

    if (error) throw error;

    const page = (data || []) as QuestionBaseRow[];
    if (!page.length) break;

    questionRows.push(...page);
    if (maxRows && questionRows.length >= maxRows) break;
    if (page.length < QUESTIONS_PAGE_SIZE) break;
    from += QUESTIONS_PAGE_SIZE;
  }

  const baseRows = maxRows ? questionRows.slice(0, maxRows) : questionRows;
  if (!baseRows.length) return [];

  const questionIds = baseRows.map((q) => q.id);

  const [optionsRes, mediaRes] = await Promise.all([
    supabase
      .from('question_options')
      .select('id,question_id,content,is_correct')
      .in('question_id', questionIds),
    supabase
      .from('question_media')
      .select('id,question_id,type,url')
      .in('question_id', questionIds),
  ]);

  if (optionsRes.error) throw optionsRes.error;
  if (mediaRes.error) throw mediaRes.error;

  const passageIds = [
    ...new Set(baseRows.map((q) => q.passage_id).filter(Boolean) as string[]),
  ];

  let passageById: Record<string, QuestionModel['passage']> = {};
  if (passageIds.length) {
    const { data: passages, error: passageError } = await supabase
      .from('passages')
      .select('id,part_id,title,content')
      .in('id', passageIds);
    if (passageError) throw passageError;

    passageById = Object.fromEntries(
      ((passages || []) as Array<Record<string, unknown>>).map((p) => [
        p.id as string,
        {
          id: p.id as string,
          part_id: (p.part_id as string) || '',
          title: (p.title as string) || '',
          content: (p.content as string) || '',
        },
      ]),
    );
  }

  const optionsByQuestionId: Record<string, QuestionModel['options']> = {};
  for (const row of (optionsRes.data || []) as Array<Record<string, unknown>>) {
    const qid = row.question_id as string;
    if (!optionsByQuestionId[qid]) optionsByQuestionId[qid] = [];
    optionsByQuestionId[qid].push({
      id: row.id as string,
      question_id: qid,
      content: (row.content as string) || '',
      is_correct: Boolean(row.is_correct),
    });
  }

  const mediaByQuestionId: Record<string, QuestionModel['media']> = {};
  for (const row of (mediaRes.data || []) as Array<Record<string, unknown>>) {
    const qid = row.question_id as string;
    if (!mediaByQuestionId[qid]) mediaByQuestionId[qid] = [];
    mediaByQuestionId[qid].push({
      id: row.id as string,
      question_id: qid,
      type: ((row.type as string) || 'text') as 'audio' | 'image' | 'text',
      url: (row.url as string) || '',
    });
  }

  return baseRows.map((q) => ({
    id: q.id,
    part_id: q.part_id,
    passage_id: q.passage_id,
    question_text: q.question_text,
    order_index: q.order_index,
    options: optionsByQuestionId[q.id] || [],
    media: mediaByQuestionId[q.id] || [],
    passage: q.passage_id ? passageById[q.passage_id] || undefined : undefined,
  }));
}

async function fetchAllQuestionsByPartIds(
  partIds: string[],
): Promise<Array<{ id: string; part_id: string }>> {
  if (!partIds.length) return [];

  const rows: Array<{ id: string; part_id: string }> = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('questions')
      .select('id,part_id')
      .in('part_id', partIds)
      .range(from, from + QUESTIONS_PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data || []) as Array<{ id: string; part_id: string }>;
    if (!page.length) break;

    rows.push(...page);

    if (page.length < QUESTIONS_PAGE_SIZE) break;
    from += QUESTIONS_PAGE_SIZE;
  }

  return rows;
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

export async function getQuestionsByPartId(
  partId: string,
  limit?: number,
): Promise<QuestionModel[]> {
  return fetchQuestionsByPartIdsLight([partId], limit);
}

export async function getQuestionsByListeningPartNumber(
  partNumber: number,
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
    .select('id,part_number,test_id')
    .in('test_id', testIds)
    .eq('part_number', partNumber);
  if (partsError) throw partsError;
  if (!parts?.length) return [];

  const partIds = (parts as Array<{ id: string; test_id: string }>).map(p => p.id);
  const partTestIdMap: Record<string, string> = {};
  for (const p of parts as Array<{ id: string; test_id: string }>) {
    partTestIdMap[p.id] = p.test_id;
  }

  const { data, error } = await supabase
    .from('questions')
    .select(`
      *,
      question_options(*),
      question_media(*),
      passages(*)
    `)
    .in('part_id', partIds)
    .order('order_index');

  if (error) throw error;

  // Map test_id vào question
  const withTestId = (data || []).map((q: Record<string, unknown>) => ({
    ...q,
    test_id: partTestIdMap[q.part_id as string],
  }));

  // Sort: theo test order, rồi group audio trong mỗi test
  // Nhóm cùng audio lại, giữ thứ tự test
  const testOrder: Record<string, number> = {};
  testIds.forEach((id, idx) => { testOrder[id] = idx; });

  const sorted = [...withTestId].sort((a, b) => {
    const aOrd = testOrder[(a as Record<string, unknown>)['test_id'] as string] ?? 0;
    const bOrd = testOrder[(b as Record<string, unknown>)['test_id'] as string] ?? 0;
    if (aOrd !== bOrd) return aOrd - bOrd;

    // Trong cùng test: sort theo audio_url để group cùng audio nằm liền nhau
    const aMedia = (((a as Record<string, unknown>).question_media || []) as Array<{ type: string; url: string }>);
    const bMedia = (((b as Record<string, unknown>).question_media || []) as Array<{ type: string; url: string }>);
    const aAudio = aMedia.find(m => m.type === 'audio')?.url || '';
    const bAudio = bMedia.find(m => m.type === 'audio')?.url || '';

    if (aAudio !== bAudio) {
      // Có audio trước, không audio sau
      if (aAudio && !bAudio) return -1;
      if (!aAudio && bAudio) return 1;
      return aAudio.localeCompare(bAudio);
    }

    return ((a as Record<string, unknown>)['order_index'] as number || 0) - ((b as Record<string, unknown>)['order_index'] as number || 0);
  });

  return sorted.map((q: Record<string, unknown>) => ({
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

  if (answerRows.length > 0) {
    const { error: ansError } = await supabase.from('answers').insert(answerRows);
    if (ansError) throw ansError;
  }

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

export async function getVocabularyCount(): Promise<number> {
  const { count, error } = await supabase
    .from('vocabulary')
    .select('*', { count: 'exact', head: true });
  if (error) return 0;
  return count || 0;
}

export async function getGrammarCount(): Promise<number> {
  const { count, error } = await supabase
    .from('grammar')
    .select('*', { count: 'exact', head: true });
  if (error) return 0;
  return count || 0;
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

export async function getSavedVocabularyIds(): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_saved_vocabulary')
    .select('vocabulary_id')
    .eq('user_id', user.id);

  if (error) throw error;
  return (data || []).map((row: { vocabulary_id: string }) => row.vocabulary_id);
}

export async function getSavedVocabularyCount(): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('user_saved_vocabulary')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (error) return 0;
  return count || 0;
}

export async function setVocabularySaved(
  vocabularyId: string,
  isSaved: boolean,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Bạn cần đăng nhập để lưu từ vựng.');
  }

  if (isSaved) {
    const { error } = await supabase.from('user_saved_vocabulary').upsert(
      {
        user_id: user.id,
        vocabulary_id: vocabularyId,
      },
      { onConflict: 'user_id,vocabulary_id' },
    );
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('user_saved_vocabulary')
    .delete()
    .eq('user_id', user.id)
    .eq('vocabulary_id', vocabularyId);
  if (error) throw error;
}

export async function getSavedGrammarIds(): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_saved_grammar')
    .select('grammar_id')
    .eq('user_id', user.id);

  if (error) throw error;
  return (data || []).map((row: { grammar_id: string }) => row.grammar_id);
}

export async function getSavedGrammarCount(): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('user_saved_grammar')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (error) return 0;
  return count || 0;
}

export async function setGrammarSaved(
  grammarId: string,
  isSaved: boolean,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Bạn cần đăng nhập để lưu ngữ pháp.');
  }

  if (isSaved) {
    const { error } = await supabase.from('user_saved_grammar').upsert(
      {
        user_id: user.id,
        grammar_id: grammarId,
      },
      { onConflict: 'user_id,grammar_id' },
    );
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('user_saved_grammar')
    .delete()
    .eq('user_id', user.id)
    .eq('grammar_id', grammarId);
  if (error) throw error;
}

// ========== Writing ==========
export async function getWritingPartsCount(): Promise<Record<number, number>> {
  const { data, error } = await supabase
    .from('writing_prompts')
    .select('part_number');
  if (error) throw error;
  const counts: Record<number, number> = {};
  for (const row of data || []) {
    counts[row.part_number] = (counts[row.part_number] || 0) + 1;
  }
  return counts;
}

export async function getWritingPrompts(
  partNumber: number,
  questionLimit?: number,
): Promise<WritingPromptModel[]> {
  let query = supabase
    .from('writing_prompts')
    .select('*')
    .eq('part_number', partNumber)
    .order('order_index');
  if (questionLimit && questionLimit > 0) {
    query = query.limit(questionLimit);
  }
  const { data, error } = await query;
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

  // Lấy part từ test đầu tiên để practice dùng (getQuestionsByPartId chỉ nhận 1 partId)
  const { data: firstTestParts, error: firstPartsError } = await supabase
    .from('test_parts')
    .select('id,test_id,part_number')
    .eq('test_id', fallbackTestId)
    .in('part_number', [1, 2, 3, 4])
    .order('part_number');
  if (firstPartsError) throw firstPartsError;

  // Map part_number -> part_id của test đầu tiên
  const partIdsByNumber: Record<number, string> = {};
  const partNumberByPartId: Record<string, number> = {};
  for (const p of firstTestParts as Array<{ id: string; part_number: number }>) {
    partIdsByNumber[p.part_number] = p.id;
    partNumberByPartId[p.id] = p.part_number;
  }

  // Đếm câu từ TẤT CẢ tests — để hiển thị đúng tổng số câu
  const { data: allParts, error: allPartsError } = await supabase
    .from('test_parts')
    .select('id,part_number')
    .in('test_id', testIds)
    .in('part_number', [1, 2, 3, 4]);
  if (allPartsError) throw allPartsError;

  const allPartIds = (allParts as Array<{ id: string }>).map(p => p.id);
  const questions = await fetchAllQuestionsByPartIds(allPartIds);

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

  // Tính questionCount: tổng từ TẤT CẢ tests cùng part_number
  return [1, 2, 3, 4].map((partNumber) => {
    const partId = partIdsByNumber[partNumber] || `part-${partNumber}`;
    const total = (allParts || [])
      .filter((p: { part_number: number }) => p.part_number === partNumber)
      .reduce((sum, p) => sum + (questionCountByPartId[p.id] || 0), 0);
    const stats = statsByPartNumber[partNumber];
    return {
      partId,
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
    .select('id,test_id')
    .in('test_id', testIds)
    .eq('part_number', partNumber);
  if (partsError) throw partsError;
  if (!parts?.length) return [];

  const partIds = (parts as Array<{ id: string }>).map((p) => p.id);
  const limit =
    partNumber === 5
      ? MAX_READING_PART5_QUESTIONS
      : (partNumber === 6 || partNumber === 7)
        ? MAX_HEAVY_READING_QUESTIONS
        : undefined;
  const data = await fetchQuestionsByPartIdsLight(partIds, limit);
  if (!data.length) return [];

  // Map test_id vào question
  const partTestIdMap: Record<string, string> = {};
  for (const p of (parts || []) as Array<{ id: string; test_id: string }>) {
    partTestIdMap[p.id] = p.test_id;
  }
  const withTestId = data.map((q) => ({
    ...q,
    test_id: partTestIdMap[q.part_id] || '',
  }));

  // Sort: theo test order, rồi group passage trong mỗi test
  const testOrder: Record<string, number> = {};
  testIds.forEach((id, idx) => { testOrder[id] = idx; });

  const sorted = [...withTestId].sort((a, b) => {
    const aOrd = testOrder[a.test_id] ?? 0;
    const bOrd = testOrder[b.test_id] ?? 0;
    if (aOrd !== bOrd) return aOrd - bOrd;

    // Trong cùng test: group theo passage_id
    const aPassage = a.passage_id || '';
    const bPassage = b.passage_id || '';

    if (aPassage !== bPassage) {
      // Có passage trước, không passage sau
      if (aPassage && !bPassage) return -1;
      if (!aPassage && bPassage) return 1;
      return aPassage.localeCompare(bPassage);
    }

    return (a.order_index || 0) - (b.order_index || 0);
  });

  return sorted.map((q) => ({
    id: q.id,
    part_id: q.part_id,
    passage_id: q.passage_id,
    question_text: q.question_text,
    order_index: q.order_index,
    options: q.options,
    media: q.media,
    passage: q.passage,
  }));
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

  // Đếm câu từ TẤT CẢ tests — để hiển thị đúng tổng số câu
  const { data: allParts, error: allPartsError } = await supabase
    .from('test_parts')
    .select('id,part_number,test_id')
    .in('test_id', testIds)
    .in('part_number', [5, 6, 7]);
  if (allPartsError) throw allPartsError;

  const partsRows = (allParts || []) as Array<{
    id: string;
    part_number: number;
    test_id: string;
  }>;

  const partIdsByNumber: Record<number, string> = {};
  const partNumberByPartId: Record<string, number> = {};
  const testIdByPartId: Record<string, string> = {};
  const testOrder = new Map<string, number>(
    testIds.map((id, index) => [id, index]),
  );

  for (const p of partsRows) {
    partNumberByPartId[p.id] = p.part_number;
    testIdByPartId[p.id] = p.test_id;
    const current = partIdsByNumber[p.part_number];
    if (!current) {
      partIdsByNumber[p.part_number] = p.id;
      continue;
    }

    const currentTestId = testIdByPartId[current] ?? '';
    const currentOrder = testOrder.get(currentTestId) ?? Number.MAX_SAFE_INTEGER;
    const candidateOrder = testOrder.get(p.test_id) ?? Number.MAX_SAFE_INTEGER;

    if (candidateOrder < currentOrder) {
      partIdsByNumber[p.part_number] = p.id;
    }
  }

  const allPartIds = partsRows.map((p) => p.id);
  const questions = await fetchAllQuestionsByPartIds(allPartIds);

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

  // Tính questionCount: tổng từ TẤT CẢ tests cùng part_number
  return [5, 6, 7].map((partNumber) => {
    const partId = partIdsByNumber[partNumber] || `missing-part-${partNumber}`;
    const rawTotal = partsRows
      .filter((p: { part_number: number }) => p.part_number === partNumber)
      .reduce((sum, p) => sum + (questionCountByPartId[p.id] || 0), 0);
    const maxForPart =
      partNumber === 5
        ? MAX_READING_PART5_QUESTIONS
        : (partNumber === 6 || partNumber === 7)
          ? MAX_HEAVY_READING_QUESTIONS
          : undefined;
    const total = maxForPart && rawTotal > maxForPart
      ? maxForPart
      : rawTotal;
    const stats = statsByPartNumber[partNumber];
    return {
      partId,
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

export async function getUnansweredQuestionIdsForPracticePart(
  partNumber: number,
  questionType: string,
): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const sourceQuestions =
    questionType === 'mcq_audio'
      ? await getQuestionsByListeningPartNumber(partNumber)
      : await getQuestionsByReadingPartNumber(partNumber);

  const allQuestionIds = sourceQuestions.map((q) => q.id);
  if (!allQuestionIds.length) return [];

  const answeredIds = new Set<string>();

  const chunkSize = 500;
  for (let i = 0; i < allQuestionIds.length; i += chunkSize) {
    const chunk = allQuestionIds.slice(i, i + chunkSize);

    if (questionType === 'mcq_audio') {
      const { data, error } = await supabase
        .from('listening_answer_history')
        .select('question_id')
        .eq('user_id', user.id)
        .in('question_id', chunk);
      if (error) throw error;
      for (const row of (data || []) as Array<{ question_id: string }>) {
        if (row.question_id) answeredIds.add(row.question_id);
      }
    } else {
      const { data, error } = await supabase
        .from('answers')
        .select('question_id,option_id,attempts!inner(user_id)')
        .eq('attempts.user_id', user.id)
        .in('question_id', chunk);
      if (error) throw error;
      for (const row of (data || []) as Array<{ question_id: string; option_id: string | null }>) {
        if (row.question_id && row.option_id) answeredIds.add(row.question_id);
      }
    }
  }

  return allQuestionIds.filter((id) => !answeredIds.has(id));
}

// ========== Auth ==========
export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    // Handle common errors with better messages
    if (error.message.toLowerCase().includes('rate limit')) {
      throw new Error('Bạn đã yêu cầu quá nhiều lần. Vui lòng đợi vài phút rồi thử lại.');
    }
    if (error.message.toLowerCase().includes('already registered') ||
        error.message.toLowerCase().includes('already exists') ||
        error.message.toLowerCase().includes('already been registered')) {
      throw new Error('Email này đã được đăng ký. Vui lòng đăng nhập hoặc sử dụng email khác.');
    }
    throw error;
  }

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

export async function getUserTransactions(): Promise<SubscriptionTransactionItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data: orders, error: ordersError } = await supabase
    .from('subscription_orders')
    .select('id,user_id,plan_id,plan_name,amount,currency,order_code,status,provider,is_lifetime,paid_at,created_at,granted_until')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (ordersError) throw ordersError;

  if (!orders?.length) return [];

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
  }>).map((order) => ({
    id: order.id,
    userId: order.user_id,
    userName: '',
    userPhone: null,
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
    premiumExpiresAt: null,
  }));
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

export async function getPracticeAttemptHistory(limit = 50): Promise<AttemptHistoryItem[]> {
  const rows = await getListeningReadingPracticeHistory(limit);
  return rows.map((row) => ({
    id: row.id,
    testId: row.test_id || '',
    testTitle: `${row.section === 'listening' ? 'Listening' : 'Reading'} Part ${row.part_number} - ${row.question_count} câu`,
    score: row.score,
    submittedAt: row.created_at,
    answeredCount: row.answered_count,
    correctCount: row.correct_count,
  }));
}

export async function saveListeningReadingPracticeHistory(params: {
  userId: string;
  testId?: string | null;
  section: 'listening' | 'reading';
  partNumber: number;
  questionIds: string[];
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  score: number;
  answers: Array<{ questionId: string; selectedOptionId: string; isCorrect: boolean }>;
}): Promise<string> {
  const { data: attemptRow, error: attemptError } = await supabase
    .from('practice_mcq_attempts')
    .insert({
      user_id: params.userId,
      test_id: params.testId ?? null,
      section: params.section,
      part_number: params.partNumber,
      question_ids: params.questionIds,
      question_count: params.questionCount,
      answered_count: params.answeredCount,
      correct_count: params.correctCount,
      score: params.score,
    })
    .select('id')
    .single();
  if (attemptError) throw attemptError;

  const answerRows = params.answers.map((answer) => ({
    attempt_id: attemptRow.id,
    question_id: answer.questionId,
    selected_option_id: answer.selectedOptionId,
    is_correct: answer.isCorrect,
  }));

  if (answerRows.length > 0) {
    const { error: answersError } = await supabase
      .from('practice_mcq_answers')
      .insert(answerRows);
    if (answersError) throw answersError;
  }

  return attemptRow.id;
}

export async function getListeningReadingPracticeHistory(
  limit = 100,
  section?: 'listening' | 'reading',
): Promise<PracticeListeningReadingHistoryItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  let query = supabase
    .from('practice_mcq_attempts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (section) {
    query = query.eq('section', section);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as PracticeListeningReadingHistoryItem[];
}

export async function getListeningReadingPracticeAttemptDetail(
  attemptId: string,
): Promise<AttemptDetail | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data: attemptRow, error: attemptError } = await supabase
    .from('practice_mcq_attempts')
    .select('*')
    .eq('id', attemptId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (attemptError) throw attemptError;
  if (!attemptRow) return null;

  const row = attemptRow as PracticeListeningReadingHistoryItem;
  const questionIds = Array.isArray(row.question_ids) ? row.question_ids : [];

  const questions = questionIds.length ? await getQuestionsByIds(questionIds) : [];

  const selectedOptionIdByQuestionId: Record<string, string> = {};
  const { data: answerRows, error: answersError } = await supabase
      .from('practice_mcq_answers')
      .select('question_id,selected_option_id,is_correct')
      .eq('attempt_id', row.id);
  if (answersError) throw answersError;

  for (const answer of (answerRows || []) as Array<{ question_id: string; selected_option_id: string; is_correct: boolean | null }>) {
    selectedOptionIdByQuestionId[answer.question_id] = answer.selected_option_id;
  }

  const testTitle = `Luyện tập ${row.section === 'listening' ? 'Listening' : 'Reading'} Part ${row.part_number}`;

  const questionPositionById: Record<string, number> = {};
  questionIds.forEach((id, index) => {
    questionPositionById[id] = index;
  });

  const orderedQuestions = [...questions].sort((a, b) => {
    const aIdx = questionPositionById[a.id] ?? Number.MAX_SAFE_INTEGER;
    const bIdx = questionPositionById[b.id] ?? Number.MAX_SAFE_INTEGER;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.order_index - b.order_index;
  });

  return {
    id: row.id,
    testId: row.test_id || '',
    testTitle,
    score: row.score,
    submittedAt: row.created_at,
    questions: orderedQuestions,
    selectedOptionIdByQuestionId,
    correctCount: row.correct_count,
  };
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

// ========== Speaking Prompts ==========
export async function getSpeakingPartsCount(): Promise<Record<number, number>> {
  const { data, error } = await supabase
    .from('speaking_prompts')
    .select('part_number');
  if (error) throw error;
  const counts: Record<number, number> = {};
  for (const row of data || []) {
    counts[row.part_number] = (counts[row.part_number] || 0) + 1;
  }
  return counts;
}

export async function getSpeakingPrompts(
  partNumber: number,
  questionLimit?: number,
): Promise<SpeakingPromptModel[]> {
  let query = supabase
    .from('speaking_prompts')
    .select('*')
    .eq('part_number', partNumber)
    .order('order_index');
  if (questionLimit && questionLimit > 0) {
    query = query.limit(questionLimit);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ========== Practice History ==========
export async function savePracticeHistory(params: {
  userId: string;
  mode: 'speaking' | 'writing';
  partNumber: number;
  promptId: string;
  promptTitle: string;
  promptContent: string;
  userAnswer: string;
  gradeResult?: AiGradeResult;
}): Promise<void> {
  const { error } = await supabase.from('practice_history').insert({
    user_id: params.userId,
    mode: params.mode,
    part_number: params.partNumber,
    prompt_id: params.promptId,
    prompt_title: params.promptTitle,
    prompt_content: params.promptContent,
    user_answer: params.userAnswer,
    ai_score: params.gradeResult?.overall ?? null,
    ai_feedback: params.gradeResult?.feedback ?? null,
    ai_errors: params.gradeResult?.errors ?? null,
    ai_task_scores: params.gradeResult?.taskScores ?? null,
    ai_important_words: params.gradeResult?.importantWords ?? null,
    ai_suggested_answer: params.gradeResult?.suggestedAnswer ?? null,
  });
  if (error) throw error;
}

export async function getPracticeHistory(
  userId: string,
  mode?: 'speaking' | 'writing'
): Promise<PracticeHistoryItem[]> {
  let query = supabase
    .from('practice_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (mode) {
    query = query.eq('mode', mode);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as PracticeHistoryItem[];
}

export async function getRecentPracticeHistory(limit = 5): Promise<PracticeHistoryItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('practice_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as unknown as PracticeHistoryItem[];
}

export async function getPracticeHistoryByPart(
  userId: string,
  mode: 'speaking' | 'writing',
  partNumber: number
): Promise<PracticeHistoryItem[]> {
  const { data, error } = await supabase
    .from('practice_history')
    .select('*')
    .eq('user_id', userId)
    .eq('mode', mode)
    .eq('part_number', partNumber)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as PracticeHistoryItem[];
}
