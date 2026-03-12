'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, Lightbulb, Circle } from 'lucide-react';
import type { WritingPromptModel } from '@/lib/types';

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
  const [data, setData] = useState<WritingResultData | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('writing_result');
    if (stored) {
      setData(JSON.parse(stored));
    }
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const { partTitle, prompts, userAnswers } = data;
  const answeredCount = prompts.filter(p => userAnswers[p.id]?.trim()).length;

  return (
    <div className="pb-24 lg:pb-8">
      {/* Header */}
      <div className="bg-primary rounded-b-2xl px-6 py-5 mb-6 flex items-center gap-3 shadow-lg shadow-primary/20">
        <button onClick={() => router.push('/home')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold text-white flex-1 text-center pr-10">Kết quả</h1>
      </div>

      <div className="px-4 lg:px-0 space-y-6">
        {/* Summary card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800">{partTitle}</h3>
            <p className="text-sm text-slate-500 mt-1">Đã hoàn thành {answeredCount}/{prompts.length} câu</p>
            <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${prompts.length > 0 ? (answeredCount / prompts.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Detail title */}
        <h2 className="text-lg font-bold text-slate-800">Chi tiết câu trả lời</h2>

        {/* Answer cards */}
        {prompts.map((prompt, index) => {
          const userAnswer = userAnswers[prompt.id];
          const hasAnswer = !!userAnswer?.trim();

          return (
            <div key={prompt.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Question number header */}
              <div className="bg-teal-50 px-4 py-3 flex items-center gap-3">
                <span className="w-7 h-7 bg-primary text-white rounded-lg flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </span>
                <span className="text-sm font-semibold text-slate-600 truncate">
                  {prompt.title || getSectionTitle(prompt.part_number)}
                </span>
              </div>

              <div className="p-4 space-y-3">
                {/* User's answer */}
                <div className={`p-4 rounded-xl border ${hasAnswer ? 'bg-green-50 border-green-300' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {hasAnswer ? (
                      <CheckCircle className="w-4 h-4 text-green-700" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-400" />
                    )}
                    <span className={`text-xs font-semibold ${hasAnswer ? 'text-green-700' : 'text-slate-400'}`}>
                      Câu trả lời của bạn
                    </span>
                  </div>
                  <p className={`text-sm leading-relaxed ${hasAnswer ? 'text-green-800' : 'text-slate-400'}`}>
                    {userAnswer || '(Chưa trả lời)'}
                  </p>
                </div>

                {/* Model answer */}
                {prompt.model_answer && (
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-300">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-blue-700" />
                      <span className="text-xs font-semibold text-blue-700">Câu trả lời mẫu</span>
                    </div>
                    <p className="text-sm leading-relaxed text-blue-800">{prompt.model_answer}</p>
                  </div>
                )}

                {/* Hint words */}
                {prompt.hint_words && prompt.hint_words.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2">Từ gợi ý</p>
                    <div className="flex flex-wrap gap-2">
                      {prompt.hint_words.map((word, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-teal-50 border border-teal-200 rounded-full text-xs font-medium text-primary"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:static lg:mt-8 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.06)] lg:shadow-none p-4 lg:px-0">
        <button
          onClick={() => router.push('/home')}
          className="w-full py-4 bg-primary text-white rounded-full font-bold text-[15px] hover:bg-primary-dark transition-colors"
        >
          Hoàn thành
        </button>
      </div>
    </div>
  );
}
