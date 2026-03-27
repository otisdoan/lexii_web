'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Circle, XCircle } from 'lucide-react';
import { getListeningReadingPracticeAttemptDetail } from '@/lib/api';
import type { AttemptDetail } from '@/lib/types';

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PracticeMcqHistoryDetailPage() {
  const router = useRouter();
  const params = useParams<{ attemptId: string }>();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<AttemptDetail | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getListeningReadingPracticeAttemptDetail(params.attemptId);
        setDetail(data);
      } catch {
        setDetail(null);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [params.attemptId]);

  const total = detail?.questions.length || 0;
  const answeredCount = useMemo(() => {
    if (!detail) return 0;
    return Object.keys(detail.selectedOptionIdByQuestionId).length;
  }, [detail]);

  const accuracy = useMemo(() => {
    if (!detail || answeredCount === 0) return 0;
    return Math.round((detail.correctCount / answeredCount) * 100);
  }, [answeredCount, detail]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="px-4 py-6">
        <button onClick={() => router.push('/home/practice/history')} className="mb-4 text-primary font-medium">← Quay lại</button>
        <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
          <p className="font-semibold text-slate-700">Không tìm thấy bài luyện tập</p>
          <p className="text-sm text-slate-500 mt-1">Bài làm có thể đã bị xóa hoặc bạn không có quyền xem.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-8">
      <div className="bg-primary px-4 py-4 rounded-md flex items-center gap-3">
        <button onClick={() => router.push('/home/practice/history')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-lg font-semibold text-white flex-1 text-center pr-10">Chi tiết luyện tập</h1>
      </div>

      <div className="py-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <p className="font-semibold text-slate-800">{detail.testTitle}</p>
          <p className="text-xs text-slate-500 mt-1">Nộp lúc: {formatDateTime(detail.submittedAt)}</p>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <div className="rounded-xl bg-slate-50 p-2">
              <p className="text-lg font-bold text-primary">{detail.score}</p>
              <p className="text-xs text-slate-500">Điểm</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-2">
              <p className="text-lg font-bold text-emerald-600">{detail.correctCount}/{total}</p>
              <p className="text-xs text-slate-500">Đúng</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-2">
              <p className="text-lg font-bold text-slate-700">{accuracy}%</p>
              <p className="text-xs text-slate-500">Độ chính xác</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Đã trả lời: {answeredCount}/{total} câu</p>
        </div>

        {detail.questions.map((q, idx) => {
          const selectedOptionId = detail.selectedOptionIdByQuestionId[q.id];
          const correctOptionId = q.options.find((o) => o.is_correct)?.id || '';
          const isAnswered = !!selectedOptionId;
          const isCorrect = isAnswered && selectedOptionId === correctOptionId;

          return (
            <div key={q.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-primary text-white text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                <span className="text-sm font-medium text-slate-700">{q.question_text || `Câu ${idx + 1}`}</span>
                {!isAnswered ? (
                  <Circle className="w-4 h-4 text-slate-400 ml-auto" />
                ) : isCorrect ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                )}
              </div>

              {q.passage && (
                <div className="mx-4 mt-3 rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <p className="text-xs font-semibold text-slate-500 mb-1">{q.passage.title}</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{q.passage.content}</p>
                </div>
              )}

              {!!q.media?.find((m) => m.type === 'image')?.url && (
                <div className="mx-4 mt-3 rounded-xl border border-slate-100 p-2 bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={q.media.find((m) => m.type === 'image')?.url}
                    alt="Question"
                    className="w-full max-h-64 object-contain rounded-md"
                  />
                </div>
              )}

              {!!q.media?.find((m) => m.type === 'audio')?.url && (
                <div className="mx-4 mt-3 rounded-xl border border-slate-100 p-3 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Audio</p>
                  <audio controls src={q.media.find((m) => m.type === 'audio')?.url} className="w-full" />
                </div>
              )}

              <div className="p-4 space-y-2">
                {q.options.map((opt, i) => {
                  const selected = opt.id === selectedOptionId;
                  const correct = opt.id === correctOptionId;
                  return (
                    <div
                      key={opt.id}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        correct
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : selected
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>
                      {opt.content || `Đáp án ${String.fromCharCode(65 + i)}`}
                    </div>
                  );
                })}

                {!isAnswered && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    Bạn chưa trả lời câu này trong lần luyện tập này.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
