import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

type GradeRequest = {
  mode: 'speaking' | 'writing';
  taskType: string;
  prompt: string;
  answer: string;
};

type ReadAloudIssue = {
  word: string;
  issue: 'mispronunciation' | 'missing' | 'extra';
  explanation: string;
};

type Part1SpeakingResult = {
  overall_score: number;
  pronunciation: number;
  fluency: number;
  accuracy: number;
  spoken_feedback: string;
  detailed_feedback: string;
  mistakes: ReadAloudIssue[];
  suggestions: string[];
};

type SpeakingMistake = {
  type: 'content' | 'grammar' | 'vocabulary' | 'fluency' | 'pronunciation' | 'logic';
  text: string;
};

type Part2To5SpeakingResult = {
  overall_score: number;
  criteria_scores: Record<string, number>;
  spoken_feedback: string;
  detailed_feedback: string;
  mistakes: SpeakingMistake[];
  suggestions: string[];
};

type Part2DescribePictureResult = {
  overall_score: number;
  pronunciation: number;
  fluency: number;
  grammar: number;
  vocabulary: number;
  content: number;
  spoken_feedback: string;
  detailed_feedback: string;
  mistakes: Array<{
    type: 'grammar' | 'vocabulary' | 'content';
    issue: string;
    suggestion: string;
  }>;
  improved_vocabulary: string[];
  suggestions: string[];
};

type Part1WritingResult = {
  overall_score: number;
  grammar: number;
  vocabulary: number;
  relevance: number;
  short_feedback: string;
  detailed_feedback: string;
  corrected_sentence: string;
  mistakes: Array<{
    type: 'grammar' | 'vocabulary' | 'relevance';
    issue: string;
    explanation: string;
  }>;
  suggestions: string[];
};

type AiGradeResult = {
  overall: number;
  taskScores: Record<string, number>;
  errors: string[];
  feedback: string;
  importantWords: string[];
  suggestedAnswer: string;
  part1ReadAloud?: {
    overallScore: number;
    pronunciation: number;
    fluency: number;
    accuracy: number;
    spokenFeedback: string;
    detailedFeedback: string;
    mistakes: ReadAloudIssue[];
    suggestions: string[];
  };
  partSpeaking?: {
    taskType: string;
    overallScore: number;
    criteriaScores: Record<string, number>;
    spokenFeedback: string;
    detailedFeedback: string;
    mistakes: SpeakingMistake[];
    improvedVocabulary?: string[];
    suggestions: string[];
  };
};

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const PART1_PROMPT_FILE = path.join(process.cwd(), 'part1_speaking.md');

export async function POST(req: Request) {
  let body: GradeRequest;
  try {
    body = (await req.json()) as GradeRequest;
  } catch {
    const fallback = deterministicGrade({ mode: 'writing', taskType: 'opinion_essay', prompt: '', answer: '' });
    return NextResponse.json({ result: fallback }, { status: 200 });
  }

    const { mode, taskType, prompt, answer } = body;

  // ============================================================
  // DEBUG LOG: raw incoming request
  // ============================================================
  console.log('[GRADE] === INCOMING REQUEST ===');
  console.log('[GRADE] mode:', mode);
  console.log('[GRADE] taskType:', taskType);
  console.log('[GRADE] prompt:', prompt);
  console.log('[GRADE] answer:', answer);
  console.log('[GRADE] answer length:', answer.length, 'chars');
  console.log('[GRADE] answer words:', answer.trim().split(/\s+/).filter(Boolean).length, 'words');
  console.log('[GRADE] ==============================');

    if (!mode || !taskType || !prompt) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

  // --- AI grading (deterministic with temperature: 0) ---
  if (apiKey) {
    try {
    const promptText = await buildPrompt({ mode, taskType, prompt, answer });

      // ============================================================
      // DEBUG LOG: exact prompt sent to Gemini
      // ============================================================
      console.log('[GRADE] === PROMPT SENT TO GEMINI ===');
      console.log(promptText);
      console.log('[GRADE] ==============================');

    const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0,
            topP: 1,
            topK: 1,
          },
      }),
    });

      if (res.ok) {
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const raw =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';

        // ============================================================
        // DEBUG LOG: raw response from Gemini
        // ============================================================
        console.log('[GRADE] === RAW GEMINI RESPONSE ===');
        console.log(raw);
        console.log('[GRADE] ==============================');

    const parsed = safeParseJson(raw);

        // ============================================================
        // DEBUG LOG: parsed JSON from Gemini
        // ============================================================
        console.log('[GRADE] === PARSED JSON FROM GEMINI ===');
        console.log('[GRADE] parsed:', parsed);
        if (parsed) {
          console.log('[GRADE] overall:', parsed.overall);
          console.log('[GRADE] taskScores:', JSON.stringify(parsed.taskScores));
          console.log('[GRADE] errors:', JSON.stringify(parsed.errors));
          console.log('[GRADE] feedback:', parsed.feedback);
          console.log('[GRADE] importantWords:', JSON.stringify(parsed.importantWords));
          console.log('[GRADE] suggestedAnswer:', parsed.suggestedAnswer);
        } else {
          console.log('[GRADE] PARSE FAILED - using fallback');
        }
        console.log('[GRADE] ==============================');

        if (parsed) {
    const result =
      mode === 'speaking' && isReadAloudTaskType(taskType) && isPart1SpeakingResult(parsed)
        ? normalizePart1Result(parsed, prompt, answer)
        : mode === 'speaking' && normalizeSpeakingTaskType(taskType) === 'describe_picture' && isPart2DescribePictureResult(parsed)
          ? normalizePart2DescribePictureResult(parsed, taskType, prompt, answer)
        : mode === 'speaking' && !isReadAloudTaskType(taskType) && isPart2To5SpeakingResult(parsed)
          ? normalizePart2To5Result(parsed, taskType, prompt, answer)
          : mode === 'writing' && taskType === 'write_sentence_picture' && isPart1WritingResult(parsed)
            ? normalizePart1WritingResult(parsed, prompt, answer)
          : normalizeResult(parsed, mode, taskType, prompt, answer);

          // ============================================================
          // DEBUG LOG: final result returned to client
          // ============================================================
          console.log('[GRADE] === FINAL RESULT (sent to client) ===');
          console.log('[GRADE] overall:', result.overall);
          console.log('[GRADE] taskScores:', JSON.stringify(result.taskScores));
          console.log('[GRADE] errors:', JSON.stringify(result.errors));
          console.log('[GRADE] feedback:', result.feedback);
          console.log('[GRADE] importantWords:', JSON.stringify(result.importantWords));
          console.log('[GRADE] suggestedAnswer:', result.suggestedAnswer);
          console.log('[GRADE] ==============================');

    return NextResponse.json({ result });
        }
      } else {
        // ============================================================
        // DEBUG LOG: Gemini API error
        // ============================================================
        console.log('[GRADE] === GEMINI API ERROR ===');
        console.log('[GRADE] status:', res.status, res.statusText);
        const errText = await res.text();
        console.log('[GRADE] error body:', errText.slice(0, 500));
        console.log('[GRADE] ==============================');
      }
      // fall through to deterministic fallback
    } catch (err) {
      // ============================================================
      // DEBUG LOG: exception
      // ============================================================
      console.log('[GRADE] === EXCEPTION ===');
      console.log('[GRADE] error:', err);
      console.log('[GRADE] ==============================');
      // fall through to deterministic fallback
    }
  } else {
    console.log('[GRADE] No GEMINI_API_KEY found, using deterministic fallback');
  }

  // --- Deterministic rubric-based fallback ---
  const result = deterministicGrade({ mode, taskType, prompt, answer });

  // ============================================================
  // DEBUG LOG: fallback result
  // ============================================================
  console.log('[GRADE] === DETERMINISTIC FALLBACK RESULT ===');
  console.log('[GRADE] overall:', result.overall);
  console.log('[GRADE] taskScores:', JSON.stringify(result.taskScores));
  console.log('[GRADE] errors:', JSON.stringify(result.errors));
  console.log('[GRADE] ==============================');

  return NextResponse.json({ result });
}

