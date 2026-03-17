'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { gradeAiAnswer } from '@/lib/api';
import type { AiGradeResult } from '@/lib/types';

type SpeakingPrompt = {
  id: string;
  taskType: string;
  title: string;
  prompt: string;
};

type SpeakingResultData = {
  partTitle: string;
  prompts: SpeakingPrompt[];
  userAnswers: Record<string, string>;
};

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
      const out: Record<string, AiGradeResult> = {};

      for (const p of data.prompts) {
        const answer = (data.userAnswers[p.id] || '').trim();
        out[p.id] = await gradeAiAnswer({
          mode: 'speaking',
          taskType: p.taskType,
          prompt: p.prompt,
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
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  }, [results]);

  if (!data || grading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-24 lg:pb-8">
      <div className="bg-primary rounded-b-2xl px-6 py-5 mb-6 flex items-center gap-3 shadow-lg shadow-primary/20">
        <button onClick={() => router.push('/home/practice/speaking')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold text-white flex-1 text-center pr-10">Kết quả Speaking</h1>
      </div>

      <div className="px-4 lg:px-0 space-y-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-800">{data.partTitle}</h3>
          <p className="text-sm text-slate-500 mt-1">Overall trung bình: {averageOverall}/100</p>
        </div>

        {data.prompts.map((prompt, index) => {
          const r = results[prompt.id];
          return (
            <div key={prompt.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 bg-primary text-white rounded-lg flex items-center justify-center text-xs font-bold">{index + 1}</span>
                <p className="font-semibold text-slate-800">{prompt.title}</p>
              </div>

              <p className="text-xs text-slate-500">Overall: {r.overall}/100</p>

              <div className="grid grid-cols-2 gap-2">
                {Object.entries(r.taskScores).map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">{k}</span>: {v}/100
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-700 mb-1">Phân tích lỗi & góp ý</p>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{r.feedback}</p>
              </div>

              {!!r.errors.length && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">Lỗi cần sửa</p>
                  <p className="text-sm text-red-700 whitespace-pre-wrap">{r.errors.map((e) => `- ${e}`).join('\n')}</p>
                </div>
              )}

              {!!r.importantWords.length && (
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-semibold text-slate-700 mb-1">Từ vựng quan trọng</p>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{r.importantWords.map((w) => `- ${w}`).join('\n')}</p>
                </div>
              )}

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs font-semibold text-blue-700 mb-1">Đáp án mẫu AI</p>
                <p className="text-sm text-blue-800 whitespace-pre-wrap">{r.suggestedAnswer}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 lg:static lg:mt-8 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.06)] lg:shadow-none p-4 lg:px-0">
        <button
          onClick={() => router.push('/home/practice/speaking')}
          className="w-full py-4 bg-primary text-white rounded-full font-bold text-[15px] hover:bg-primary-dark transition-colors"
        >
          Về trang luyện nói
        </button>
      </div>
    </div>
  );
}
