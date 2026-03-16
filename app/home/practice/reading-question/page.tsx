'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, X, Lock } from 'lucide-react';
import { getCurrentUserRole, getQuestionsByPartId, getTestPartById } from '@/lib/api';
import type { QuestionModel } from '@/lib/types';

function ReadingQuestionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const partId = searchParams.get('partId') || '';
  const partTitle = searchParams.get('title') || 'Reading';

  const [questions, setQuestions] = useState<QuestionModel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(true);
  const [showExitDialog, setShowExitDialog] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const limit = parseInt(searchParams.get('limit') || '0') || undefined;
        const [role, part] = await Promise.all([
          getCurrentUserRole(),
          getTestPartById(partId),
        ]);
        const premiumUser = role === 'premium' || role === 'admin';
        const locked = Boolean(part && part.part_number >= 6 && !premiumUser);
        if (locked) {
          setHasAccess(false);
          return;
        }

        const qs = await getQuestionsByPartId(partId, limit);
        setQuestions(qs);
      } catch {
        //
      } finally {
        setLoading(false);
      }
    }
    if (partId) load();
  }, [partId, searchParams]);

  const currentQuestion = questions[currentIndex];
  const labels = ['A', 'B', 'C', 'D'];

  const selectAnswer = (idx: number) => {
    setUserAnswers(prev => ({ ...prev, [currentIndex]: idx }));
  };

  const answeredCount = Object.keys(userAnswers).length;

  const handleSubmit = () => {
    let correct = 0;
    questions.forEach((q, i) => {
      if (userAnswers[i] !== undefined && q.options[userAnswers[i]]?.is_correct) {
        correct++;
      }
    });
    // Navigate to result
    const params = new URLSearchParams({
      title: partTitle,
      correct: String(correct),
      total: String(questions.length),
    });
    router.push(`/home/practice/result?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white border border-amber-200 rounded-2xl p-6 text-center max-w-md mx-4">
          <Lock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 mb-1">Part Premium</h3>
          <p className="text-sm text-slate-500 mb-4">Tài khoản hiện tại cần nâng cấp để học part này.</p>
          <button
            onClick={() => router.push('/home/upgrade')}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors"
          >
            Nâng cấp Premium
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-slate-500">Không có câu hỏi</p>
        <button onClick={() => router.back()} className="text-primary font-medium mt-2 hover:underline">Quay lại</button>
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowExitDialog(true)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{partTitle}</h2>
            <p className="text-sm text-slate-500">Câu {currentIndex + 1}/{questions.length}</p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          Nộp bài
        </button>
      </div>

      {/* Progress */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Content - side by side on web */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Passage */}
        {currentQuestion?.passage && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h4 className="font-semibold text-slate-800 mb-3">{currentQuestion.passage.title}</h4>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
              {currentQuestion.passage.content}
            </div>
          </div>
        )}

        {/* Right: Question & Options */}
        <div>
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold">
                {currentIndex + 1}
              </span>
            </div>

            {currentQuestion?.question_text && (
              <p className="text-slate-800 font-medium mb-5 leading-relaxed">{currentQuestion.question_text}</p>
            )}

            <div className="space-y-3">
              {currentQuestion?.options.map((opt, idx) => {
                const isSelected = userAnswers[currentIndex] === idx;
                return (
                  <button
                    key={opt.id}
                    onClick={() => selectAnswer(idx)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected ? 'border-primary bg-teal-50' : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                      isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {labels[idx]}
                    </span>
                    <span className={`text-sm ${isSelected ? 'text-primary font-medium' : 'text-slate-700'}`}>
                      {opt.content}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Câu trước
            </button>

            {currentIndex === questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
              >
                Nộp bài ({answeredCount}/{questions.length})
              </button>
            ) : (
              <button
                onClick={() => setCurrentIndex(currentIndex + 1)}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
              >
                Câu tiếp <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Exit dialog */}
      {showExitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowExitDialog(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm mx-4 p-6 text-center">
            <X className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-lg mb-2">Thoát bài tập?</h3>
            <p className="text-sm text-slate-500 mb-4">Tiến trình sẽ không được lưu.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowExitDialog(false)} className="flex-1 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-600">
                Ở lại
              </button>
              <button onClick={() => router.back()} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold">
                Thoát
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReadingQuestionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>}>
      <ReadingQuestionContent />
    </Suspense>
  );
}
