'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { getPlacementQuestions } from '@/lib/api';
import { useRoadmapStore } from '@/lib/roadmap-store';
import type { QuestionModel } from '@/lib/types';

export default function RoadmapResultPage() {
  const router = useRouter();
  const placementScore = useRoadmapStore((s) => s.placementScore);
  const [questions, setQuestions] = useState<QuestionModel[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const qs = await getPlacementQuestions();
        setQuestions(qs.slice(0, 15));
        if (typeof window !== 'undefined') {
          const stored = sessionStorage.getItem('placement_answers');
          if (stored) setUserAnswers(JSON.parse(stored));
        }
      } catch {
        //
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const correctCount = questions.filter((q, i) => {
    const idx = userAnswers[i];
    return idx !== undefined && q.options[idx]?.is_correct;
  }).length;
  const wrongCount = questions.length - correctCount;

  const handleContinue = () => {
    router.push('/home/roadmap/duration');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const score = placementScore ?? 0;

  return (
    <div className="pb-20 lg:pb-8 max-w-lg mx-auto">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-teal-500 px-6 py-8 text-center text-white">
          <h2 className="text-xl font-bold mb-1">Kết quả kiểm tra trình độ</h2>
          <p className="text-teal-100 text-sm">Trình độ hiện tại của bạn tương đương</p>
          <p className="text-4xl font-bold mt-2">{score} TOEIC</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500 shrink-0" />
              <div>
                <p className="text-2xl font-bold text-green-700">{correctCount}</p>
                <p className="text-xs text-green-600">Câu đúng</p>
              </div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-500 shrink-0" />
              <div>
                <p className="text-2xl font-bold text-red-700">{wrongCount}</p>
                <p className="text-xs text-red-600">Câu sai</p>
              </div>
            </div>
          </div>

          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <p className="text-xs font-medium text-slate-500 bg-slate-50 px-4 py-2 border-b border-slate-100">
              Chi tiết từng câu
            </p>
            <div className="max-h-48 overflow-y-auto">
              {questions.map((q, i) => {
                const optIdx = userAnswers[i];
                const isCorrect = optIdx !== undefined && q.options[optIdx]?.is_correct;
                return (
                  <div
                    key={q.id}
                    className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0"
                  >
                    <span className="w-6 text-sm font-medium text-slate-500">Câu {i + 1}</span>
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                    )}
                    <span className="text-sm text-slate-600 truncate flex-1">
                      {optIdx !== undefined ? q.options[optIdx]?.content : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleContinue}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
          >
            Tiếp tục thiết lập Lộ trình
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
