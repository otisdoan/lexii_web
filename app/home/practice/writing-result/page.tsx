'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  FileText,
  Image as ImageIcon,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { gradeAiAnswer, getCurrentUser, savePracticeHistory } from '@/lib/api';
import type { WritingPromptModel, AiGradeResult } from '@/lib/types';

interface WritingResultData {
  partTitle: string;
  partNumber: number;
  prompts: WritingPromptModel[];
  userAnswers: Record<string, string>;
}

const PART_META: Record<number, { label: string; color: string; bg: string; taskLabel: string }> = {
  1: { label: 'Viết câu theo tranh', color: 'text-purple-600', bg: 'bg-purple-50', taskLabel: 'Mô tả tranh bằng một câu hoàn chỉnh' },
  2: { label: 'Phản hồi email', color: 'text-blue-600', bg: 'bg-blue-50', taskLabel: 'Viết email trả lời phù hợp' },
  3: { label: 'Viết luận', color: 'text-teal-600', bg: 'bg-teal-50', taskLabel: 'Viết bài luận trình bày quan điểm' },
};

const TASK_LABELS: Record<string, string> = {
  task_response: 'Task Response',
  grammar: 'Ngữ pháp',
  vocabulary: 'Từ vựng',
  coherence: 'Mạch lạc',
  accuracy: 'Accuracy',
  pronunciation: 'Pronunciation',
  fluency: 'Fluency',
  intonation: 'Intonation',
  content: 'Content',
  relevance: 'Relevance',
  completeness: 'Completeness',
  'task response': 'Task Response',
};

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700 w-8 text-right">{score}</span>
    </div>
  );
}

