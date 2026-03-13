'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowLeft, Trophy, ChevronRight } from 'lucide-react';

function getEvaluation(percent: number): { text: string; color: string } {
  if (percent >= 80) return { text: 'Xuất sắc! Tiếp tục phát huy.', color: 'text-green-600' };
  if (percent >= 60) return { text: 'Khá tốt! Hãy cố gắng hơn.', color: 'text-primary' };
  if (percent >= 40) return { text: 'Cần cố gắng thêm.', color: 'text-amber-600' };
  return { text: 'Bạn cần cố gắng hơn nữa', color: 'text-red-500' };
}

function PracticeResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const title = searchParams.get('title') || 'Kết quả';
  const correct = parseInt(searchParams.get('correct') || '0');
  const total = parseInt(searchParams.get('total') || '0');
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  const evaluation = getEvaluation(percent);
  const isGood = percent >= 60;

  return (
    <div className="pb-24 lg:pb-8">
      {/* Header */}
      <div className="bg-primary px-4 py-4 flex items-center gap-3 rounded-md">
        <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-lg font-bold text-white flex-1 text-center pr-10">Kết quả</h1>
      </div>

      <div className="px-4 lg:px-0 mt-6 space-y-4">
        {/* Summary card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-[72px] h-[72px] rounded-full bg-teal-50 flex items-center justify-center shrink-0">
            <Trophy className="w-9 h-9 text-primary" />
          </div>
          <div>
            <p className="text-sm text-slate-600 font-medium">Bạn đã hoàn thành bài luyện tập</p>
            <p className="text-sm font-bold text-orange-500 mt-1">{title}</p>
            <p className={`text-xs italic mt-1 ${evaluation.color}`}>{evaluation.text}</p>
          </div>
        </div>

        {/* Score card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-slate-800">Kết quả: {correct}/{total}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${isGood ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
              {percent}%
            </span>
          </div>
          <hr className="my-3 border-slate-100" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Tỷ lệ trung bình của bạn:</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${isGood ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
              {percent}%
            </span>
          </div>
        </div>

        {/* Performance chart placeholder */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 tracking-wider mb-4">THỐNG KÊ HIỆU SUẤT</p>
          <div className="h-28 flex items-end gap-2 border-l-2 border-b-2 border-slate-200 pl-8 pb-2 relative">
            <span className="absolute left-0 text-[10px] font-bold text-primary" style={{ bottom: `${percent}%` }}>
              {percent}%
            </span>
            {/* Visual bar */}
            <div className="flex-1 flex items-end justify-center">
              <div
                className="w-12 bg-gradient-to-t from-primary to-teal-300 rounded-t-lg transition-all duration-500"
                style={{ height: `${Math.max(percent, 5)}%` }}
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-2">Tỉ lệ / Lần thử</p>
        </div>

        {/* View all answers link */}
        <button
          onClick={() => router.push('/home')}
          className="w-full bg-amber-50 hover:bg-amber-100 transition-colors text-amber-600 font-bold text-sm py-4 rounded-2xl flex items-center justify-center gap-1"
        >
          Xem tất cả câu trả lời <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:static lg:mt-8 bg-slate-50 p-4 lg:p-0 space-y-3">
        <button
          onClick={() => router.back()}
          className="w-full py-4 bg-primary text-white rounded-full font-bold text-[15px] hover:bg-primary-dark transition-colors"
        >
          Tiếp tục
        </button>
        <button
          onClick={() => router.push('/home')}
          className="w-full text-sm text-primary font-medium underline underline-offset-2"
        >
          Luyện tập các loại bài khác
        </button>
      </div>
    </div>
  );
}

export default function PracticeResultPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>}>
      <PracticeResultContent />
    </Suspense>
  );
}
