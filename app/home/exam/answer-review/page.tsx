'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Volume2, Play, Pause } from 'lucide-react';
import { getQuestionsByIds, getQuestionsByPartId, getQuestionsByTestId } from '@/lib/api';
import type { QuestionModel } from '@/lib/types';

function AnswerReviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const testId = searchParams.get('testId') || '';
  const testTitle = searchParams.get('title') || 'Test';
  const partId = searchParams.get('partId');
  const practiceMode = searchParams.get('practice') === 'true';

  const [questions, setQuestions] = useState<QuestionModel[]>([]);
  const [allQuestions, setAllQuestions] = useState<QuestionModel[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong'>('all');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        let all: QuestionModel[] = [];
        let qs: QuestionModel[] = [];

        if (practiceMode) {
          let practiceIds: string[] = [];
          const rawPracticeIds = sessionStorage.getItem('practice_question_ids');
          if (rawPracticeIds) {
            try {
              practiceIds = JSON.parse(rawPracticeIds);
            } catch {
              practiceIds = [];
            }
          }
          qs = practiceIds.length ? await getQuestionsByIds(practiceIds) : [];
          all = qs;
        } else {
          all = await getQuestionsByTestId(testId);
          qs = partId
            ? await getQuestionsByPartId(partId)
            : all;
        }

        setAllQuestions(all);
        setQuestions(qs);

        const stored = sessionStorage.getItem('exam_answers');
        if (stored) setUserAnswers(JSON.parse(stored));
      } catch {
        //
      } finally {
        setLoading(false);
      }
    }
    if (testId) load();
  }, [testId, partId, practiceMode]);

  const getGlobalIndex = (q: QuestionModel) => allQuestions.findIndex(aq => aq.id === q.id);

  const answerIndexFor = (q: QuestionModel) => {
    if (practiceMode) {
      return questions.findIndex((qq) => qq.id === q.id);
    }
    return getGlobalIndex(q);
  };

  const isCorrect = (q: QuestionModel) => {
    const idx = answerIndexFor(q);
    if (userAnswers[idx] === undefined) return false;
    return q.options[userAnswers[idx]]?.is_correct ?? false;
  };

  const filtered = questions.filter(q => {
    if (filter === 'correct') return isCorrect(q);
    if (filter === 'wrong') return !isCorrect(q);
    return true;
  });

  const correctCount = questions.filter(q => isCorrect(q)).length;
  const wrongCount = questions.length - correctCount;

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
          <h2 className="text-xl font-bold text-slate-900">Xem lại đáp án</h2>
          <p className="text-sm text-slate-500">{testTitle}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
            filter === 'all' ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600'
          }`}
        >
          Tất cả ({questions.length})
        </button>
        <button
          onClick={() => setFilter('correct')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
            filter === 'correct' ? 'bg-green-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
          }`}
        >
          <CheckCircle className="w-4 h-4" /> Đúng ({correctCount})
        </button>
        <button
          onClick={() => setFilter('wrong')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
            filter === 'wrong' ? 'bg-red-500 text-white' : 'bg-white border border-slate-200 text-slate-600'
          }`}
        >
          <XCircle className="w-4 h-4" /> Sai ({wrongCount})
        </button>
      </div>

      {/* Question list */}
      <div className="space-y-3">
        {filtered.map((q) => {
          const answerIdx = answerIndexFor(q);
          const displayNumber = answerIdx + 1;
          const correct = isCorrect(q);
          const userOptionIdx = userAnswers[answerIdx];
          const correctOptionIdx = q.options.findIndex(o => o.is_correct);
          const labels = ['A', 'B', 'C', 'D'];
          const expanded = expandedIndex === answerIdx;
          const audioUrl = q.media?.find(m => m.type === 'audio')?.url;
          const imageUrl = q.media?.find(m => m.type === 'image')?.url;

          return (
            <div
              key={q.id}
              className={`bg-white rounded-xl border ${correct ? 'border-green-100' : 'border-red-100'} overflow-hidden transition-all`}
            >
              <button
                onClick={() => setExpandedIndex(expanded ? null : answerIdx)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                  correct ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {displayNumber}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 truncate">
                    {q.question_text || `Câu ${displayNumber}`}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    {userOptionIdx !== undefined && (
                      <span className={correct ? 'text-green-600' : 'text-red-500'}>
                        Chọn: {labels[userOptionIdx]}
                      </span>
                    )}
                    {!correct && correctOptionIdx >= 0 && (
                      <span className="text-green-600">
                        Đáp án: {labels[correctOptionIdx]}
                      </span>
                    )}
                  </div>
                </div>
                {correct ? (
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                )}
              </button>

              {/* Expanded detail */}
              {expanded && (
                <div className="px-4 pb-4 border-t border-slate-50">
                  {q.question_text && (
                    <p className="text-sm text-slate-700 mt-3 mb-3">{q.question_text}</p>
                  )}

                  {imageUrl && (
                    <div className="mt-3 mb-3 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="Question" className="w-full max-h-64 object-contain mx-auto rounded-md" />
                    </div>
                  )}

                  {audioUrl && <AudioPlayer url={audioUrl} />}

                  {q.passage && (
                    <div className="bg-slate-50 rounded-lg p-3 mb-3 mt-3">
                      <p className="text-xs text-slate-500 font-medium mb-1">{q.passage.title}</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{q.passage.content}</p>
                    </div>
                  )}

                  <div className="space-y-2 mt-3">
                    {q.options.map((opt, oi) => {
                      const isUserChoice = userOptionIdx === oi;
                      const isCorrectAnswer = opt.is_correct;
                      return (
                        <div
                          key={opt.id}
                          className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                            isCorrectAnswer
                              ? 'bg-green-50 border border-green-200'
                              : isUserChoice
                                ? 'bg-red-50 border border-red-200'
                                : 'bg-slate-50'
                          }`}
                        >
                          <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
                            isCorrectAnswer ? 'bg-green-500 text-white' : isUserChoice ? 'bg-red-400 text-white' : 'bg-slate-200 text-slate-500'
                          }`}>
                            {labels[oi]}
                          </span>
                          <span className={isCorrectAnswer ? 'text-green-700' : isUserChoice ? 'text-red-600' : 'text-slate-600'}>
                            {opt.content || `Đáp án ${labels[oi]}`}
                          </span>
                          {isCorrectAnswer && <CheckCircle className="w-4 h-4 text-green-500 ml-auto shrink-0" />}
                          {isUserChoice && !isCorrectAnswer && <XCircle className="w-4 h-4 text-red-500 ml-auto shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AudioPlayer({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 mt-2">
      <Volume2 className="w-4 h-4 text-teal-400" />
      <button
        onClick={(e) => {
          const audio = e.currentTarget.parentElement?.querySelector('audio') as HTMLAudioElement | null;
          if (audio) {
            if (playing) { audio.pause(); } else { audio.play(); }
            setPlaying(!playing);
          }
        }}
        className="w-8 h-8 bg-primary rounded-full flex items-center justify-center hover:bg-primary-dark transition-colors"
      >
        {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
      </button>
      <audio src={url} preload="metadata" onEnded={() => setPlaying(false)} />
      <span className="text-xs text-slate-400">Audio</span>
    </div>
  );
}

export default function AnswerReviewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>}>
      <AnswerReviewContent />
    </Suspense>
  );
}