// ============================================================
// PROMPT BUILDER — rewritten with strict rules
// ============================================================
async function buildPrompt(input: GradeRequest): Promise<string> {
  const { mode, taskType, prompt, answer } = input;

  if (mode === 'speaking' && isReadAloudTaskType(taskType)) {
    return buildPart1ReadAloudPrompt(prompt, answer);
  }

  if (mode === 'speaking') {
    return buildPart2To5SpeakingPrompt(taskType, prompt, answer);
  }

  if (mode === 'writing' && taskType === 'write_sentence_picture') {
    return buildPart1WritingPrompt(prompt, answer);
  }

  const rubric = getRubric(mode, taskType);
  const taskDesc = getTaskDescription(mode, taskType);

  return (
    `Bạn là giám khảo chấm bài thi TOEIC Writing theo tiêu chuẩn ETS.\n` +
    `Nhiệm vụ: CHẤM BÀI THỰC TẾ. Trả lời bằng tiếng Việt có dấu.\n\n` +
    `## NHIỆM VỤ CỦA HỌC VIÊN (Task Type: ${taskType})\n` +
    `${taskDesc}\n\n` +
    `## Đề bài (Prompt)\n` +
    `${prompt}\n\n` +
    `## Bài làm của học viên\n` +
    `${answer || '(không có nội dung)'}\n\n` +
    `## RUBRIC ĐÁNH GIÁ CHI TIẾT\n` +
    `${rubric}\n\n` +
    `## QUY TẮC CHẤM ĐIỂM NGHIÊM NGẶT\n` +
    `1. NẾU bài làm KHÔNG liên quan đến đề bài (nói sai chủ đề, chào hỏi không liên quan, không trả lời đúng yêu cầu đề bài) → overall = 0, tất cả taskScores = 0, errors = ["Bài làm không trả lời đúng yêu cầu đề bài."].\n` +
    `2. NẾU bài làm có nội dung nhưng SAI TRỌNG TÂM → điểm rất thấp (0-30).\n` +
    `3. NẾU không có nội dung hoặc bỏ trống → overall = 0.\n` +
    `4. overall = trung bình cộng của tất cả taskScores, đã làm tròn.\n` +
    `5. errors: CHỈ liệt kê lỗi THỰC TẾ trong bài làm. Không bịa đặt.\n` +
    `6. importantWords: trích từ KHÓA trong ĐỀ BÀI (không phải bài làm), dạng "word (loại): nghĩa".\n` +
    `7. feedback: NHẬN XÉT CỤ THỂ, thực tế, dựa trên bài làm thực tế của học viên.\n` +
    `8. suggestedAnswer: gợi ý câu trả lời MẪU phù hợp với đề bài (2-4 câu).\n\n` +
    `## OUTPUT (CHỈ JSON THUẦN, không markdown, không giải thích gì thêm):\n` +
    `{"overall":0,"taskScores":{"criterion":0},"errors":["..."],"feedback":"...","importantWords":["word (loại): nghĩa"],"suggestedAnswer":"..."}`
  );
}

function buildPart1WritingPrompt(prompt: string, userSentence: string): string {
  const { keywords, imageContext } = extractPart1WritingContext(prompt);
  const keywordText = keywords.length > 0 ? keywords.join(', ') : '(not provided)';

  return [
    'You are an experienced TOEIC Writing examiner.',
    '',
    'Your task is to evaluate a "Write a Sentence Based on a Picture" response.',
    '',
    '====================',
    'SYSTEM CONTEXT',
    '==============',
    '',
    '* The user was given an image and 2 keywords',
    '* The user must write ONE correct sentence using the keywords',
    '* The goal is to form a grammatically correct and meaningful sentence',
    '',
    '====================',
    'INPUT DATA',
    '==========',
    '',
    'Keywords:',
    keywordText,
    '',
    'User sentence:',
    userSentence || '(empty)',
    '',
    '(Optional image description for reference):',
    imageContext || '(not provided)',
    '',
    '====================',
    'EVALUATION CRITERIA',
    '===================',
    '',
    'Evaluate based on:',
    '',
    '1. Grammar (0-5)',
    '* sentence structure',
    '* verb tense',
    '* agreement',
    '',
    '2. Vocabulary (0-5)',
    '* correct usage of words',
    '* appropriateness',
    '',
    '3. Relevance (0-5)',
    '* must use both keywords',
    '* must match the image context',
    '',
    '====================',
    'TASK REQUIREMENTS',
    '=================',
    '',
    '1. Check:',
    '* Does the sentence use BOTH keywords?',
    '* Is the sentence grammatically correct?',
    '* Is the meaning logical?',
    '',
    '2. Identify:',
    '* Grammar mistakes',
    '* Incorrect word usage',
    '* Missing keyword (if any)',
    '',
    '3. Generate:',
    'A. Short feedback:',
    '* 1-2 sentences',
    '* Friendly tone',
    '',
    'B. Detailed feedback:',
    '* Explain clearly what is wrong and why',
    '',
    'C. Corrected sentence:',
    '* Provide a fully correct version',
    '',
    'D. Suggestions:',
    '* Provide exactly 2 improvement tips',
    '',
    '4. Scoring:',
    '* grammar (0-5)',
    '* vocabulary (0-5)',
    '* relevance (0-5)',
    '* Convert to TOEIC score (0-200)',
    '',
    '====================',
    'IMPORTANT RULES',
    '===============',
    '',
    '* Output MUST be valid JSON',
    '* No markdown',
    '* No extra text outside JSON',
    '* Keep explanations simple',
    '* Be strict but fair',
    '',
    '====================',
    'OUTPUT FORMAT',
    '=============',
    '',
    '{',
    '"overall_score": 0,',
    '"grammar": 0,',
    '"vocabulary": 0,',
    '"relevance": 0,',
    '"short_feedback": "",',
    '"detailed_feedback": "",',
    '"corrected_sentence": "",',
    '"mistakes": [',
    '{',
    '"type": "grammar",',
    '"issue": "",',
    '"explanation": ""',
    '}',
    '],',
    '"suggestions": ["", ""]',
    '}',
  ].join('\n');
}

function extractPart1WritingContext(prompt: string): { keywords: string[]; imageContext: string } {
  const lines = String(prompt || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const keywordLine = lines.find((l) => /^keywords?:/i.test(l));
  const imageLine = lines.find((l) => /^image_context:/i.test(l));

  const keywords = keywordLine
    ? keywordLine
      .replace(/^keywords?:/i, '')
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean)
      .slice(0, 6)
    : [];

  const imageContext = imageLine
    ? imageLine.replace(/^image_context:/i, '').trim()
    : '';

  return { keywords, imageContext };
}

function buildPart2To5SpeakingPrompt(taskType: string, prompt: string, answer: string): string {
  const config = getSpeakingTaskConfig(taskType);

  if (config.normalizedTaskType === 'describe_picture') {
    return buildPart2DescribePicturePrompt(answer, prompt);
  }

  const criteriaJson = Object.keys(config.criteria).map((k) => `"${k}": 0`).join(', ');

  return [
    'You are an experienced TOEIC Speaking examiner.',
    `Evaluate one response for ${config.partLabel}.`,
    '',
    'PROMPT:',
    prompt || '(empty)',
    '',
    'USER SPOKEN TEXT:',
    answer || '(empty)',
    '',
    'SCORING:',
    '- Score each criterion from 0 to 5.',
    '- Be strict but fair based on spoken text.',
    `- Criteria definition: ${config.criteriaDescription}`,
    '- overall_score must be from 0 to 200 using:',
    '- overall_score = round(average(criteria_scores) * 40)',
    '',
    'REQUIRED OUTPUT RULES:',
    '- Return valid JSON only.',
    '- No markdown, no extra text.',
    '- suggestions must have exactly 3 actionable items.',
    '- mistakes must include practical issues from actual answer only.',
    '- spoken_feedback must be max 2 natural sentences.',
    '',
    'OUTPUT JSON FORMAT:',
    '{',
    '  "overall_score": 0,',
    `  "criteria_scores": { ${criteriaJson} },`,
    '  "spoken_feedback": "",',
    '  "detailed_feedback": "",',
    '  "mistakes": [',
    '    { "type": "content", "text": "" }',
    '  ],',
    '  "suggestions": ["", "", ""]',
    '}',
  ].join('\n');
}

