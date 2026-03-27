'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileAudio,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { gradeAiAnswer, getCurrentUser, savePracticeHistory } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import AudioPlayer from '@/app/components/AudioPlayer';
import type { AiGradeResult } from '@/lib/types';

type SpeakingPrompt = {
  id: string;
  taskType: string;
  title: string;
  passage?: string;
  prompt: string;
  imageUrl?: string;
  modelAnswer?: string;
};

type SpeakingResultData = {
  partTitle: string;
  partNumber: number;
  prompts: SpeakingPrompt[];
  userAnswers: Record<string, string>;
  transcribedTexts?: Record<string, string>;
};

async function uploadPracticeAudio(userId: string, promptId: string, audioUrl: string): Promise<string> {
  if (!audioUrl) return '';

  try {
    const res = await fetch(audioUrl);
    const blob = await res.blob();
    if (!blob.size) return '';

    const ext = blob.type.includes('mpeg') ? 'mp3' : blob.type.includes('wav') ? 'wav' : 'webm';
    const fileName = `${userId}/${Date.now()}-${promptId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('practice-audios')
      .upload(fileName, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: blob.type || 'audio/webm',
      });

    if (uploadError) return '';

    const { data } = supabase.storage.from('practice-audios').getPublicUrl(fileName);
    return data.publicUrl || '';
  } catch {
    return '';
  }
}

function normalizeTranscribedText(raw: string | undefined): string {
  const text = String(raw || '').trim();
  if (!text) return '';

  const lower = text.toLowerCase();
  const isPending = lower.includes('đang chuyển giọng nói thành văn bản');
  const isError = lower.startsWith('[lỗi') || lower.startsWith('lỗi');

  if (isPending || isError) return '';
  return text;
}

const TASK_LABELS: Record<string, string> = {
  pronunciation: 'Phát âm',
  fluency: 'Trôi chảy',
  grammar: 'Ngữ pháp',
  vocabulary: 'Từ vựng',
  task_response: 'Nội dung',
  coherence: 'Mạch lạc',
  accuracy: 'Accuracy',
  intonation: 'Intonation',
  content: 'Content',
  relevance: 'Relevance',
  completeness: 'Completeness',
  content_coverage: 'Bao quát nội dung',
  detail_accuracy: 'Độ chính xác chi tiết',
  organization: 'Tổ chức ý',
  delivery: 'Phát âm & lưu loát',
  direct_answer: 'Trả lời trực tiếp',
  supporting_details: 'Ý hỗ trợ/ví dụ',
  language_use: 'Ngôn ngữ sử dụng',
  information_accuracy: 'Độ chính xác thông tin',
  opinion_clarity: 'Độ rõ quan điểm',
  reasons_examples: 'Lý do & ví dụ',
  'task response': 'Nội dung',
};

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700 w-8 text-right">{score}</span>
    </div>
  );
}

function isReadAloudTaskType(taskType: string): boolean {
  const normalized = String(taskType || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return (
    normalized === 'readaloud' ||
    normalized === 'part1readaloud' ||
    normalized === 'readaloudpart1'
  );
}

function isPart2To5SpeakingTask(taskType: string): boolean {
  const normalized = String(taskType || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return (
    normalized === 'describepicture' ||
    normalized === 'respondquestions' ||
    normalized === 'respondinformation' ||
    normalized === 'expressopinion' ||
    normalized === 'proposesolution'
  );
}

function SpeakingResultCard({ prompt, audioUrl, result, index, transcribedText }: {
  prompt: SpeakingPrompt;
  audioUrl: string;
  result?: AiGradeResult;
  index: number;
  transcribedText?: string;
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const isPart1ReadAloud = isReadAloudTaskType(prompt.taskType);
  const isPart2To5 = isPart2To5SpeakingTask(prompt.taskType);
  const part1 = isPart1ReadAloud ? result?.part1ReadAloud : undefined;
  const partSpeaking = isPart2To5 ? result?.partSpeaking : undefined;
  const partSpeakingScore = partSpeaking?.overallScore ?? Math.round((result?.overall || 0) * 2);
  const partSpeakingCriteria = partSpeaking?.criteriaScores || {};
  const partSpeakingMistakes = partSpeaking?.mistakes || [];
  const partSpeakingSuggestions = partSpeaking?.suggestions || [];
  const partSpeakingImprovedVocabulary = partSpeaking?.improvedVocabulary || [];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Card header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-primary">{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{prompt.title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{prompt.prompt.slice(0, 60)}...</p>
        </div>
        {result ? (
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <span className="text-lg font-bold text-primary">{part1 ? part1.overallScore : partSpeaking ? partSpeakingScore : result.overall}</span>
              <span className="text-xs text-slate-400">{part1 ? '/200' : partSpeaking ? '/200' : '/100'}</span>
            </div>
          </div>
        ) : audioUrl ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-600 rounded-full text-xs font-semibold shrink-0">
            <FileAudio className="w-3 h-3" /> Đã thu
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-semibold shrink-0">
            Chưa thu
          </span>
        )}
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
          {/* Passage (Read Aloud) */}
          {prompt.passage && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-semibold text-blue-600 mb-2">Đoạn văn cần đọc</p>
              <p className="text-sm text-slate-700 leading-relaxed italic">{prompt.passage}</p>
            </div>
          )}

          {/* Prompt / Question */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500 mb-1">
              {prompt.passage ? 'Yêu cầu' : 'Câu hỏi'}
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">{prompt.prompt}</p>
          </div>

          {/* Audio */}
          {audioUrl && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Bài thu của bạn</p>
              <AudioPlayer src={audioUrl} />
            </div>
          )}

          {/* Transcribed text */}
          {transcribedText && (
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
              <p className="text-xs font-semibold text-teal-600 mb-2">Văn bản nhận diện từ giọng nói</p>
              <p className="text-sm text-slate-700 leading-relaxed italic">{transcribedText}</p>
            </div>
          )}

          {/* AI Scores */}
          {result && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-bold text-slate-800">Điểm chi tiết</h4>
              </div>

              {/* Part 1 Read Aloud dedicated block */}
              {part1 && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-700">TOEIC Speaking Score</p>
                    <p className="text-lg font-black text-primary">{part1.overallScore}/200</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-center">
                      <p className="text-[11px] font-semibold text-slate-500">Pronunciation</p>
                      <p className="text-base font-bold text-slate-800">{part1.pronunciation}/5</p>
                    </div>
                    <div className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-center">
                      <p className="text-[11px] font-semibold text-slate-500">Fluency</p>
                      <p className="text-base font-bold text-slate-800">{part1.fluency}/5</p>
                    </div>
                    <div className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-center">
                      <p className="text-[11px] font-semibold text-slate-500">Accuracy</p>
                      <p className="text-base font-bold text-slate-800">{part1.accuracy}/5</p>
                    </div>
                  </div>

                  {part1.spokenFeedback && (
                    <div className="rounded-lg border border-teal-200 bg-teal-50 p-3">
                      <p className="text-xs font-semibold text-teal-700 mb-1">Spoken feedback</p>
                      <p className="text-sm text-teal-900">{part1.spokenFeedback}</p>
                    </div>
                  )}

                  {part1.detailedFeedback && (
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold text-slate-600 mb-1">Detailed feedback</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{part1.detailedFeedback}</p>
                    </div>
                  )}

                  {part1.mistakes && part1.mistakes.length > 0 && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-xs font-semibold text-red-700 mb-2">Detected mistakes</p>
                      <ul className="space-y-1.5">
                        {part1.mistakes.map((m, i) => (
                          <li key={i} className="text-sm text-red-800">
                            <span className="font-semibold">{m.word}</span>
                            <span className="mx-1 text-red-400">•</span>
                            <span className="uppercase text-xs font-bold">{m.issue}</span>
                            <span className="mx-1 text-red-400">-</span>
                            <span>{m.explanation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {part1.suggestions && part1.suggestions.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs font-semibold text-amber-700 mb-2">3 suggestions</p>
                      <ul className="space-y-1.5">
                        {part1.suggestions.slice(0, 3).map((s, i) => (
                          <li key={i} className="text-sm text-amber-900">{i + 1}. {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Part 2-5 dedicated block */}
              {partSpeaking && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-700">TOEIC Speaking Score</p>
                    <p className="text-lg font-black text-indigo-700">{partSpeakingScore}/200</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(partSpeakingCriteria).map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-white border border-indigo-100 px-3 py-2 text-center">
                        <p className="text-[11px] font-semibold text-slate-500">{TASK_LABELS[k] || k}</p>
                        <p className="text-base font-bold text-slate-800">{v}/5</p>
                      </div>
                    ))}
                  </div>

                  {partSpeaking.spokenFeedback && (
                    <div className="rounded-lg border border-teal-200 bg-teal-50 p-3">
                      <p className="text-xs font-semibold text-teal-700 mb-1">Spoken feedback</p>
                      <p className="text-sm text-teal-900">{partSpeaking.spokenFeedback}</p>
                    </div>
                  )}

                  {partSpeaking.detailedFeedback && (
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold text-slate-600 mb-1">Detailed feedback</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{partSpeaking.detailedFeedback}</p>
                    </div>
                  )}

                  {partSpeakingMistakes.length > 0 && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-xs font-semibold text-red-700 mb-2">Điểm cần cải thiện</p>
                      <ul className="space-y-1.5">
                        {partSpeakingMistakes.map((m, i) => (
                          <li key={i} className="text-sm text-red-800">
                            <span className="uppercase text-xs font-bold">{m.type}</span>
                            <span className="mx-1 text-red-400">-</span>
                            <span>{m.issue || m.text}</span>
                            {m.suggestion && (
                              <>
                                <span className="mx-1 text-red-300">-&gt;</span>
                                <span className="text-red-900">{m.suggestion}</span>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {partSpeakingImprovedVocabulary.length > 0 && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <p className="text-xs font-semibold text-blue-700 mb-2">Vocabulary improvement</p>
                      <div className="flex flex-wrap gap-2">
                        {partSpeakingImprovedVocabulary.map((word, i) => (
                          <span key={i} className="px-2.5 py-1 text-xs font-medium rounded-full border border-blue-200 bg-white text-blue-700">
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {partSpeakingSuggestions.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs font-semibold text-amber-700 mb-2">3 suggestions</p>
                      <ul className="space-y-1.5">
                        {partSpeakingSuggestions.slice(0, 3).map((s, i) => (
                          <li key={i} className="text-sm text-amber-900">{i + 1}. {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {!part1 && !partSpeaking && (
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                {/* Overall */}
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200">
                  <span className="text-sm font-bold text-slate-700">Tổng điểm</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          result.overall >= 80 ? 'bg-green-500' : result.overall >= 60 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${result.overall}%` }}
                      />
                    </div>
                    <span className="text-base font-bold text-slate-800 w-10 text-right">{result.overall}/100</span>
                  </div>
                </div>
                {Object.entries(result.taskScores).map(([k, v]) => (
                  <ScoreBar key={k} score={v} label={TASK_LABELS[k] || k} />
                ))}
              </div>
              )}

              {/* Errors */}
              {!part1 && !partSpeaking && result.errors && result.errors.length > 0 && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsDown className="w-4 h-4 text-red-600" />
                    <h4 className="text-sm font-bold text-red-700">Lỗi cần sửa</h4>
                  </div>
                  <ul className="space-y-1.5">
                    {result.errors.map((e, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                        <span className="text-red-400 mt-0.5 shrink-0">•</span>
                        <span>{e}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Feedback */}
              {!part1 && !partSpeaking && result.feedback && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsUp className="w-4 h-4 text-teal-600" />
                    <h4 className="text-sm font-bold text-slate-700">Phân tích & góp ý</h4>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{result.feedback}</p>
                </div>
              )}

              {/* Suggested vocabulary */}
              {!part1 && !partSpeaking && result.importantWords && result.importantWords.length > 0 && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <h4 className="text-sm font-bold text-blue-700 mb-2">Từ vựng nên dùng</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.importantWords.map((w, i) => (
                      <span key={i} className="px-3 py-1 bg-white border border-blue-200 rounded-full text-xs font-medium text-blue-700">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* AI suggestion */}
              {!part1 && !partSpeaking && result.suggestedAnswer && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <h4 className="text-sm font-bold text-amber-700">Gợi ý của AI</h4>
                  </div>
                  <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-wrap">{result.suggestedAnswer}</p>
                </div>
              )}
            </div>
          )}

          {/* Practice mode - no AI grading */}
          {!result && audioUrl && (
            <div className="rounded-xl border border-slate-200 p-4 text-center">
              <FileAudio className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                Bài thu âm đã được lưu. Chọn chế độ <strong>AI Chấm</strong> để xem đánh giá chi tiết.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SpeakingResultPage() {
  const router = useRouter();

  const [data] = useState<SpeakingResultData | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = sessionStorage.getItem('speaking_result');
    if (!stored) return null;
    try {
      return JSON.parse(stored) as SpeakingResultData;
    } catch {
      return null;
    }
  });

  const [grading, setGrading] = useState(true);
  const [results, setResults] = useState<Record<string, AiGradeResult>>({});

  useEffect(() => {
    async function run() {
      if (!data) return;
      setGrading(true);
      setResults({});

      const out: Record<string, AiGradeResult> = {};

      for (const prompt of data.prompts) {
        const audioUrl = data.userAnswers[prompt.id] || '';
        if (!audioUrl) continue;

        // Use transcribed text if available, otherwise fallback
        const rawTranscribedText = data.transcribedTexts?.[prompt.id] || '';
        const transcribedText = normalizeTranscribedText(rawTranscribedText);

        console.log('[GRADE-SPEAKING] === GRADING PROMPT ===');
        console.log('[GRADE-SPEAKING] prompt id:', prompt.id);
        console.log('[GRADE-SPEAKING] taskType:', prompt.taskType);
        console.log('[GRADE-SPEAKING] prompt text:', prompt.prompt);
        console.log('[GRADE-SPEAKING] rawTranscribedText:', JSON.stringify(rawTranscribedText));
        console.log('[GRADE-SPEAKING] transcribedText:', JSON.stringify(transcribedText));
        console.log('[GRADE-SPEAKING] transcribedText length:', transcribedText.length, 'chars');
        console.log('[GRADE-SPEAKING] ==============================');

        if (!transcribedText) {
          out[prompt.id] = {
            overall: 0,
            taskScores: {},
            errors: ['Chưa có văn bản nhận diện hợp lệ để chấm điểm.'],
            feedback: 'Hệ thống chưa có transcript hợp lệ. Hãy quay lại câu hỏi, thu âm lại và đợi nhận diện xong rồi nộp.',
            importantWords: [],
            suggestedAnswer: '',
          };
          continue;
        }

        try {
          out[prompt.id] = await gradeAiAnswer({
            mode: 'speaking',
            taskType: prompt.taskType,
            // Part 1: passage là đoạn văn cần đọc (đáp án đúng)
            // Các part khác: prompt là câu hỏi/yêu cầu
            prompt: prompt.passage || prompt.prompt,
            answer: transcribedText,
          });
          console.log('[GRADE-SPEAKING] Grade result:', JSON.stringify(out[prompt.id]));
        } catch {
          console.log('[GRADE-SPEAKING] Grade failed for prompt:', prompt.id);
          out[prompt.id] = {
            overall: 0,
            taskScores: {},
            errors: [],
            feedback: 'Không thể chấm bài.',
            importantWords: [],
            suggestedAnswer: '',
          };
        }
        console.log('[GRADE-SPEAKING] ==============================');
      }

      setResults(out);
      setGrading(false);

      // Save to practice history
      const user = await getCurrentUser();
      if (!user) return;

      await Promise.allSettled(
        data.prompts.map(async (prompt) => {
          const gradeResult = out[prompt.id];
          const originalAudioUrl = data.userAnswers[prompt.id] || '';
          const storedAudioUrl = await uploadPracticeAudio(user.id, prompt.id, originalAudioUrl);
          const persistedAudioUrl = storedAudioUrl || (originalAudioUrl.startsWith('http') ? originalAudioUrl : '');
          const promptContent = JSON.stringify({
            prompt: prompt.prompt,
            passage: prompt.passage || '',
            displayText: prompt.passage || prompt.prompt,
            imageUrl: prompt.imageUrl || '',
            audioUrl: persistedAudioUrl,
            modelAnswer: prompt.modelAnswer || '',
            title: prompt.title,
            taskType: prompt.taskType,
          });
          const transcribedText = normalizeTranscribedText(data.transcribedTexts?.[prompt.id]);
          await savePracticeHistory({
            userId: user.id,
            mode: 'speaking',
            partNumber: data.partNumber,
            promptId: prompt.id,
            promptTitle: prompt.title,
            promptContent,
            userAnswer: transcribedText || '(không có nội dung)',
            gradeResult,
          });
        })
      );
    }

    void run();
  }, [data]);

  const averageOverall = useMemo(() => {
    const vals = Object.values(results).map(r => r.overall).filter(v => v > 0);
    if (!vals.length) return 0;
    return Math.round(vals.reduce((sum, v) => sum + v, 0) / vals.length);
  }, [results]);

  const averageToeicPart1 = useMemo(() => {
    const vals = Object.values(results)
      .map((r) => r.part1ReadAloud?.overallScore || 0)
      .filter((v) => v > 0);
    if (!vals.length) return 0;
    return Math.round(vals.reduce((sum, v) => sum + v, 0) / vals.length);
  }, [results]);

  const averageToeicPart2To5 = useMemo(() => {
    const vals = Object.values(results)
      .map((r) => r.partSpeaking?.overallScore || 0)
      .filter((v) => v > 0);
    if (!vals.length) return 0;
    return Math.round(vals.reduce((sum, v) => sum + v, 0) / vals.length);
  }, [results]);

  if (grading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-slate-800">Đang chấm bài...</p>
          <p className="text-sm text-slate-500 mt-1">AI đang phân tích bài thu âm</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-slate-500">Không có dữ liệu bài làm.</p>
        <button onClick={() => router.push('/home')} className="px-6 py-2.5 bg-primary text-white rounded-full font-medium hover:bg-primary-dark transition-colors">
          Về trang luyện nói
        </button>
      </div>
    );
  }

  const { partTitle, prompts, userAnswers } = data;
  const isPart1Page = data.partNumber === 1;
  const isPart2To5Page = data.partNumber >= 2 && data.partNumber <= 5;
  const recordedCount = prompts.filter(p => userAnswers[p.id]).length;
  const gradedCount = Object.keys(results).length;
  const headerScore = isPart1Page
    ? averageToeicPart1
    : isPart2To5Page && averageToeicPart2To5 > 0
      ? averageToeicPart2To5
      : averageOverall;
  const headerMax = isPart1Page || (isPart2To5Page && averageToeicPart2To5 > 0) ? 200 : 100;
  const headerPercent = headerMax === 200 ? Math.round((headerScore / 200) * 100) : headerScore;

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="rounded-md bg-linear-to-r from-primary to-teal-500 px-6 py-5 mb-6 flex items-center gap-3 shadow-lg shadow-primary/20">
        <button onClick={() => router.push('/home')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">{partTitle}</h1>
          <p className="text-teal-100 text-xs mt-0.5">
            AI Chấm · {recordedCount}/{prompts.length} câu đã thu
          </p>
        </div>
        {headerScore > 0 && (
          <div className="bg-white/20 rounded-2xl px-4 py-2 text-center">
            <p className="text-2xl font-black text-white">{headerScore}/{headerMax}</p>
            <p className="text-xs text-teal-100">trung bình</p>
          </div>
        )}
      </div>

      <div className="px-4 lg:px-0 max-w-3xl mx-auto space-y-4">
        {/* Summary */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-100">
              <Sparkles className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Kết quả chấm AI</h3>
              <p className="text-sm text-slate-500">
                {recordedCount} câu đã thu
                {gradedCount > 0 && ` · ${gradedCount} câu đã chấm`}
              </p>
            </div>
          </div>

          {headerScore > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Điểm trung bình</span>
                <span className="text-lg font-black text-primary">{headerScore}/{headerMax}</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    headerPercent >= 80 ? 'bg-green-500' : headerPercent >= 60 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${headerPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Per-item results */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-800 px-1">Chi tiết từng câu</h2>
          {prompts.map((prompt, index) => (
            <SpeakingResultCard
              key={prompt.id}
              prompt={prompt}
              audioUrl={userAnswers[prompt.id] || ''}
              result={results[prompt.id]}
              index={index}
              transcribedText={normalizeTranscribedText(data.transcribedTexts?.[prompt.id])}
            />
          ))}
        </div>

        {/* Back button */}
        <div className="mt-6">
          <button
            onClick={() => router.push('/home')}
            className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-[15px] hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
          >
            Về trang luyện nói
          </button>
        </div>
      </div>
    </div>
  );
}
