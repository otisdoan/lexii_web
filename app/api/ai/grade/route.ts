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
      const promptText = buildPrompt({ mode, taskType, prompt, answer });

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
          const result = normalizeResult(parsed, mode, taskType, prompt, answer);

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
function buildPrompt(input: GradeRequest) {
  const { mode, taskType, prompt, answer } = input;
  const rubric = getRubric(mode, taskType);
  const taskDesc = getTaskDescription(mode, taskType);

  return (
    `Bạn là giám khảo chấm bài thi TOEIC ${mode === 'speaking' ? 'Speaking' : 'Writing'} theo tiêu chuẩn ETS.\n` +
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

function getTaskDescription(mode: 'speaking' | 'writing', taskType: string): string {
  if (mode === 'speaking') {
    const d: Record<string, string> = {
      read_aloud:
        'Học viên phải ĐỌC TO, RÕ RÀNG đoạn văn bằng tiếng Anh trong đề bài.\n' +
        '- Yêu cầu: đọc đúng từng từ, phát âm chuẩn, ngữ điệu tự nhiên, tốc độ phù hợp.\n' +
        '- VÍ DỤ SAI NGHIÊM TRỌNG: nói "Hello, my name is..." hoặc bất kỳ nội dung nào KHÔNG PHẢI đoạn văn trong đề → overall = 0.',
      describe_image:
        'Học viên phải MÔ TẢ HÌNH ẢNH được cung cấp trong đề bài.\n' +
        '- Yêu cầu: mô tả chi tiết những gì thấy trong tranh (người, vật, hành động, bối cảnh).\n' +
        '- VÍ DỤ SAI: nói sai nội dung tranh hoặc không mô tả tranh → điểm rất thấp.',
      respond_questions:
        'Học viên phải TRẢ LỜI CÂU HỎI được nêu trong đề bài.\n' +
        '- Yêu cầu: trả lời đúng câu hỏi, đủ ý, có ví dụ cụ thể.\n' +
        '- VÍ DỤ SAI: trả lời sai chủ đề hoặc không trả lời câu hỏi → điểm thấp.',
      express_opinion:
        'Học viên phải TRÌNH BÀY QUAN ĐIỂM về chủ đề được nêu trong đề bài.\n' +
        '- Yêu cầu: nêu quan điểm rõ ràng, lý do, ví dụ hỗ trợ.\n' +
        '- VÍ DỤ SAI: không trình bày quan điểm hoặc lạc đề → điểm thấp.',
      propose_solution:
        'Học viên phải ĐỀ XUẤT GIẢI PHÁP cho vấn đề trong đề bài.\n' +
        '- Yêu cầu: đề xuất giải pháp cụ thể, khả thi, có phân tích.\n' +
        '- VÍ DỤ SAI: không đề xuất giải pháp hoặc lạc đề → điểm thấp.',
    };
    return d[taskType] || `Học viên phải hoàn thành nhiệm vụ "${taskType}" theo đề bài.`;
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
    if (taskType === 'read_aloud') {
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
    if (taskType === 'describe_image') {
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
  const importantWords = toStringList(data.importantWords);

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

  const relevance = calcRelevance(prompt, answer);
  const wc = answer.trim() ? answer.trim().split(/\s+/).filter(Boolean).length : 0;

  let taskScores: Record<string, number>;
  const errors: string[] = [];

  if (mode === 'speaking') {
    if (taskType === 'read_aloud') {
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
    } else {
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
    }
  } else {
    // writing
    if (taskType === 'write_sentence_picture') {
      const grammar = clamp(0 + relevance * 0.55 + Math.min(wc, 60) * 0.12, 0, 95);
      const rel = clamp(0 + relevance * 0.65, 0, 95);
      taskScores = { Grammar: grammar, Relevance: rel };

      if (relevance === 0 && wc === 0) {
        errors.push('Bài làm không trả lời đúng yêu cầu đề bài.');
      } else if (relevance < 30) {
        errors.push('Mô tả không đúng trọng tâm của bức tranh.');
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
    importantWords: buildImportantWordsFromPrompt(prompt, taskType),
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

  // Fallback defaults (should rarely be used now with better prompt)
  if (mode === 'speaking' && taskType === 'read_aloud') {
    return { Accuracy: 0, Pronunciation: 0, Fluency: 0, Intonation: 0 };
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
  const sourceText = taskType === 'read_aloud'
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
  if (taskType === 'read_aloud') {
    // Part 1: đoạn văn chính là đáp án — trích xuất từ prompt
    const passage = extractPassageFromPrompt(prompt);
    return passage || prompt;
  }
  if (answer.trim()) return sentenceCase(answer.trim());
  return `Hãy trả lời trực tiếp yêu cầu trong đề bài, phát triển đủ ý chính kèm ví dụ cụ thể.`;
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