function buildPart2DescribePicturePrompt(userText: string, imageContext: string): string {
  return [
    'You are an experienced TOEIC Speaking examiner.',
    '',
    'Your task is to evaluate a "Describe a Picture" response.',
    '',
    '====================',
    'SYSTEM CONTEXT',
    '==============',
    '',
    '* The user was shown an image and asked to describe it.',
    '* The response is converted from speech-to-text using AssemblyAI.',
    '',
    '====================',
    'INPUT DATA',
    '==========',
    '',
    'User spoken text:',
    userText || '(empty)',
    '',
    '(Optional image description for reference):',
    imageContext || '(empty)',
    '',
    '====================',
    'EVALUATION CRITERIA',
    '===================',
    '',
    'Evaluate based on:',
    '',
    '1. Pronunciation (0-5)',
    '* clarity and correctness of speech',
    '',
    '2. Fluency (0-5)',
    '* smoothness and natural pacing',
    '',
    '3. Grammar (0-5)',
    '* sentence structure and correctness',
    '',
    '4. Vocabulary (0-5)',
    '* variety and appropriateness of words',
    '',
    '5. Content (0-5)',
    '* relevance to the picture',
    '* amount of detail',
    '* logical organization',
    '',
    '====================',
    'TASK REQUIREMENTS',
    '=================',
    '',
    '1. Evaluate overall speaking performance',
    '',
    '2. Identify:',
    '* Grammar mistakes',
    '* Weak vocabulary usage',
    '* Missing important details (if obvious)',
    '',
    '3. Generate:',
    'A. Spoken feedback:',
    '* Max 2 sentences',
    '* Friendly and natural tone',
    '',
    'B. Detailed feedback:',
    '* Strengths',
    '* Weaknesses',
    '',
    'C. Suggestions:',
    '* Exactly 3 actionable improvements',
    '',
    'D. Vocabulary improvement:',
    '* Suggest 3 better words/phrases the user could use',
    '',
    '4. Scoring:',
    '* Score each criterion (0-5)',
    '* Convert to TOEIC score (0-200)',
    '',
    '====================',
    'IMPORTANT RULES',
    '===============',
    '',
    '* Output MUST be valid JSON',
    '* No markdown',
    '* No extra text outside JSON',
    '* Use simple English',
    '* Spoken feedback must sound like a real teacher',
    '',
    '====================',
    'OUTPUT FORMAT',
    '=============',
    '',
    '{',
    '"overall_score": 0,',
    '"pronunciation": 0,',
    '"fluency": 0,',
    '"grammar": 0,',
    '"vocabulary": 0,',
    '"content": 0,',
    '"spoken_feedback": "",',
    '"detailed_feedback": "",',
    '"mistakes": [',
    '{',
    '"type": "grammar",',
    '"issue": "",',
    '"suggestion": ""',
    '}',
    '],',
    '"improved_vocabulary": ["", "", ""],',
    '"suggestions": ["", "", ""]',
    '}',
  ].join('\n');
}

async function buildPart1ReadAloudPrompt(originalText: string, userText: string): Promise<string> {
  const template = await loadPart1PromptTemplate();
  const detectedIssues = buildReadAloudIssues(originalText, userText);
  const mistakeList = detectedIssues.length
    ? JSON.stringify(detectedIssues, null, 2)
    : '[]';

  return template
    .replace('{original_text}', originalText || '(empty)')
    .replace('{user_text}', userText || '(empty)')
    .replace('{mistake_list}', mistakeList);
}

async function loadPart1PromptTemplate(): Promise<string> {
  try {
    return await readFile(PART1_PROMPT_FILE, 'utf-8');
  } catch {
    return [
      'You are an experienced TOEIC Speaking examiner.',
      'Evaluate this Read Aloud response and return strict JSON only.',
      'Original text:',
      '{original_text}',
      'User spoken text:',
      '{user_text}',
      'Detected issues:',
      '{mistake_list}',
      'Output keys: overall_score(0-200), pronunciation(0-5), fluency(0-5), accuracy(0-5), spoken_feedback, detailed_feedback, mistakes, suggestions(3 items).',
    ].join('\n');
  }
}

function normalizeWord(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9']/g, '');
}

function tokenizeEnglish(input: string): string[] {
  return (input || '')
    .split(/\s+/)
    .map((t) => normalizeWord(t))
    .filter(Boolean);
}

function buildReadAloudIssues(originalText: string, userText: string): ReadAloudIssue[] {
  const original = tokenizeEnglish(originalText);
  const spoken = tokenizeEnglish(userText);

  if (!original.length && !spoken.length) return [];

  const issues: ReadAloudIssue[] = [];
  const maxLen = Math.max(original.length, spoken.length);

  for (let i = 0; i < maxLen; i += 1) {
    const expected = original[i];
    const actual = spoken[i];

    if (expected && !actual) {
      issues.push({
        word: expected,
        issue: 'missing',
        explanation: `Expected word "${expected}" is missing in the spoken text.`,
      });
      continue;
    }

    if (!expected && actual) {
      issues.push({
        word: actual,
        issue: 'extra',
        explanation: `Word "${actual}" was added and does not appear in the original text.`,
      });
      continue;
    }

    if (expected && actual && expected !== actual) {
      issues.push({
        word: actual,
        issue: 'mispronunciation',
        explanation: `Expected "${expected}" but heard "${actual}".`,
      });
    }
  }

  return issues.slice(0, 20);
}

function isPart1SpeakingResult(data: Record<string, unknown>): data is Part1SpeakingResult {
  return (
    Object.prototype.hasOwnProperty.call(data, 'overall_score') &&
    Object.prototype.hasOwnProperty.call(data, 'pronunciation') &&
    Object.prototype.hasOwnProperty.call(data, 'fluency') &&
    Object.prototype.hasOwnProperty.call(data, 'accuracy')
  );
}

function normalizePart1Result(
  data: Part1SpeakingResult,
  prompt: string,
  answer: string
): AiGradeResult {
  const toeicScore = clamp(toNumber(data.overall_score), 0, 200);
  const pronunciation = clamp(toNumber(data.pronunciation) * 20, 0, 100);
  const fluency = clamp(toNumber(data.fluency) * 20, 0, 100);
  const accuracy = clamp(toNumber(data.accuracy) * 20, 0, 100);

  const mistakes = Array.isArray(data.mistakes) ? data.mistakes : [];
  const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
  const spokenFeedback = toText(data.spoken_feedback);
  const detailedFeedback = toText(data.detailed_feedback);

  const feedbackParts: string[] = [];
  if (spokenFeedback) feedbackParts.push(`Spoken feedback: ${spokenFeedback}`);
  if (detailedFeedback) feedbackParts.push(`Detailed feedback: ${detailedFeedback}`);
  if (suggestions.length > 0) {
    const top3 = suggestions.slice(0, 3).map((s, i) => `${i + 1}. ${String(s).trim()}`).join('\n');
    feedbackParts.push(`Suggestions:\n${top3}`);
  }
  feedbackParts.push(`TOEIC Speaking (scaled): ${toeicScore}/200`);

  return {
    overall: Math.round(toeicScore / 2),
    taskScores: {
      Pronunciation: pronunciation,
      Fluency: fluency,
      Accuracy: accuracy,
    },
    errors: mistakes
      .map((m) => {
        const issue = toText(m.issue);
        const word = toText(m.word);
        const explanation = toText(m.explanation);
        if (!issue && !word && !explanation) return '';
        return `${issue || 'issue'}: ${word || 'word'}${explanation ? ` - ${explanation}` : ''}`;
      })
      .filter(Boolean),
    feedback: feedbackParts.join('\n\n') || localFeedback('speaking', 'read_aloud', Math.round(toeicScore / 2), {
      Pronunciation: pronunciation,
      Fluency: fluency,
      Accuracy: accuracy,
    }, []),
    importantWords: buildImportantWordsFromPrompt(prompt, 'read_aloud'),
    suggestedAnswer: buildSuggestedAnswer('read_aloud', prompt, answer),
    part1ReadAloud: {
      overallScore: toeicScore,
      pronunciation: clamp(toNumber(data.pronunciation), 0, 5),
      fluency: clamp(toNumber(data.fluency), 0, 5),
      accuracy: clamp(toNumber(data.accuracy), 0, 5),
      spokenFeedback,
      detailedFeedback,
      mistakes,
      suggestions: suggestions.slice(0, 3).map((s) => String(s).trim()).filter(Boolean),
    },
  };
}

function isPart2To5SpeakingResult(data: Record<string, unknown>): data is Part2To5SpeakingResult {
  return (
    Object.prototype.hasOwnProperty.call(data, 'overall_score') &&
    Object.prototype.hasOwnProperty.call(data, 'criteria_scores')
  );
}

function isPart2DescribePictureResult(data: Record<string, unknown>): data is Part2DescribePictureResult {
  return (
    Object.prototype.hasOwnProperty.call(data, 'overall_score') &&
    Object.prototype.hasOwnProperty.call(data, 'pronunciation') &&
    Object.prototype.hasOwnProperty.call(data, 'fluency') &&
    Object.prototype.hasOwnProperty.call(data, 'grammar') &&
    Object.prototype.hasOwnProperty.call(data, 'vocabulary') &&
    Object.prototype.hasOwnProperty.call(data, 'content')
  );
}

