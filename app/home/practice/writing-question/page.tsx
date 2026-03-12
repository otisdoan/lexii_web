'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ArrowLeft, Info, X, ChevronRight } from 'lucide-react';
import { getWritingPrompts } from '@/lib/api';
import type { WritingPromptModel } from '@/lib/types';

function WritingQuestionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const partNumber = parseInt(searchParams.get('part') || '1');
  const partTitle = searchParams.get('title') || 'Writing';

  const [prompts, setPrompts] = useState<WritingPromptModel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getWritingPrompts(partNumber);
        setPrompts(data);
      } catch {
        //
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [partNumber]);

  const currentPrompt = prompts[currentIndex];
  const currentAnswer = currentPrompt ? (answers[currentPrompt.id] || '') : '';

  const handleAnswerChange = (text: string) => {
    if (currentPrompt) {
      setAnswers(prev => ({ ...prev, [currentPrompt.id]: text }));
    }
  };

  const getSectionTitle = (prompt: WritingPromptModel) => {
    if (prompt.title) return prompt.title;
    switch (prompt.part_number) {
      case 1: return 'Mô tả tranh';
      case 2: return 'Phản hồi yêu cầu';
      case 3: return 'Viết luận';
      default: return 'Viết câu trả lời';
    }
  };

  const handleNext = () => {
    if (currentIndex < prompts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSubmit = () => {
    setSubmitting(true);
    // Store in sessionStorage for the result page
    sessionStorage.setItem('writing_result', JSON.stringify({
      partTitle,
      prompts,
      userAnswers: answers,
    }));
    router.push('/home/practice/writing-result');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
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
        <button onClick={() => router.back()} className="px-6 py-2 bg-primary text-white rounded-full font-medium">Quay lại</button>
      </div>
    );
  }

  const isLast = currentIndex === prompts.length - 1;

  return (
    <div className="pb-24 lg:pb-8">
      {/* Header */}
      <div className="bg-primary rounded-b-2xl px-4 py-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowExitDialog(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <span className="text-lg font-semibold text-white">Câu {currentIndex + 1}</span>
          <div className="flex-1" />
          <span className="text-sm text-white/70">Giải thích</span>
        </div>
        {/* Progress */}
        <div className="w-full h-1.5 bg-white/30 rounded-full mt-3 overflow-hidden">
          <div
            className="h-full bg-white/80 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / prompts.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 lg:px-0">
        {/* Section title */}
        <h2 className="text-2xl font-bold text-slate-800 mb-4">{getSectionTitle(currentPrompt)}</h2>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Prompt content */}
          <div className="space-y-4">
            {/* Image (Part 1) */}
            {currentPrompt.image_url && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentPrompt.image_url}
                  alt={currentPrompt.title || 'Hình ảnh'}
                  className="w-full h-56 object-cover"
                />
                {currentPrompt.title && (
                  <p className="text-center text-sm text-slate-500 py-2">{currentPrompt.title}</p>
                )}
              </div>
            )}

            {/* Passage (Part 2/3) */}
            {currentPrompt.passage_text && (
              <div>
                {currentPrompt.passage_subject && (
                  <p className="text-xs font-semibold text-slate-500 mb-2">{currentPrompt.passage_subject}</p>
                )}
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{currentPrompt.passage_text}</p>
                </div>
              </div>
            )}

            {/* Prompt instruction */}
            {currentPrompt.prompt && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex gap-2">
                <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-slate-600 leading-relaxed">{currentPrompt.prompt}</p>
              </div>
            )}
          </div>

          {/* Right: Answer area */}
          <div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <textarea
                value={currentAnswer}
                onChange={e => handleAnswerChange(e.target.value)}
                placeholder="Viết câu trả lời của bạn"
                rows={10}
                className="w-full p-4 text-sm text-slate-800 leading-relaxed resize-none rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <p className="text-xs text-slate-400 mt-2 text-right">
              {currentAnswer.split(/\s+/).filter(Boolean).length} từ
            </p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:static lg:mt-8 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.06)] lg:shadow-none p-4 lg:p-0">
        <button
          onClick={isLast ? handleSubmit : handleNext}
          disabled={submitting}
          className="w-full py-4 bg-primary text-white rounded-full font-bold text-[15px] hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : isLast ? (
            'Nộp bài'
          ) : (
            <>Tiếp tục <ChevronRight className="w-4 h-4" /></>
          )}
        </button>
      </div>

      {/* Exit dialog */}
      {showExitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowExitDialog(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm mx-4 p-6 text-center">
            <X className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-lg mb-2">Thoát luyện tập?</h3>
            <p className="text-sm text-slate-500 mb-4">Tiến trình của bạn sẽ không được lưu.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowExitDialog(false)} className="flex-1 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-600">
                Tiếp tục làm
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

export default function WritingQuestionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>}>
      <WritingQuestionContent />
    </Suspense>
  );
}