function ResultCard({ prompt, userAnswer, result, index }: {
  prompt: WritingPromptModel;
  userAnswer: string;
  result?: AiGradeResult;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const partMeta = PART_META[prompt.part_number] || PART_META[1];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Card header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className={`w-10 h-10 ${partMeta.bg} rounded-xl flex items-center justify-center shrink-0`}>
          <span className={`text-sm font-bold ${partMeta.color}`}>{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{prompt.title || partMeta.label}</p>
          <p className="text-xs text-slate-400 mt-0.5">{partMeta.taskLabel}</p>
        </div>
        {result ? (
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <span className="text-lg font-bold text-primary">{result.overall}</span>
              <span className="text-xs text-slate-400">/100</span>
            </div>
          </div>
        ) : (
          <div className="shrink-0">
            {userAnswer.trim() ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-600 rounded-full text-xs font-semibold">
                <CheckCircle className="w-3 h-3" /> Đã nộp
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-semibold">
                Chưa trả lời
              </span>
            )}
          </div>
        )}
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
          {/* Image */}
          {prompt.image_url && (
            <div className="rounded-xl overflow-hidden border border-slate-100">
              <div className="flex items-center gap-2 p-2 bg-slate-50 border-b border-slate-100">
                <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-500">Hình minh họa</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={prompt.image_url} alt={prompt.title || 'Hình'} className="w-full h-44 object-cover" />
            </div>
          )}

          {/* Passage */}
          {prompt.passage_text && (
            <div className="rounded-xl border border-slate-100 overflow-hidden">
              <div className="flex items-center gap-2 p-2 bg-slate-50 border-b border-slate-100">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-500">{prompt.passage_subject || 'Nội dung'}</span>
              </div>
              <p className="p-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{prompt.passage_text}</p>
            </div>
          )}

          {/* Yêu cầu */}
          {prompt.prompt && (
            <div className="rounded-xl border border-primary/20 bg-linear-to-br from-primary/5 to-teal-50 p-3">
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">Yêu cầu</p>
              <p className="text-sm text-slate-700 font-medium">{prompt.prompt}</p>
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
                        className={`h-full rounded-full ${result.overall >= 80 ? 'bg-green-500' : result.overall >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
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

              {/* Lỗi cần sửa */}
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

              {/* Phân tích & góp ý */}
              {result.feedback && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsUp className="w-4 h-4 text-teal-600" />
                    <h4 className="text-sm font-bold text-slate-700">Phân tích & góp ý</h4>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{result.feedback}</p>
                </div>
              )}

              {/* Từ vựng hay */}
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
            </div>
          )}

          {/* Model answer */}
          {prompt.model_answer && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <h4 className="text-sm font-bold text-green-700">Đáp án mẫu</h4>
              </div>
              <p className="text-sm text-green-800 leading-relaxed whitespace-pre-wrap">{prompt.model_answer}</p>
            </div>
          )}

          {/* AI suggested answer */}
          {result?.suggestedAnswer && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h4 className="text-sm font-bold text-amber-700">Gợi ý của AI</h4>
              </div>
              <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-wrap">{result.suggestedAnswer}</p>
            </div>
          )}

          {/* User answer */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-slate-500" />
              <h4 className="text-sm font-bold text-slate-700">Bài làm của bạn</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {userAnswer || <span className="italic text-slate-400">Chưa trả lời</span>}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WritingResultPage() {
  const router = useRouter();

  const [data] = useState<WritingResultData | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = sessionStorage.getItem('writing_result');
    if (!stored) return null;
    try {
      return JSON.parse(stored) as WritingResultData;
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
        const answer = (data.userAnswers[prompt.id] || '').trim();
        if (!answer) continue;
        try {
          out[prompt.id] = await gradeAiAnswer({
            mode: 'writing',
            taskType: mapWritingTaskType(prompt.part_number),
            prompt: prompt.prompt || prompt.passage_text || prompt.title || '',
            answer,
          });
        } catch {
          out[prompt.id] = {
            overall: 0,
            taskScores: {},
            errors: [],
            feedback: 'Không thể chấm bài.',
            importantWords: [],
            suggestedAnswer: '',
          };
        }
      }

      setResults(out);
      setGrading(false);

      // Save to practice history
      const user = await getCurrentUser();
      if (!user) return;

      await Promise.allSettled(
        data.prompts.map(async (prompt) => {
          const answer = (data.userAnswers[prompt.id] || '').trim();
          const gradeResult = out[prompt.id];
          await savePracticeHistory({
            userId: user.id,
            mode: 'writing',
            partNumber: data.partNumber,
            promptId: prompt.id,
            promptTitle: prompt.title || '',
            promptContent: prompt.prompt || prompt.passage_text || '',
            userAnswer: answer,
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
          <p className="text-sm text-slate-500 mt-1">AI đang phân tích bài làm của bạn</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-slate-500">Không có dữ liệu bài làm.</p>
        <button onClick={() => router.push('/home/practice/writing')} className="px-6 py-2.5 bg-primary text-white rounded-full font-medium hover:bg-primary-dark transition-colors">
          Về trang luyện viết
        </button>
      </div>
    );
  }

  const { partTitle, prompts, userAnswers } = data;
  const answeredCount = prompts.filter(p => (userAnswers[p.id] || '').trim().length > 0).length;
  const gradedCount = Object.keys(results).length;

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="rounded-md bg-linear-to-r from-primary to-teal-500 px-6 py-5 mb-6 flex items-center gap-3 shadow-lg shadow-primary/20">
        <button onClick={() => router.push('/home/practice/writing')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">{partTitle}</h1>
          <p className="text-teal-100 text-xs mt-0.5">
            AI Chấm · {answeredCount}/{prompts.length} câu đã nộp
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
                {answeredCount} câu đã nộp
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
            <ResultCard
              key={prompt.id}
              prompt={prompt}
              userAnswer={userAnswers[prompt.id] || ''}
              result={results[prompt.id]}
              index={index}
            />
          ))}
        </div>

        {/* Back button */}
        <div className="mt-6">
          <button
            onClick={() => router.push('/home/practice/writing')}
            className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-[15px] hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
          >
            Về trang luyện viết
          </button>
        </div>
      </div>
    </div>
  );
}

function mapWritingTaskType(partNumber: number): string {
  if (partNumber === 1) return 'write_sentence_picture';
  if (partNumber === 2) return 'reply_email';
  return 'opinion_essay';
}
