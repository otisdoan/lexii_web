'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, Headphones, BookOpen, CheckCircle, XCircle } from 'lucide-react';
import { getQuestionsByTestId, getTestParts } from '@/lib/api';
import type { QuestionModel, TestPartModel } from '@/lib/types';

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const testId = searchParams.get('testId') || '';
  const testTitle = searchParams.get('title') || 'Test';

  const [questions, setQuestions] = useState<QuestionModel[]>([]);
  const [parts, setParts] = useState<TestPartModel[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [qs, ps] = await Promise.all([
          getQuestionsByTestId(testId),
          getTestParts(testId),
        ]);
        setQuestions(qs);
        setParts(ps);
        // Load answers by testId để đúng với đề vừa thi
        const stored = sessionStorage.getItem(`exam_answers_${testId}`);
        if (stored) setUserAnswers(JSON.parse(stored));
      } catch {
        //
      } finally {
        setLoading(false);
      }
    }
    if (testId) load();
  }, [testId]);

  // Group by parts
  const partResults = parts.map(part => {
    const partQuestions = questions.filter(q => q.part_id === part.id);
    let correct = 0;
    partQuestions.forEach((q, qIdx) => {
      const globalIdx = questions.indexOf(q);
      if (userAnswers[globalIdx] !== undefined) {
        const selected = q.options[userAnswers[globalIdx]];
        if (selected?.is_correct) correct++;
      }
    });
    return { part, total: partQuestions.length, correct };
  });

  const listeningParts = partResults.filter(r => r.part.part_number <= 4);
  const readingParts = partResults.filter(r => r.part.part_number > 4);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Kết quả chi tiết</h2>
          <p className="text-sm text-slate-500">{testTitle}</p>
        </div>
      </div>

      {/* Listening Section */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Headphones className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-bold text-slate-800">Listening</h3>
        </div>
        <div className="space-y-3">
          {listeningParts.map(r => (
            <button
              key={r.part.id}
              onClick={() => {
                router.push(`/home/exam/answer-review?testId=${testId}&title=${encodeURIComponent(testTitle)}&partId=${r.part.id}&section=listening`);
              }}
              className="w-full flex items-center gap-4 bg-white rounded-xl border border-slate-100 p-4 hover:shadow-sm transition-all text-left"
            >
              <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-blue-600">P{r.part.part_number}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">Part {r.part.part_number}</p>
                <div className="flex items-center gap-4 mt-1 text-xs">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-3.5 h-3.5" /> {r.correct} đúng
                  </span>
                  <span className="flex items-center gap-1 text-red-500">
                    <XCircle className="w-3.5 h-3.5" /> {r.total - r.correct} sai
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-blue-500 rounded-full h-1.5 transition-all"
                    style={{ width: `${(r.correct / Math.max(r.total, 1)) * 100}%` }}
                  />
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
            </button>
          ))}
        </div>
      </section>

      {/* Reading Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-bold text-slate-800">Reading</h3>
        </div>
        <div className="space-y-3">
          {readingParts.map(r => (
            <button
              key={r.part.id}
              onClick={() => {
                router.push(`/home/exam/answer-review?testId=${testId}&title=${encodeURIComponent(testTitle)}&partId=${r.part.id}&section=reading`);
              }}
              className="w-full flex items-center gap-4 bg-white rounded-xl border border-slate-100 p-4 hover:shadow-sm transition-all text-left"
            >
              <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-green-600">P{r.part.part_number}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">Part {r.part.part_number}</p>
                <div className="flex items-center gap-4 mt-1 text-xs">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-3.5 h-3.5" /> {r.correct} đúng
                  </span>
                  <span className="flex items-center gap-1 text-red-500">
                    <XCircle className="w-3.5 h-3.5" /> {r.total - r.correct} sai
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-green-500 rounded-full h-1.5 transition-all"
                    style={{ width: `${(r.correct / Math.max(r.total, 1)) * 100}%` }}
                  />
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>}>
      <ResultContent />
    </Suspense>
  );
}