function isPart1WritingResult(data: Record<string, unknown>): data is Part1WritingResult {
  return (
    Object.prototype.hasOwnProperty.call(data, 'overall_score') &&
    Object.prototype.hasOwnProperty.call(data, 'grammar') &&
    Object.prototype.hasOwnProperty.call(data, 'vocabulary') &&
    Object.prototype.hasOwnProperty.call(data, 'relevance')
  );
}

function normalizePart1WritingResult(
  data: Part1WritingResult,
  prompt: string,
  answer: string
): AiGradeResult {
  const grammar = clamp(toNumber(data.grammar), 0, 5);
  const vocabulary = clamp(toNumber(data.vocabulary), 0, 5);
  const relevance = clamp(toNumber(data.relevance), 0, 5);

  const computedToeic = Math.round(((grammar + vocabulary + relevance) / 3) * 40);
  const toeicScore = clamp(toNumber(data.overall_score) || computedToeic, 0, 200);

  const mistakes = Array.isArray(data.mistakes)
    ? data.mistakes
      .map((m) => ({
        type: isAllowedWritingMistakeType(m?.type) ? m.type : 'relevance',
        issue: toText(m?.issue),
        explanation: toText(m?.explanation),
      }))
      .filter((m) => m.issue || m.explanation)
    : [];

  const shortFeedback = toText(data.short_feedback);
  const detailedFeedback = toText(data.detailed_feedback);
  const correctedSentence = toText(data.corrected_sentence);
  const suggestions = Array.isArray(data.suggestions)
    ? data.suggestions.map((s) => String(s).trim()).filter(Boolean).slice(0, 2)
    : [];

  return {
    overall: Math.round(toeicScore / 2),
    taskScores: {
      grammar: grammar * 20,
      vocabulary: vocabulary * 20,
      relevance: relevance * 20,
    },
    errors: mistakes.map((m) => `${m.type}: ${m.issue}${m.explanation ? ` - ${m.explanation}` : ''}`),
    feedback: [
      shortFeedback ? `Short feedback: ${shortFeedback}` : '',
      detailedFeedback ? `Detailed feedback: ${detailedFeedback}` : '',
      suggestions.length > 0 ? `Suggestions:\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : '',
      `TOEIC Writing (scaled): ${toeicScore}/200`,
    ].filter(Boolean).join('\n\n'),
    importantWords: buildImportantWordsFromPrompt(prompt, 'write_sentence_picture'),
    suggestedAnswer: correctedSentence || buildSuggestedAnswer('write_sentence_picture', prompt, answer),
  };
}

function isAllowedWritingMistakeType(type: unknown): type is 'grammar' | 'vocabulary' | 'relevance' {
  return ['grammar', 'vocabulary', 'relevance'].includes(String(type));
}

function normalizePart2DescribePictureResult(
  data: Part2DescribePictureResult,
  taskType: string,
  prompt: string,
  answer: string
): AiGradeResult {
  const pronunciation = clamp(toNumber(data.pronunciation), 0, 5);
  const fluency = clamp(toNumber(data.fluency), 0, 5);
  const grammar = clamp(toNumber(data.grammar), 0, 5);
  const vocabulary = clamp(toNumber(data.vocabulary), 0, 5);
  const content = clamp(toNumber(data.content), 0, 5);

  const computedToeic = Math.round(((pronunciation + fluency + grammar + vocabulary + content) / 5) * 40);
  const toeicScore = clamp(toNumber(data.overall_score) || computedToeic, 0, 200);

  const mistakes = Array.isArray(data.mistakes)
    ? data.mistakes
      .map((m) => ({
        type: isAllowedMistakeType(m?.type) ? m.type : 'content',
        text: `${toText(m?.issue)}${toText(m?.suggestion) ? ` -> ${toText(m?.suggestion)}` : ''}`.trim(),
        issue: toText(m?.issue),
        suggestion: toText(m?.suggestion),
      }))
      .filter((m) => m.text)
    : [];

  const improvedVocabulary = Array.isArray(data.improved_vocabulary)
    ? data.improved_vocabulary.map((w) => String(w).trim()).filter(Boolean).slice(0, 3)
    : [];

  const suggestions = Array.isArray(data.suggestions)
    ? data.suggestions.map((s) => String(s).trim()).filter(Boolean).slice(0, 3)
    : [];

  const spokenFeedback = toText(data.spoken_feedback);
  const detailedFeedback = toText(data.detailed_feedback);

  return {
    overall: Math.round(toeicScore / 2),
    taskScores: {
      pronunciation: pronunciation * 20,
      fluency: fluency * 20,
      grammar: grammar * 20,
      vocabulary: vocabulary * 20,
      content: content * 20,
    },
    errors: mistakes.map((m) => `${m.type}: ${m.issue || m.text}`),
    feedback: [
      spokenFeedback ? `Spoken feedback: ${spokenFeedback}` : '',
      detailedFeedback ? `Detailed feedback: ${detailedFeedback}` : '',
      `TOEIC Speaking (scaled): ${toeicScore}/200`,
    ].filter(Boolean).join('\n\n'),
    importantWords: improvedVocabulary.length > 0
      ? improvedVocabulary
      : buildImportantWordsFromPrompt(prompt, normalizeSpeakingTaskType(taskType)),
    suggestedAnswer: buildSuggestedAnswer(normalizeSpeakingTaskType(taskType), prompt, answer),
    partSpeaking: {
      taskType: 'describe_picture',
      overallScore: toeicScore,
      criteriaScores: {
        pronunciation,
        fluency,
        grammar,
        vocabulary,
        content,
      },
      spokenFeedback,
      detailedFeedback,
      mistakes,
      improvedVocabulary,
      suggestions,
    },
  };
}

function getSpeakingTaskConfig(taskType: string): {
  normalizedTaskType: string;
  partLabel: string;
  criteria: Record<string, string>;
  criteriaDescription: string;
} {
  const normalized = normalizeSpeakingTaskType(taskType);

  if (normalized === 'describe_picture') {
    const criteria = {
      content_coverage: 'Cover major objects/people/actions in the image',
      detail_accuracy: 'Details are accurate and specific',
      organization: 'Description is logical and coherent',
      delivery: 'Fluency, pronunciation, and natural pacing',
    };
    return {
      normalizedTaskType: normalized,
      partLabel: 'Part 2: Describe a Picture',
      criteria,
      criteriaDescription: Object.entries(criteria).map(([k, v]) => `${k}: ${v}`).join('; '),
    };
  }

  if (normalized === 'respond_questions') {
    const criteria = {
      direct_answer: 'Answers the question directly and appropriately',
      supporting_details: 'Provides reasons/examples to support answer',
      language_use: 'Grammar and vocabulary quality',
      delivery: 'Fluency and pronunciation clarity',
    };
    return {
      normalizedTaskType: normalized,
      partLabel: 'Part 3: Respond to Questions',
      criteria,
      criteriaDescription: Object.entries(criteria).map(([k, v]) => `${k}: ${v}`).join('; '),
    };
  }

  if (normalized === 'respond_information') {
    const criteria = {
      information_accuracy: 'Correctly uses information from the prompt',
      completeness: 'Covers all required points',
      organization: 'Response is structured and easy to follow',
      delivery: 'Fluency and pronunciation clarity',
    };
    return {
      normalizedTaskType: normalized,
      partLabel: 'Part 4: Respond to Information',
      criteria,
      criteriaDescription: Object.entries(criteria).map(([k, v]) => `${k}: ${v}`).join('; '),
    };
  }

  const criteria = {
    opinion_clarity: 'Clear position and consistency of viewpoint',
    reasons_examples: 'Quality of supporting reasons/examples',
    organization: 'Logical flow and coherence',
    language_use: 'Grammar, vocabulary, and spoken clarity',
  };
  return {
    normalizedTaskType: 'express_opinion',
    partLabel: 'Part 5: Express an Opinion',
    criteria,
    criteriaDescription: Object.entries(criteria).map(([k, v]) => `${k}: ${v}`).join('; '),
  };
}

function normalizePart2To5Result(
  data: Part2To5SpeakingResult,
  taskType: string,
  prompt: string,
  answer: string
): AiGradeResult {
  const config = getSpeakingTaskConfig(taskType);
  const rawCriteria =
    typeof data.criteria_scores === 'object' && data.criteria_scores
      ? data.criteria_scores
      : {};

  const criteriaScores: Record<string, number> = {};
  const taskScores: Record<string, number> = {};
  for (const key of Object.keys(config.criteria)) {
    const raw = clamp(toNumber(rawCriteria[key]), 0, 5);
    criteriaScores[key] = raw;
    taskScores[key] = raw * 20;
  }

  const toeicScore = clamp(
    toNumber(data.overall_score) || Math.round(
      (Object.values(criteriaScores).reduce((sum, v) => sum + v, 0) /
        (Object.keys(criteriaScores).length || 1)) * 40
    ),
    0,
    200
  );

  const mistakes = Array.isArray(data.mistakes)
    ? data.mistakes
      .map((m) => ({
        type: isAllowedMistakeType(m?.type) ? m.type : 'content',
        text: toText(m?.text),
      }))
      .filter((m) => m.text)
    : [];

  const suggestions = Array.isArray(data.suggestions)
    ? data.suggestions.map((s) => String(s).trim()).filter(Boolean).slice(0, 3)
    : [];

  const spokenFeedback = toText(data.spoken_feedback);
  const detailedFeedback = toText(data.detailed_feedback);

  return {
    overall: Math.round(toeicScore / 2),
    taskScores,
    errors: mistakes.map((m) => `${m.type}: ${m.text}`),
    feedback: [
      spokenFeedback ? `Spoken feedback: ${spokenFeedback}` : '',
      detailedFeedback ? `Detailed feedback: ${detailedFeedback}` : '',
      `TOEIC Speaking (scaled): ${toeicScore}/200`,
    ].filter(Boolean).join('\n\n'),
    importantWords: buildImportantWordsFromPrompt(prompt, config.normalizedTaskType),
    suggestedAnswer: buildSuggestedAnswer(config.normalizedTaskType, prompt, answer),
    partSpeaking: {
      taskType: config.normalizedTaskType,
      overallScore: toeicScore,
      criteriaScores,
      spokenFeedback,
      detailedFeedback,
      mistakes,
      suggestions,
    },
  };
}

function isAllowedMistakeType(type: unknown): type is SpeakingMistake['type'] {
  return ['content', 'grammar', 'vocabulary', 'fluency', 'pronunciation', 'logic'].includes(String(type));
}

function toNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return n;
}

function getTaskDescription(mode: 'speaking' | 'writing', taskType: string): string {
  if (mode === 'speaking') {
    const normalizedTaskType = normalizeSpeakingTaskType(taskType);
    const d: Record<string, string> = {
      read_aloud:
        'Học viên phải ĐỌC TO, RÕ RÀNG đoạn văn bằng tiếng Anh trong đề bài.\n' +
        '- Yêu cầu: đọc đúng từng từ, phát âm chuẩn, ngữ điệu tự nhiên, tốc độ phù hợp.\n' +
        '- VÍ DỤ SAI NGHIÊM TRỌNG: nói "Hello, my name is..." hoặc bất kỳ nội dung nào KHÔNG PHẢI đoạn văn trong đề → overall = 0.',
      describe_picture:
        'Học viên phải MÔ TẢ HÌNH ẢNH được cung cấp trong đề bài.\n' +
        '- Yêu cầu: mô tả chi tiết những gì thấy trong tranh (người, vật, hành động, bối cảnh).\n' +
        '- VÍ DỤ SAI: nói sai nội dung tranh hoặc không mô tả tranh → điểm rất thấp.',
      respond_questions:
        'Học viên phải TRẢ LỜI CÂU HỎI được nêu trong đề bài.\n' +
        '- Yêu cầu: trả lời đúng câu hỏi, đủ ý, có ví dụ cụ thể.\n' +
        '- VÍ DỤ SAI: trả lời sai chủ đề hoặc không trả lời câu hỏi → điểm thấp.',
      respond_information:
        'Học viên phải TRẢ LỜI dựa trên thông tin/bảng/lịch trong đề bài.\n' +
        '- Yêu cầu: dùng đúng dữ liệu trong đề, trả lời đầy đủ và chính xác.\n' +
        '- VÍ DỤ SAI: trả lời mơ hồ, bỏ sót dữ liệu hoặc nói không dựa vào thông tin đề bài.',
      express_opinion:
        'Học viên phải TRÌNH BÀY QUAN ĐIỂM về chủ đề được nêu trong đề bài.\n' +
        '- Yêu cầu: nêu quan điểm rõ ràng, lý do, ví dụ hỗ trợ.\n' +
        '- VÍ DỤ SAI: không trình bày quan điểm hoặc lạc đề → điểm thấp.',
      propose_solution:
        'Học viên phải ĐỀ XUẤT GIẢI PHÁP cho vấn đề trong đề bài.\n' +
        '- Yêu cầu: đề xuất giải pháp cụ thể, khả thi, có phân tích.\n' +
        '- VÍ DỤ SAI: không đề xuất giải pháp hoặc lạc đề → điểm thấp.',
    };
    return d[normalizedTaskType] || `Học viên phải hoàn thành nhiệm vụ "${taskType}" theo đề bài.`;
  }
  const wd: Record<string, string> = {
    write_sentence_picture:
      'Học viên phải VIẾT CÂU MÔ TẢ HÌNH ẢNH được cung cấp trong đề bài.\n' +
      '- Yêu cầu: mô tả chính xác nội dung tranh bằng tiếng Anh, đúng ngữ pháp.\n' +
      '- VÍ DỤ SAI: mô tả sai tranh hoặc không liên quan → overall = 0.',
    reply_email:
      'Học viên phải VIẾT EMAIL PHẢN HỒI theo yêu cầu trong đề bài.\n' +
      '- Yêu cầu: trả lời đủ ý trong email, đúng định dạng email, ngữ pháp chuẩn.\n' +
      '- VÍ DỤ SAI: không trả lời đúng yêu cầu email → điểm thấp.',
    opinion_essay:
      'Học viên phải VIẾT BÀI LUẬN trình bày quan điểm về chủ đề được nêu trong đề bài.\n' +
      '- Yêu cầu: có mở bài, thân bài (ít nhất 2 luận điểm), kết bài; dùng linking words.\n' +
      '- VÍ DỤ SAI: không trình bày quan điểm hoặc lạc đề → điểm thấp.',
  };
  return wd[taskType] || `Học viên phải hoàn thành nhiệm vụ "${taskType}" theo đề bài.`;
}

function getRubric(mode: 'speaking' | 'writing', taskType: string): string {
  if (mode === 'speaking') {
    const normalizedTaskType = normalizeSpeakingTaskType(taskType);
    if (normalizedTaskType === 'read_aloud') {
      return (
        '4 tiêu chí, mỗi 0-100:\n' +
        '- Accuracy (0-100): ĐỌC ĐÚNG từng từ trong đoạn văn đề bài. ' +
        '90-100 = đọc đúng hết, phát âm chuẩn. ' +
        '60-89 = vài lỗi phát âm nhỏ. ' +
        '30-59 = nhiều lỗi phát âm. ' +
        '0-29 = đọc sai hầu hết hoặc KHÔNG ĐỌC đoạn văn (nói sai hoàn toàn, chào hỏi...) → 0 điểm tất cả.\n' +
        '- Pronunciation (0-100): ' +
        '90-100 = phát âm rõ ràng, chuẩn giọng Mỹ/Anh. ' +
        '60-89 = phát âm khá rõ. ' +
        '30-59 = phát âm khó hiểu. ' +
        '0-29 = không thể hiểu được.\n' +
        '- Fluency (0-100): ' +
        '90-100 = tốc độ phù hợp, không ngắt quãng. ' +
        '60-89 = hơi ngắt quãng. ' +
        '30-59 = ngắt quãng nhiều. ' +
        '0-29 = không thể nói trôi chảy.\n' +
        '- Intonation (0-100): ' +
        '90-100 = ngữ điệu tự nhiên, nhấn trọng âm đúng. ' +
        '60-89 = ngữ điệu khá tự nhiên. ' +
        '30-59 = ngữ điệu không tự nhiên. ' +
        '0-29 = ngữ điệu hoàn toàn sai.'
      );
    }
    if (normalizedTaskType === 'describe_picture') {
      return (
        '3 tiêu chí, mỗi 0-100:\n' +
        '- Content (0-100): ' +
        '90-100 = mô tả ĐỦ, CHÍNH XÁC các chi tiết trong tranh. ' +
        '60-89 = mô tả được phần lớn. ' +
        '30-59 = mô tả ít, thiếu chi tiết chính. ' +
        '0-29 = KHÔNG mô tả tranh, nói sai tranh → overall = 0.\n' +
        '- Vocabulary (0-100): ' +
        '90-100 = dùng từ phù hợp, đa dạng. ' +
        '60-89 = dùng từ khá phù hợp. ' +
        '30-59 = từ vựng nghèo nàn. ' +
        '0-29 = từ vựng sai ngữ cảnh hoàn toàn.\n' +
        '- Fluency (0-100): ' +
        '90-100 = diễn đạt mạch lạc, liên tục. ' +
        '60-89 = hơi ngắt quãng. ' +
        '30-59 = nói ngắt quãng nhiều. ' +
        '0-29 = không thể nói liên tục.'
      );
    }
    if (normalizedTaskType === 'respond_information') {
      return (
        '4 tiêu chí, mỗi 0-100:\n' +
        '- Information Accuracy (0-100): dùng thông tin đúng từ bảng/lịch/tài liệu trong đề.\n' +
        '- Completeness (0-100): trả lời đủ các ý được hỏi.\n' +
        '- Organization (0-100): trình bày rõ ràng, mạch lạc.\n' +
        '- Fluency (0-100): nói trôi chảy, phát âm rõ.'
      );
    }
    if (normalizedTaskType === 'respond_questions') {
      return (
        '4 tiêu chí, mỗi 0-100:\n' +
        '- Direct Answer (0-100): trả lời trực tiếp đúng trọng tâm câu hỏi.\n' +
        '- Supporting Details (0-100): có lý do/ví dụ phù hợp.\n' +
        '- Language Use (0-100): ngữ pháp và từ vựng phù hợp.\n' +
        '- Fluency (0-100): nói mạch lạc, rõ ràng.'
      );
    }
    if (normalizedTaskType === 'express_opinion') {
      return (
        '4 tiêu chí, mỗi 0-100:\n' +
        '- Opinion Clarity (0-100): quan điểm rõ ràng, nhất quán.\n' +
        '- Reasons & Examples (0-100): lý do và ví dụ thuyết phục.\n' +
        '- Organization (0-100): bố cục logic, dễ theo dõi.\n' +
        '- Language Use (0-100): từ vựng, ngữ pháp và độ trôi chảy.'
      );
    }
    return (
      '3 tiêu chí, mỗi 0-100:\n' +
      '- Content (0-100): ' +
      '90-100 = trả lời ĐỦ ý, đúng yêu cầu đề bài. ' +
      '60-89 = trả lời được phần lớn yêu cầu. ' +
      '30-59 = trả lời thiếu ý, lạc đề. ' +
      '0-29 = KHÔNG trả lời đúng yêu cầu → overall = 0.\n' +
      '- Vocabulary (0-100): ' +
      '90-100 = từ vựng phù hợp, đa dạng. ' +
      '60-89 = từ vựng khá phù hợp. ' +
      '30-59 = từ vựng nghèo nàn. ' +
      '0-29 = từ vựng sai ngữ cảnh.\n' +
      '- Fluency (0-100): ' +
      '90-100 = diễn đạt mạch lạc. ' +
      '60-89 = hơi ngắt quãng. ' +
      '30-59 = nói ngắt quãng nhiều. ' +
      '0-29 = không thể diễn đạt.'
    );
  }

  // writing
  if (taskType === 'write_sentence_picture') {
    return (
      '2 tiêu chí, mỗi 0-100:\n' +
      '- Grammar (0-100): ' +
      '90-100 = ngữ pháp đúng hoàn toàn. ' +
      '60-89 = vài lỗi nhỏ. ' +
      '30-59 = nhiều lỗi ngữ pháp. ' +
      '0-29 = ngữ pháp sai hoàn toàn.\n' +
      '- Relevance (0-100): ' +
      '90-100 = mô tả ĐÚNG, ĐẦY ĐỦ nội dung tranh. ' +
      '60-89 = mô tả được phần lớn tranh. ' +
      '30-59 = mô tả ít, sai trọng tâm. ' +
      '0-29 = KHÔNG mô tả tranh, nội dung hoàn toàn sai → overall = 0.'
    );
  }
  if (taskType === 'reply_email') {
    return (
      '4 tiêu chí, mỗi 0-100:\n' +
      '- Task Response (0-100): ' +
      '90-100 = trả lời ĐỦ, ĐÚNG tất cả ý trong email gốc. ' +
      '60-89 = trả lời được phần lớn. ' +
      '30-59 = trả lời thiếu ý, lạc đề. ' +
      '0-29 = KHÔNG trả lời đúng email → overall = 0.\n' +
      '- Grammar (0-100): ' +
      '90-100 = ngữ pháp đúng hoàn toàn. ' +
      '60-89 = vài lỗi nhỏ. ' +
      '30-59 = nhiều lỗi. ' +
      '0-29 = ngữ pháp sai hoàn toàn.\n' +
      '- Vocabulary (0-100): ' +
      '90-100 = từ vựng phù hợp ngữ cảnh công việc. ' +
      '60-89 = từ vựng khá phù hợp. ' +
      '30-59 = từ vựng không phù hợp. ' +
      '0-29 = từ vựng sai ngữ cảnh.\n' +
      '- Coherence (0-100): ' +
      '90-100 = liên kết câu/đoạn mạch lạc, dùng linking words. ' +
      '60-89 = khá mạch lạc. ' +
      '30-59 = liên kết yếu. ' +
      '0-29 = không có liên kết.'
    );
  }
  // opinion_essay
  return (
    '4 tiêu chí, mỗi 0-100:\n' +
    '- Task Response (0-100): ' +
    '90-100 = có đủ mở bài, 2 thân bài, kết bài; trình bày rõ quan điểm, có dẫn chứng. ' +
    '60-89 = đủ cấu trúc nhưng thiếu chi tiết. ' +
    '30-59 = cấu trúc lộn xộn, ít ý. ' +
    '0-29 = KHÔNG trả lời đúng đề bài → overall = 0.\n' +
    '- Grammar (0-100): ' +
    '90-100 = ngữ pháp đa dạng, đúng hoàn toàn. ' +
    '60-89 = vài lỗi nhỏ. ' +
    '30-59 = nhiều lỗi ngữ pháp. ' +
    '0-29 = ngữ pháp sai hoàn toàn.\n' +
    '- Vocabulary (0-100): ' +
    '90-100 = từ vựng học thuật phù hợp, đa dạng. ' +
    '60-89 = từ vựng khá phù hợp. ' +
    '30-59 = từ vựng nghèo nàn. ' +
    '0-29 = từ vựng sai ngữ cảnh.\n' +
    '- Coherence (0-100): ' +
    '90-100 = dùng nhiều linking words (however, moreover, in addition...), liên kết mạch lạc. ' +
    '60-89 = dùng được linking words. ' +
    '30-59 = ít linking words. ' +
    '0-29 = không có liên kết.'
  );
}

// ============================================================
// JSON PARSER
// ============================================================
function safeParseJson(raw: string): Record<string, unknown> | null {
  const text = raw.trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ============================================================
// NORMALIZE AI RESPONSE
// ============================================================
function normalizeResult(
  data: Record<string, unknown>,
  mode: 'speaking' | 'writing',
  taskType: string,
  prompt: string,
  answer: string
): AiGradeResult {
  const taskScores = normalizeTaskScores(
    (data.taskScores as Record<string, unknown> | undefined) || {},
    mode,
    taskType
  );

  const rawOverall = toScore(data.overall);
  const computedOverall =
    rawOverall > 0 ? rawOverall : Math.round(
      Object.values(taskScores).reduce((s, v) => s + v, 0) /
      (Object.keys(taskScores).length || 1)
    );

  const errors = toStringList(data.errors);

  return {
    overall: computedOverall,
    taskScores,
    errors,
    // feedback: dùng AI nếu có, fallback sang hàm riêng
    feedback: toText(data.feedback) || localFeedback(mode, taskType, computedOverall, taskScores, errors),
    // importantWords: LUÔN lấy từ prompt (AI có thể trả sai)
    importantWords: buildImportantWordsFromPrompt(prompt, taskType),
    // suggestedAnswer: dùng AI nếu có, fallback sang hàm riêng
    suggestedAnswer:
      toText(data.suggestedAnswer) || buildSuggestedAnswer(taskType, prompt, answer),
  };
}

// ============================================================
// DETERMINISTIC FALLBACK — same input → same output
// ============================================================
function deterministicGrade(input: GradeRequest): AiGradeResult {
  const { mode, taskType, prompt, answer } = input;
  const normalizedSpeakingTaskType = normalizeSpeakingTaskType(taskType);

  const relevance = calcRelevance(prompt, answer);
  const wc = answer.trim() ? answer.trim().split(/\s+/).filter(Boolean).length : 0;

  let taskScores: Record<string, number>;
  const errors: string[] = [];

  if (mode === 'speaking') {
    if (normalizedSpeakingTaskType === 'read_aloud') {
      const acc = clamp(0 + relevance * 0.5 + Math.min(wc, 80) * 0.05, 0, 95);
      const pron = clamp(0 + relevance * 0.5 + Math.min(wc, 60) * 0.08, 0, 95);
      const flu = clamp(0 + relevance * 0.5 + Math.min(wc, 100) * 0.1, 0, 95);
      const inton = clamp(0 + relevance * 0.5 + Math.min(wc, 50) * 0.1, 0, 95);
      taskScores = { Accuracy: acc, Pronunciation: pron, Fluency: flu, Intonation: inton };

      if (relevance === 0 && wc === 0) {
        errors.push('Bài làm không trả lời đúng yêu cầu đề bài.');
      } else if (relevance < 30) {
        errors.push('Bài làm không đúng trọng tâm đề bài, cần tập trung vào nội dung đề.');
      } else if (wc < 15) {
        errors.push('Bài ngắn, cần đọc đủ nội dung để đạt điểm cao hơn.');
      }
    } else if (normalizedSpeakingTaskType === 'describe_picture') {
      const content = clamp(0 + relevance * 0.65 + Math.min(wc, 100) * 0.05, 0, 95);
      const vocab = clamp(0 + relevance * 0.55 + Math.min(wc, 120) * 0.08, 0, 95);
      const flu = clamp(0 + relevance * 0.6 + Math.min(wc, 100) * 0.08, 0, 95);
      taskScores = { Content: content, Vocabulary: vocab, Fluency: flu };

      if (relevance === 0 && wc === 0) {
        errors.push('Bài làm không trả lời đúng yêu cầu đề bài.');
      } else if (relevance < 30) {
        errors.push('Bài làm không đúng trọng tâm đề bài.');
      } else if (wc < 20) {
        errors.push('Nội dung còn ngắn, chưa mô tả đủ chi tiết.');
      }
    } else if (normalizedSpeakingTaskType === 'respond_questions') {
      const direct = clamp(0 + relevance * 0.7 + Math.min(wc, 100) * 0.05, 0, 95);
      const support = clamp(0 + relevance * 0.6 + Math.min(wc, 120) * 0.06, 0, 95);
      const lang = clamp(0 + relevance * 0.55 + Math.min(wc, 120) * 0.07, 0, 95);
      const flu = clamp(0 + relevance * 0.6 + Math.min(wc, 100) * 0.08, 0, 95);
      taskScores = {
        'Direct Answer': direct,
        'Supporting Details': support,
        'Language Use': lang,
        Fluency: flu,
      };

      if (relevance === 0 && wc === 0) {
        errors.push('Bài làm không trả lời đúng yêu cầu đề bài.');
      } else if (relevance < 30) {
        errors.push('Câu trả lời chưa trả lời trực tiếp câu hỏi.');
      } else if (wc < 18) {
        errors.push('Cần thêm lý do hoặc ví dụ để câu trả lời đầy đủ hơn.');
      }
    } else if (normalizedSpeakingTaskType === 'respond_information') {
      const infoAcc = clamp(0 + relevance * 0.7 + Math.min(wc, 120) * 0.05, 0, 95);
      const complete = clamp(0 + relevance * 0.65 + Math.min(wc, 120) * 0.06, 0, 95);
      const org = clamp(0 + relevance * 0.6 + Math.min(wc, 100) * 0.07, 0, 95);
      const flu = clamp(0 + relevance * 0.55 + Math.min(wc, 100) * 0.08, 0, 95);
      taskScores = {
        'Information Accuracy': infoAcc,
        Completeness: complete,
        Organization: org,
        Fluency: flu,
      };

      if (relevance === 0 && wc === 0) {
        errors.push('Bài làm không trả lời đúng yêu cầu đề bài.');
      } else if (relevance < 35) {
        errors.push('Câu trả lời chưa bám sát dữ liệu trong đề bài.');
      } else if (wc < 18) {
        errors.push('Nội dung còn ngắn, chưa trả lời đủ thông tin cần thiết.');
      }
    } else {
      const opinion = clamp(0 + relevance * 0.65 + Math.min(wc, 120) * 0.06, 0, 95);
      const reasons = clamp(0 + relevance * 0.6 + Math.min(wc, 140) * 0.06, 0, 95);
      const org = clamp(0 + relevance * 0.55 + Math.min(wc, 120) * 0.07, 0, 95);
      const lang = clamp(0 + relevance * 0.55 + Math.min(wc, 120) * 0.08, 0, 95);
      taskScores = {
        'Opinion Clarity': opinion,
        'Reasons & Examples': reasons,
        Organization: org,
        'Language Use': lang,
      };

      if (relevance === 0 && wc === 0) {
        errors.push('Bài làm không trả lời đúng yêu cầu đề bài.');
      } else if (relevance < 30) {
        errors.push('Bài làm chưa nêu đúng trọng tâm của câu hỏi.');
      } else if (wc < 25) {
        errors.push('Nội dung còn ngắn, cần nêu rõ quan điểm và ví dụ hỗ trợ.');
      }
    }
  } else {
    // writing
    if (taskType === 'write_sentence_picture') {
      const { keywords } = extractPart1WritingContext(prompt);
      const answerLower = answer.toLowerCase();
      const matchedKeywords = keywords.filter((k) => answerLower.includes(k.toLowerCase()));
      const keywordCoverage = keywords.length > 0 ? matchedKeywords.length / Math.min(keywords.length, 2) : 0;

      const grammar = clamp(0 + relevance * 0.45 + Math.min(wc, 20) * 1.8, 0, 95);
      const vocab = clamp(0 + relevance * 0.35 + Math.min(wc, 20) * 1.5, 0, 95);
      const rel = clamp(0 + relevance * 0.5 + keywordCoverage * 45, 0, 95);
      taskScores = { Grammar: grammar, Vocabulary: vocab, Relevance: rel };

      if (relevance === 0 && wc === 0) {
        errors.push('Bài làm không trả lời đúng yêu cầu đề bài.');
      } else {
        if (keywords.length >= 2 && matchedKeywords.length < 2) {
          errors.push('Câu chưa sử dụng đủ cả 2 từ khóa bắt buộc.');
        }
        if (wc < 4) {
          errors.push('Câu quá ngắn, cần viết một câu hoàn chỉnh và có nghĩa.');
        }
        if (relevance < 35) {
          errors.push('Nội dung câu chưa khớp với ngữ cảnh hình ảnh/yêu cầu.');
        }
      }
    } else if (taskType === 'reply_email') {
      const taskResp = clamp(0 + relevance * 0.6 + Math.min(wc, 100) * 0.06, 0, 95);
      const grammar = clamp(0 + relevance * 0.5 + Math.min(wc, 120) * 0.07, 0, 95);
      const vocab = clamp(0 + relevance * 0.5 + Math.min(wc, 100) * 0.08, 0, 95);
      const coherence = clamp(0 + relevance * 0.55 + Math.min(wc, 120) * 0.07, 0, 95);
      taskScores = { 'Task Response': taskResp, Grammar: grammar, Vocabulary: vocab, Coherence: coherence };

      if (relevance === 0 && wc === 0) {
        errors.push('Bài làm không trả lời đúng yêu cầu đề bài.');
      } else if (relevance < 30) {
        errors.push('Chưa trả lời đúng/yêu cầu chính của đề bài.');
      } else if (wc < 30) {
        errors.push('Nội dung quá ngắn, cần đủ ý để đạt điểm cao hơn.');
      }
    } else {
      // opinion_essay
      const taskResp = clamp(0 + relevance * 0.6 + Math.min(wc, 150) * 0.05, 0, 95);
      const grammar = clamp(0 + relevance * 0.5 + Math.min(wc, 180) * 0.06, 0, 95);
      const vocab = clamp(0 + relevance * 0.5 + Math.min(wc, 150) * 0.07, 0, 95);
      const coherence = clamp(0 + relevance * 0.55 + Math.min(wc, 150) * 0.07, 0, 95);
      taskScores = { 'Task Response': taskResp, Grammar: grammar, Vocabulary: vocab, Coherence: coherence };

      if (relevance === 0 && wc === 0) {
        errors.push('Bài làm không trả lời đúng yêu cầu đề bài.');
      } else if (relevance < 30) {
        errors.push('Chưa trả lời đúng trọng tâm đề bài.');
      } else if (wc < 50) {
        errors.push('Bài luận quá ngắn, cần ít nhất 70-100 từ để đạt điểm tốt.');
      }
    }
  }

  const overall = Math.round(
    Object.values(taskScores).reduce((s, v) => s + v, 0) / Object.keys(taskScores).length
  );

  return {
    overall,
    taskScores,
    errors: errors.length > 0 ? errors : [],
    feedback: localFeedback(mode, taskType, overall, taskScores, errors),
    importantWords: buildImportantWordsFromPrompt(
      prompt,
      mode === 'speaking' ? normalizedSpeakingTaskType : taskType
    ),
    suggestedAnswer: buildSuggestedAnswer(
      mode === 'speaking' ? normalizedSpeakingTaskType : taskType,
      prompt,
      answer
    ),
  };
}

function normalizeTaskScores(
  input: Record<string, unknown>,
  mode: 'speaking' | 'writing',
  taskType: string
): Record<string, number> {
  const normalized: Record<string, number> = {};

  for (const [k, v] of Object.entries(input)) {
    normalized[k] = toScore(v);
  }

  if (Object.keys(normalized).length > 0) return normalized;

  // Fallback defaults (should rarely be used now with better prompt)
  if (mode === 'speaking' && isReadAloudTaskType(taskType)) {
    return { Accuracy: 0, Pronunciation: 0, Fluency: 0, Intonation: 0 };
  }
  if (mode === 'speaking') {
    const config = getSpeakingTaskConfig(taskType);
    return Object.fromEntries(Object.keys(config.criteria).map((k) => [k, 0]));
  }
  if (mode === 'writing' && taskType === 'reply_email') {
    return { 'Task Response': 0, Grammar: 0, Vocabulary: 0, Coherence: 0 };
  }
  return { 'Task Response': 0, Grammar: 0, Vocabulary: 0, Coherence: 0 };
}

function localFeedback(
  mode: 'speaking' | 'writing',
  taskType: string,
  overall: number,
  taskScores: Record<string, number>,
  errors: string[]
) {
  const scoreLine = Object.entries(taskScores)
    .map(([k, v]) => `- ${k}: ${v}/100`)
    .join('\n');
  const errLine =
    errors.length > 0
      ? errors.map((e) => `- ${e}`).join('\n')
      : '- Chưa phát hiện lỗi nghiêm trọng.';

  let tip = '';
  if (overall === 0) {
    tip = 'Bài làm hoàn toàn không đúng yêu cầu đề bài. Hãy đọc kỹ đề và trả lời đúng nội dung được yêu cầu.';
  } else if (overall < 40) {
    tip = 'Bài làm còn nhiều thiếu sót. Cần bám sát đề bài và trả lời đầy đủ yêu cầu.';
  } else if (overall < 70) {
    tip = 'Bài làm có nội dung khá nhưng cần cải thiện thêm để đạt điểm cao hơn.';
  } else {
    tip = 'Bài làm tốt. Tiếp tục luyện tập để nâng cao điểm số.';
  }

  return `1) Tổng quan (${mode === 'speaking' ? 'Speaking' : 'Writing'}):
- Overall: ${overall}/100

2) Điểm thành phần:
${scoreLine}

3) Lỗi cần cải thiện:
${errLine}

