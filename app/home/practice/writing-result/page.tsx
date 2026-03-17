'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { gradeAiAnswer } from '@/lib/api';
import type { WritingPromptModel, AiGradeResult } from '@/lib/types';

interface WritingResultData {
  partTitle: string;
  prompts: WritingPromptModel[];
  userAnswers: Record<string, string>;
}

function getSectionTitle(partNumber: number): string {
  switch (partNumber) {
    case 1: return 'Mô tả tranh';
    case 2: return 'Phản hồi yêu cầu';
    case 3: return 'Viết luận';
    default: return 'Câu hỏi';
  }
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

      const out: Record<string, AiGradeResult> = {};
      for (const prompt of data.prompts) {
        const answer = (data.userAnswers[prompt.id] || '').trim();
        out[prompt.id] = await gradeAiAnswer({
          mode: 'writing',
          taskType: mapWritingTaskType(prompt.part_number),
          prompt: prompt.prompt || prompt.passage_text || prompt.title,
          answer,
        });
      }

      setResults(out);
      setGrading(false);
    }

    void run();
  }, [data]);

  const averageOverall = useMemo(() => {
    const vals = Object.values(results).map((r) => r.overall);
    if (!vals.length) return 0;
    return Math.round(vals.reduce((sum, v) => sum + v, 0) / vals.length);
  }, [results]);

  if (!data || grading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const { partTitle, prompts, userAnswers } = data;
  const answeredCount = prompts.filter((p) => userAnswers[p.id]?.trim()).length;

  return (
    <div className="pb-24 lg:pb-8">
      {/* Header */}
      <div className="bg-primary rounded-b-2xl px-6 py-5 mb-6 flex items-center gap-3 shadow-lg shadow-primary/20">
        <button onClick={() => router.push('/home/practice/writing')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold text-white flex-1 text-center pr-10">Kết quả</h1>
      </div>

      <div className="px-4 lg:px-0 space-y-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800">{partTitle}</h3>
            <p className="text-sm text-slate-500 mt-1">Đã hoàn thành {answeredCount}/{prompts.length} câu</p>
            <p className="text-sm text-slate-500">Overall trung bình: {averageOverall}/100</p>
            <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${prompts.length > 0 ? (answeredCount / prompts.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-slate-800">Chi tiết câu trả lời</h2>

        {prompts.map((prompt, index) => {
          const userAnswer = userAnswers[prompt.id] || '';
          const result = results[prompt.id];

          return (
            <div key={prompt.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="bg-teal-50 px-4 py-3 flex items-center gap-3">
                <span className="w-7 h-7 bg-primary text-white rounded-lg flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </span>
                <span className="text-sm font-semibold text-slate-600 truncate">
                  {prompt.title || getSectionTitle(prompt.part_number)}
                </span>
              </div>

              <div className="p-4 space-y-3">
                <div className="p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700">Overall</span>
                    <span className="text-sm font-bold text-primary">{result?.overall ?? 0}/100</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(result?.taskScores || {}).map(([k, v]) => (
                      <div key={k} className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">{k}</span>: {v}/100
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Phân tích lỗi & góp ý</p>
                  <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">{result?.feedback}</p>
                </div>

                {!!result?.errors?.length && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-xs font-semibold text-red-700 mb-2">Lỗi cần sửa</p>
                    <p className="text-sm leading-relaxed text-red-700 whitespace-pre-wrap">
                      {result.errors.map((e) => `- ${e}`).join('\n')}
                    </p>
                  </div>
                )}

                {!!result?.importantWords?.length && (
                  <div className="p-4 rounded-xl border border-slate-200">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Từ vựng quan trọng</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{result.importantWords.map((w) => `- ${w}`).join('\n')}</p>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <p className="text-xs font-semibold text-blue-700 mb-2">Đáp án mẫu AI</p>
                  <p className="text-sm leading-relaxed text-blue-800 whitespace-pre-wrap">{result?.suggestedAnswer || '(Không có)'}</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Bài viết của bạn</p>
                  <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">{userAnswer || '(Chưa trả lời)'}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:static lg:mt-8 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.06)] lg:shadow-none p-4 lg:px-0">
        <button
          onClick={() => router.push('/home/practice/writing')}
          className="w-full py-4 bg-primary text-white rounded-full font-bold text-[15px] hover:bg-primary-dark transition-colors"
        >
          Về trang luyện viết
        </button>
      </div>
    </div>
  );
}

function mapWritingTaskType(partNumber: number): string {
  if (partNumber === 1) return 'write_sentence_picture';
  if (partNumber === 2) return 'reply_email';
  return 'opinion_essay';
}
