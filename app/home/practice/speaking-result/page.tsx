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
import AudioPlayer from '@/app/components/AudioPlayer';
import type { AiGradeResult } from '@/lib/types';

type SpeakingPrompt = {
  id: string;
  taskType: string;
  title: string;
  passage?: string;
  prompt: string;
  imageUrl?: string;
};

type SpeakingResultData = {
  partTitle: string;
  partNumber: number;
  prompts: SpeakingPrompt[];
  userAnswers: Record<string, string>;
  transcribedTexts?: Record<string, string>;
};

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

function SpeakingResultCard({ prompt, audioUrl, result, index, transcribedText }: {
  prompt: SpeakingPrompt;
  audioUrl: string;
  result?: AiGradeResult;
  index: number;
  transcribedText?: string;
}) {
  const [expanded, setExpanded] = useState(index === 0);

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
              <span className="text-lg font-bold text-primary">{result.overall}</span>
              <span className="text-xs text-slate-400">/100</span>
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

              {/* Errors */}
              {result.errors && result.errors.length > 0 && (
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
              {result.feedback && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsUp className="w-4 h-4 text-teal-600" />
                    <h4 className="text-sm font-bold text-slate-700">Phân tích & góp ý</h4>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{result.feedback}</p>
                </div>
              )}

              {/* Suggested vocabulary */}
              {result.importantWords && result.importantWords.length > 0 && (
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
              {result.suggestedAnswer && (
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
        const transcribedText = data.transcribedTexts?.[prompt.id] || '';

        console.log('[GRADE-SPEAKING] === GRADING PROMPT ===');
        console.log('[GRADE-SPEAKING] prompt id:', prompt.id);
        console.log('[GRADE-SPEAKING] taskType:', prompt.taskType);
        console.log('[GRADE-SPEAKING] prompt text:', prompt.prompt);
        console.log('[GRADE-SPEAKING] transcribedText:', JSON.stringify(transcribedText));
        console.log('[GRADE-SPEAKING] transcribedText length:', transcribedText.length, 'chars');
        console.log('[GRADE-SPEAKING] ==============================');

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
          const promptContent = prompt.passage || prompt.prompt;
          const transcribedText = data.transcribedTexts?.[prompt.id] || '';
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
        <button onClick={() => router.push('/home/practice/speaking')} className="px-6 py-2.5 bg-primary text-white rounded-full font-medium hover:bg-primary-dark transition-colors">
          Về trang luyện nói
        </button>
      </div>
    );
  }

  const { partTitle, prompts, userAnswers } = data;
  const recordedCount = prompts.filter(p => userAnswers[p.id]).length;
  const gradedCount = Object.keys(results).length;

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="rounded-md bg-linear-to-r from-primary to-teal-500 px-6 py-5 mb-6 flex items-center gap-3 shadow-lg shadow-primary/20">
        <button onClick={() => router.push('/home/practice/speaking')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">{partTitle}</h1>
          <p className="text-teal-100 text-xs mt-0.5">
            AI Chấm · {recordedCount}/{prompts.length} câu đã thu
          </p>
        </div>
        {averageOverall > 0 && (
          <div className="bg-white/20 rounded-2xl px-4 py-2 text-center">
            <p className="text-2xl font-black text-white">{averageOverall}</p>
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

          {averageOverall > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Điểm trung bình</span>
                <span className="text-lg font-black text-primary">{averageOverall}/100</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    averageOverall >= 80 ? 'bg-green-500' : averageOverall >= 60 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${averageOverall}%` }}
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
              transcribedText={data.transcribedTexts?.[prompt.id]}
            />
          ))}
        </div>

        {/* Back button */}
        <div className="mt-6">
          <button
            onClick={() => router.push('/home/practice/speaking')}
            className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-[15px] hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
          >
            Về trang luyện nói
          </button>
        </div>
      </div>
    </div>
  );
}