4) Gợi ý:
${tip}`;
}

// Extract passage text from prompt (for Part 1 read_aloud)
function extractPassageFromPrompt(prompt: string): string {
  // Prompt format: "Read this passage aloud. [text]" or just raw passage
  // Try to find the passage between quotes, or after common prefixes
  const quoted = prompt.match(/["""']([^""']{20,})[""']/);
  if (quoted) return quoted[1].trim();

  // Remove common instruction prefixes
  const cleaned = prompt
    .replace(/^(read\s+this\s+passage\s+aloud\.?\s*)/i, '')
    .replace(/^(you\s+will\s+read\s+.*?\.?\s*)/i, '')
    .replace(/^(in\s+this\s+task.*?\.?\s*)/i, '')
    .trim();

  // If cleaned is long enough (>30 chars) and mostly English, return it
  if (cleaned.length > 30 && /[a-z]{5,}/i.test(cleaned)) {
    return cleaned;
  }
  return prompt;
}

function buildImportantWordsFromPrompt(prompt: string, taskType?: string): string[] {
  // Always extract from prompt (not from AI response)
  const sourceText = isReadAloudTaskType(taskType || '')
    ? extractPassageFromPrompt(prompt)
    : prompt;

  // Extract meaningful English words (length >= 4)
  const tokens = (sourceText.toLowerCase().match(/[a-z]{4,}/g) || []);
  const unique = Array.from(new Set(tokens));

  // Filter out very common words (stop words)
  const stopWords = new Set([
    'that', 'this', 'with', 'from', 'have', 'been', 'will', 'your',
    'they', 'what', 'when', 'make', 'like', 'time', 'just', 'know',
    'take', 'people', 'into', 'year', 'more', 'come', 'could', 'than',
    'them', 'same', 'but', 'she', 'her', 'some', 'him', 'his', 'how',
    'its', 'may', 'new', 'one', 'two', 'all', 'are', 'was', 'were',
    'being', 'were', 'over', 'such', 'also', 'only', 'very', 'most',
    'each', 'many', 'more', 'much', 'must', 'should', 'about', 'after',
  ]);

  const filtered = unique.filter(w => !stopWords.has(w) && w.length >= 5);
  const topWords = filtered.slice(0, 8);

  return topWords.map((w) => {
    const pos = inferType(w);
    const def = inferMeaning(w);
    return `${w} (${pos}): ${def}`;
  });
}

function buildSuggestedAnswer(taskType: string, prompt: string, answer: string): string {
  if (isReadAloudTaskType(taskType)) {
    // Part 1: đoạn văn chính là đáp án — trích xuất từ prompt
    const passage = extractPassageFromPrompt(prompt);
    return passage || prompt;
  }
  if (answer.trim()) return sentenceCase(answer.trim());
  return `Hãy trả lời trực tiếp yêu cầu trong đề bài, phát triển đủ ý chính kèm ví dụ cụ thể.`;
}

function isReadAloudTaskType(taskType: string): boolean {
  return normalizeSpeakingTaskType(taskType) === 'read_aloud';
}

function normalizeSpeakingTaskType(taskType: string): string {
  const normalized = String(taskType || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalized === 'readaloud' || normalized === 'part1readaloud' || normalized === 'readaloudpart1') {
    return 'read_aloud';
  }
  if (normalized === 'describepicture' || normalized === 'describeimage' || normalized === 'part2describepicture') {
    return 'describe_picture';
  }
  if (normalized === 'respondquestions' || normalized === 'part3respondquestions') {
    return 'respond_questions';
  }
  if (normalized === 'respondinformation' || normalized === 'part4respondinformation') {
    return 'respond_information';
  }
  if (normalized === 'expressopinion' || normalized === 'part5expressopinion' || normalized === 'proposesolution') {
    return 'express_opinion';
  }
  return taskType;
}

function calcRelevance(prompt: string, answer: string): number {
  const p = new Set(prompt.toLowerCase().match(/[a-z']+/g) || []);
  const a = new Set(answer.toLowerCase().match(/[a-z']+/g) || []);
  if (!p.size || !a.size) return 0;
  let hit = 0;
  for (const t of p) {
    if (a.has(t)) hit += 1;
  }
  return Math.round((hit / p.size) * 100);
}

function toScore(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return clamp(n, 0, 100);
}

function toStringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x).trim()).filter(Boolean);
}

function toText(v: unknown): string {
  return String(v ?? '').trim();
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function sentenceCase(input: string) {
  if (!input) return input;
  const t = input.replace(/\s+/g, ' ').trim();
  const first = t[0].toUpperCase();
  const rest = t.length > 1 ? t.slice(1) : '';
  const out = `${first}${rest}`;
  return /[.!?]$/.test(out) ? out : `${out}.`;
}

function inferType(word: string): string {
  if (word.endsWith('ly')) return 'adverb';
  if (word.endsWith('tion') || word.endsWith('ment') || word.endsWith('ness')) return 'noun';
  if (word.endsWith('ive') || word.endsWith('ous') || word.endsWith('al')) return 'adjective';
  if (word.endsWith('ing') || word.endsWith('ed') || word.endsWith('ize')) return 'verb';
  return 'word';
}

function inferMeaning(word: string): string {
  const dict: Record<string, string> = {
    meeting: 'cuộc họp',
    schedule: 'lịch trình',
    support: 'hỗ trợ',
    customer: 'khách hàng',
    quality: 'chất lượng',
    opinion: 'quan điểm',
    productivity: 'năng suất',
    workshop: 'hội thảo',
    information: 'thông tin',
    improve: 'cải thiện',
    important: 'quan trọng',
    opportunity: 'cơ hội',
    benefit: 'lợi ích',
    communicate: 'giao tiếp',
    problem: 'vấn đề',
    solution: 'giải pháp',
    deadline: 'thời hạn',
    project: 'dự án',
  };
  return dict[word] || 'từ khóa trong đề bài';
}
