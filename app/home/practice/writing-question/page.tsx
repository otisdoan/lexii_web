'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Lock,
  Sparkles,
  BookOpen,
  X,
  AlignLeft,
  Image as ImageIcon,
  FileText,
  CheckCircle,
} from 'lucide-react';
import { getCurrentUser, getCurrentUserRole, getWritingPrompts } from '@/lib/api';
import type { WritingPromptModel } from '@/lib/types';
import LoginRequiredModal from '@/app/components/LoginRequiredModal';

const PART_META: Record<number, { label: string; color: string; bg: string; taskLabel: string }> = {
  1: { label: 'Viết câu theo tranh', color: 'text-purple-600', bg: 'bg-purple-50', taskLabel: 'Mô tả tranh bằng một câu hoàn chỉnh' },
  2: { label: 'Phản hồi email', color: 'text-blue-600', bg: 'bg-blue-50', taskLabel: 'Viết email trả lời phù hợp' },
  3: { label: 'Viết luận', color: 'text-teal-600', bg: 'bg-teal-50', taskLabel: 'Viết bài luận trình bày quan điểm' },
};

function WritingQuestionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const partNumber = parseInt(searchParams.get('partNumber') || searchParams.get('part') || '1', 10);
  const partTitle = searchParams.get('title') || 'Writing';
  const questionLimit = Number(searchParams.get('questionLimit') || '0');

  const [prompts, setPrompts] = useState<WritingPromptModel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(true);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const meta = PART_META[partNumber] || PART_META[1];

  useEffect(() => {
    async function load() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          setShowLoginModal(true);
          return;
        }

        const role = await getCurrentUserRole();
        const premiumUser = role === 'premium' || role === 'admin';
        const isFreePart = partNumber === 1;
        if (!premiumUser && !isFreePart) {
          setHasAccess(false);
          return;
        }

        const data = await getWritingPrompts(partNumber, questionLimit || undefined);
        setPrompts(data);
      } catch {
        //
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partNumber]);

  const currentPrompt = prompts[currentIndex];
  const currentAnswer = currentPrompt ? (answers[currentPrompt.id] || '') : '';
  const isLast = currentIndex === prompts.length - 1;

  const wordCount = currentAnswer.trim() ? currentAnswer.trim().split(/\s+/).filter(Boolean).length : 0;

  const handleAnswerChange = useCallback((text: string) => {
    if (currentPrompt) {
      setAnswers(prev => ({ ...prev, [currentPrompt.id]: text }));
    }
  }, [currentPrompt]);

  const handleNext = () => {
    if (currentIndex < prompts.length - 1) {
      setCurrentIndex(currentIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = () => {
    doSubmit();
  };

  const doSubmit = () => {
    setIsSubmitting(true);
    sessionStorage.setItem('writing_result', JSON.stringify({
      partTitle,
      partNumber,
      prompts,
      userAnswers: answers,
    }));
    router.push('/home/practice/writing-result');
  };

  if (!loading && !hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white border border-amber-200 rounded-2xl p-8 text-center max-w-md mx-4">
          <Lock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">Tính năng Premium</h3>
          <p className="text-slate-500 mb-6">Writing Practice Part {partNumber} chỉ dành cho tài khoản Premium.</p>
          <button
            onClick={() => router.push('/home/upgrade')}
            className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
          >
            Nâng cấp Premium
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-slate-500 text-sm">Đang tải đề bài...</p>
      </div>
    );
  }

  if (prompts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 text-slate-300 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </div>
        <p className="text-lg font-bold text-slate-600">Chưa có đề bài</p>
        <button onClick={() => router.back()} className="px-6 py-2.5 bg-primary text-white rounded-full font-medium hover:bg-primary-dark transition-colors">
          Quay lại
        </button>
      </div>
    );
  }

  const answeredCount = prompts.filter(p => (answers[p.id] || '').trim().length > 0).length;

  return (
    <div>
      {/* Sticky Header */}
      <div className="rounded-md bg-white/95 backdrop-blur-md border-b border-slate-100 -mx-4 px-4 py-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowExitDialog(true)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h2 className="text-base font-bold text-slate-900">{partTitle}</h2>
              <p className="text-xs text-slate-500">
                {meta.label} · {currentIndex + 1}/{prompts.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
              AI Chấm
            </div>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1.5 mt-3">
          {prompts.map((p, i) => {
            const answered = (answers[p.id] || '').trim().length > 0;
            const active = i === currentIndex;
            return (
              <button
                key={p.id}
                onClick={() => { setCurrentIndex(i); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`h-1.5 rounded-full transition-all ${
                  active ? 'w-6 bg-primary' : answered ? 'w-1.5 bg-teal-400' : 'w-1.5 bg-slate-200'
                }`}
              />
            );
          })}
        </div>
      </div>

      <div className="px-4 lg:px-0 max-w-5xl mx-auto">
        {/* Question label */}
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-8 h-8 ${meta.bg} rounded-lg flex items-center justify-center`}>
            <AlignLeft className={`w-4 h-4 ${meta.color}`} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Câu {currentIndex + 1}</h3>
            <p className="text-xs text-slate-500">{meta.taskLabel}</p>
          </div>
        </div>

        {/* Main content: Left = Đề bài, Right = Viết */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* LEFT: Đề bài */}
          <div className="lg:col-span-2 space-y-4">
            {/* Hình ảnh */}
            {currentPrompt.image_url && (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="p-3 border-b border-slate-100 flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500">Hình minh họa</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentPrompt.image_url}
                  alt={currentPrompt.title || 'Hình minh họa'}
                  className="w-full h-52 object-cover"
                />
              </div>
            )}

            {/* Đoạn văn / Email */}
            {currentPrompt.passage_text && (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="p-3 border-b border-slate-100 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500">
                    {currentPrompt.passage_subject || 'Nội dung'}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{currentPrompt.passage_text}</p>
                </div>
              </div>
            )}

            {/* Yêu cầu */}
            {currentPrompt.prompt && (
              <div className="bg-linear-to-br from-primary/5 to-teal-50 rounded-2xl border border-primary/20 overflow-hidden shadow-sm">
                <div className="p-3 border-b border-primary/10 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wide">Yêu cầu</span>
                </div>
                <div className="p-4">
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">{currentPrompt.prompt}</p>
                </div>
              </div>
            )}

            {/* Gợi ý từ khóa */}
            {(() => {
              const raw = currentPrompt.hint_words;
              const words: string[] = Array.isArray(raw) ? raw
                : typeof raw === 'string' && raw.trim()
                  ? raw.split(',').map(w => w.trim()).filter(Boolean)
                  : [];
              if (!words.length) return null;
              return (
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-2">Từ khóa gợi ý</p>
                  <div className="flex flex-wrap gap-1.5">
                    {words.map((word, i) => (
                      <span key={i} className="px-2.5 py-1 bg-white rounded-full text-xs font-medium text-amber-700 border border-amber-200">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Đáp án mẫu (collapsible) */}
            {currentPrompt.model_answer && (
              <details className="bg-green-50 rounded-xl border border-green-200 overflow-hidden">
                <summary className="p-3 cursor-pointer text-xs font-semibold text-green-700 flex items-center gap-2 hover:bg-green-100 transition-colors">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Xem đáp án mẫu
                </summary>
                <div className="px-4 pb-4">
                  <p className="text-sm text-green-800 leading-relaxed whitespace-pre-wrap">{currentPrompt.model_answer}</p>
                </div>
              </details>
            )}
          </div>

          {/* RIGHT: Ô viết */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-100">
              {/* Editor toolbar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500">Bài làm của bạn</span>
                </div>
                <span className="text-xs text-slate-400">
                  <span className={`font-bold ${wordCount > 0 ? 'text-primary' : 'text-slate-400'}`}>{wordCount}</span> từ
                </span>
              </div>

              <textarea
                value={currentAnswer}
                onChange={e => handleAnswerChange(e.target.value)}
                placeholder="Viết câu trả lời của bạn tại đây..."
                className="flex-1 w-full p-5 text-sm text-slate-800 leading-relaxed resize-none focus:outline-none placeholder:text-slate-300"
              />
            </div>

            {/* Answered indicator */}
            {currentAnswer.trim().length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-teal-600">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Đã hoàn thành</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="mt-8 mb-6 max-w-5xl mx-auto px-4 lg:px-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Câu trước</span>
          </button>

          {/* Progress */}
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / prompts.length) * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 font-medium shrink-0">
              {answeredCount}/{prompts.length}
            </span>
          </div>

          {isLast ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark disabled:opacity-50 transition-colors shadow-lg shadow-primary/20"
            >
              {isSubmitting ? (
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>Nộp bài <Sparkles className="w-3.5 h-3.5" /></>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
            >
              Câu tiếp <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Exit confirmation */}
      {showExitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowExitDialog(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm mx-4 p-6 text-center">
            <X className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-lg mb-2">Thoát luyện tập?</h3>
            <p className="text-sm text-slate-500 mb-5">Tiến trình của bạn vẫn sẽ được lưu lại.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowExitDialog(false)} className="flex-1 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Tiếp tục làm
              </button>
              <button onClick={() => router.back()} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors">
                Thoát
              </button>
            </div>
          </div>
        </div>
      )}

      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Yêu cầu đăng nhập"
        description="Bạn cần đăng nhập để luyện viết."
      />
    </div>
  );
}

export default function WritingQuestionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>}>
      <WritingQuestionContent />
    </Suspense>
  );
}
