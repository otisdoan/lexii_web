import { NextResponse } from 'next/server';

type GradeRequest = {
  mode: 'speaking' | 'writing';
  taskType: string;
  prompt: string;
  answer: string;
};

type AiGradeResult = {
  overall: number;
  taskScores: Record<string, number>;
  errors: string[];
  feedback: string;
  importantWords: string[];
  suggestedAnswer: string;
};

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GradeRequest;
    const { mode, taskType, prompt, answer } = body;

    if (!mode || !taskType || !prompt) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    if (!apiKey) {
      return NextResponse.json({ result: localFallback(mode, taskType, prompt, answer) });
    }

    const promptText = buildPrompt({ mode, taskType, prompt, answer });
    const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { temperature: 0.2 },
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ result: localFallback(mode, taskType, prompt, answer) });
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const raw =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';

    const parsed = safeParseJson(raw);
    if (!parsed) {
      return NextResponse.json({ result: localFallback(mode, taskType, prompt, answer) });
    }

    const result = normalizeResult(parsed, mode, taskType, prompt, answer);
    return NextResponse.json({ result });
  } catch {
    return NextResponse.json(
      {
        result: localFallback('writing', 'opinion_essay', '', ''),
      },
      { status: 200 }
    );
  }
}

function buildPrompt(input: GradeRequest) {
  const { mode, taskType, prompt, answer } = input;

  return `Bạn là giám khảo TOEIC ${mode === 'speaking' ? 'Speaking' : 'Writing'} chuyên nghiệp.
Chấm theo task_type: ${taskType}.
Nhận xét bằng tiếng Việt có dấu, cụ thể theo tiêu chí luyện tập.

Đề bài:\n${prompt}
Bài làm của học viên:\n${answer || '(không có nội dung)'}

Trả về DUY NHẤT JSON hợp lệ theo schema:
{
  "overall": 0,
  "taskScores": {"criterion": 0},
  "errors": ["..."],
  "feedback": "...",
  "importantWords": ["word (type): nghĩa"],
  "suggestedAnswer": "..."
}

Yêu cầu:
- overall phải đồng nhất với taskScores.
- importantWords phải lấy từ từ khóa trong đề bài.
- feedback chuyên nghiệp, không chung chung.`;
}

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
  const overall =
    toScore(data.overall) > 0 ? toScore(data.overall) : averageScores(taskScores);

  const errors = toStringList(data.errors);
  const importantWords = toStringList(data.importantWords);

  return {
    overall,
    taskScores,
    errors,
    feedback: toText(data.feedback) || localFeedback(mode, taskType, overall, taskScores, errors),
    importantWords:
      importantWords.length > 0 ? importantWords : buildImportantWordsFromPrompt(prompt),
    suggestedAnswer: toText(data.suggestedAnswer) || buildSuggestedAnswer(taskType, prompt, answer),
  };
}

function localFallback(
  mode: 'speaking' | 'writing',
  taskType: string,
  prompt: string,
  answer: string
): AiGradeResult {
  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const relevance = calcRelevance(prompt, answer);
  const grammar = clamp(35 + Math.min(wordCount, 120) / 2 + relevance * 0.15, 20, 95);
  const vocab = clamp(30 + Math.min(wordCount, 150) / 2.2 + relevance * 0.1, 20, 95);
  const coherence = clamp(28 + Math.min(wordCount, 180) / 2.8 + relevance * 0.2, 20, 95);

  const taskScores = normalizeTaskScores(
    {
      Grammar: grammar,
      Vocabulary: vocab,
      Coherence: coherence,
      Relevance: relevance,
    },
    mode,
    taskType
  );

  const errors = buildErrors(mode, taskType, answer, relevance);
  const overall = averageScores(taskScores);

  return {
    overall,
    taskScores,
    errors,
    feedback: localFeedback(mode, taskType, overall, taskScores, errors),
    importantWords: buildImportantWordsFromPrompt(prompt),
    suggestedAnswer: buildSuggestedAnswer(taskType, prompt, answer),
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

  if (mode === 'speaking' && taskType === 'read_aloud') {
    return {
      Accuracy: 72,
      Pronunciation: 70,
      Fluency: 68,
      Intonation: 66,
    };
  }

  if (mode === 'writing' && taskType === 'reply_email') {
    return {
      Relevance: 70,
      Grammar: 68,
      Vocabulary: 67,
      Completeness: 69,
    };
  }

  return {
    Grammar: 68,
    Vocabulary: 67,
    Coherence: 69,
  };
}

function buildErrors(
  mode: 'speaking' | 'writing',
  taskType: string,
  answer: string,
  relevance: number
): string[] {
  const out: string[] = [];
  const wc = answer.trim() ? answer.trim().split(/\s+/).length : 0;

  if (wc < 20) out.push('Nội dung còn ngắn, chưa phát triển đủ ý chính của đề bài.');
  if (relevance < 35) out.push('Câu trả lời bám đề chưa sát, cần nhắc lại đúng trọng tâm câu hỏi.');

  if (mode === 'speaking' && taskType === 'read_aloud') {
    out.push('Cần nhấn trọng âm từ khóa và ngắt nghỉ theo dấu câu để tăng Intonation.');
  }

  if (mode === 'writing' && taskType === 'reply_email') {
    out.push('Bài email nên có mở đầu lịch sự và đề xuất hành động rõ ràng ở phần kết.');
  }

  return out;
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
  const errLine = errors.length ? errors.map((e) => `- ${e}`).join('\n') : '- Chưa có lỗi nghiêm trọng.';

  return `1) Tổng quan (${mode === 'speaking' ? 'Speaking' : 'Writing'}):\n- Overall: ${overall}/100\n\n2) Điểm thành phần:\n${scoreLine}\n\n3) Lỗi cần cải thiện:\n${errLine}\n\n4) Gợi ý theo dạng ${taskType}:\n- Tăng mức độ bám đề, dùng cấu trúc câu rõ ràng, thêm ví dụ cụ thể để nâng điểm.`;
}

function buildImportantWordsFromPrompt(prompt: string): string[] {
  const tokens = (prompt.toLowerCase().match(/[a-z']+/g) || []).filter((w) => w.length >= 5);
  const unique = Array.from(new Set(tokens)).slice(0, 6);
  return unique.map((w) => `${w} (${inferType(w)}): ${inferMeaning(w)}`);
}

function buildSuggestedAnswer(taskType: string, prompt: string, answer: string): string {
  if (answer.trim()) return sentenceCase(answer.trim());
  return `Bài mẫu (${taskType}): trả lời trực tiếp yêu cầu của đề "${prompt}", sau đó phát triển 2 ý chính bằng ví dụ cụ thể.`;
}

function calcRelevance(prompt: string, answer: string): number {
  const p = new Set(prompt.toLowerCase().match(/[a-z']+/g) || []);
  const a = new Set(answer.toLowerCase().match(/[a-z']+/g) || []);
  if (!p.size || !a.size) return 0;
  let hit = 0;
  for (const t of p) {
    if (a.has(t)) hit += 1;
  }
  return clamp((hit / p.size) * 100, 0, 100);
}

function averageScores(scores: Record<string, number>): number {
  const values = Object.values(scores);
  if (!values.length) return 0;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
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
  };
  return dict[word] || 'từ quan trọng trong đề bài';
}
