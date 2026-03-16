'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Clock, Play, Pause, Send, Volume2 } from 'lucide-react';
import { getPlacementQuestions, getPlacementTestId, getTestParts, submitAttempt } from '@/lib/api';
import { useRoadmapStore } from '@/lib/roadmap-store';
import { getCurrentUser } from '@/lib/api';
import type { QuestionModel, TestPartModel } from '@/lib/types';

const PLACEMENT_DURATION_SEC = 15 * 60; // 15 minutes

function estimatePlacementScore(correctCount: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correctCount / total) * 990);
}

function PlacementTestContent() {
  const router = useRouter();
  const selfAssessedLevel = useRoadmapStore((s) => s.selfAssessedLevel);
  const setPlacementResult = useRoadmapStore((s) => s.setPlacementResult);

  const [questions, setQuestions] = useState<QuestionModel[]>([]);
  const [parts, setParts] = useState<TestPartModel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(PLACEMENT_DURATION_SEC);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let testId: string | null = null;
    async function load() {
      try {
        const qs = await getPlacementQuestions(selfAssessedLevel ?? undefined);
        setQuestions(qs);
        if (qs.length > 0) {
          testId = await getPlacementTestId();
          if (testId) {
            const ps = await getTestParts(testId);
            setParts(ps);
          }
        }
      } catch {
        //
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selfAssessedLevel]);

  const userAnswersRef = useRef(userAnswers);
  const questionsRef = useRef(questions);
  userAnswersRef.current = userAnswers;
  questionsRef.current = questions;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setAudioProgress(audio.currentTime);
    const onLoaded = () => setAudioDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnded);
    };
  }, [currentIndex]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentIndex];
  const currentPart = parts.find((p) => p.id === currentQuestion?.part_id);
  const audioUrl = currentQuestion?.media?.find((m) => m.type === 'audio')?.url;
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };
  const selectAnswer = (optionIndex: number) => {
    setUserAnswers((prev) => ({ ...prev, [currentIndex]: optionIndex }));
  };
  const answeredCount = Object.keys(userAnswers).length;

  const handleSubmitInternal = useCallback(async () => {
    const qs = questionsRef.current;
    const ua = userAnswersRef.current;
    if (qs.length === 0) return;
    setSubmitting(true);
    try {
      const testId = await getPlacementTestId();
      if (!testId) {
        const correctCount = qs.filter((q, i) => {
          const optIdx = ua[i];
          if (optIdx === undefined) return false;
          return !!q.options[optIdx]?.is_correct;
        }).length;
        const estimated = estimatePlacementScore(correctCount, qs.length);
        setPlacementResult(estimated, null);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('placement_answers', JSON.stringify(ua));
          sessionStorage.setItem('placement_questions_count', String(qs.length));
        }
        router.push('/home/roadmap/result');
        return;
      }
      const user = await getCurrentUser();
      if (!user) {
        const correctCount = qs.filter((q, i) => {
          const optIdx = ua[i];
          if (optIdx === undefined) return false;
          return !!q.options[optIdx]?.is_correct;
        }).length;
        setPlacementResult(estimatePlacementScore(correctCount, qs.length), null);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('placement_answers', JSON.stringify(ua));
          sessionStorage.setItem('placement_questions_count', String(qs.length));
        }
        router.push('/home/roadmap/result');
        return;
      }
      const answers = qs.map((q, i) => {
        const optIdx = ua[i];
        const optionId = optIdx !== undefined ? q.options[optIdx]?.id : null;
        const is_correct = optIdx !== undefined ? !!q.options[optIdx]?.is_correct : false;
        return {
          question_id: q.id,
          option_id: optionId || q.options[0]?.id || '',
          is_correct,
        };
      });
      const correctCount = answers.filter((a) => a.is_correct).length;
      const score = estimatePlacementScore(correctCount, qs.length);
      const attempt = await submitAttempt(user.id, testId, score, answers);
      setPlacementResult(score, attempt.id);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('placement_answers', JSON.stringify(ua));
        sessionStorage.setItem('placement_questions_count', String(qs.length));
      }
      router.push('/home/roadmap/result');
    } catch {
      setSubmitting(false);
    }
  }, [setPlacementResult, router]);

  useEffect(() => {
    if (questions.length === 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitInternal();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [questions.length, handleSubmitInternal]);

  const handleSubmit = () => setShowSubmitDialog(true);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 mb-4">Chưa có câu hỏi kiểm tra trình độ. Vui lòng thử lại sau.</p>
        <button
          onClick={() => router.push('/home/roadmap/setup')}
          className="text-primary font-medium hover:underline"
        >
          Quay lại thiết lập
        </button>
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">Bài kiểm tra trình độ</h2>
        <div className="flex items-center gap-2 text-slate-600">
          <Clock className="w-5 h-5" />
          <span className="font-mono font-semibold">{formatTime(timeLeft)}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_200px] gap-6">
        {/* Left: Question */}
        <div className="space-y-4">
          {audioUrl && (
            <div className="bg-slate-800 rounded-2xl p-5">
              <audio ref={audioRef} src={audioUrl} preload="metadata" />
              <div className="flex items-center gap-2 mb-3">
                <Volume2 className="w-4 h-4 text-teal-400" />
                <span className="text-xs text-slate-400">Audio</span>
              </div>
              <button
                onClick={togglePlay}
                className="w-10 h-10 bg-primary rounded-full flex items-center justify-center hover:bg-primary-dark transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
              </button>
              <div className="mt-2 text-xs text-slate-400">
                {formatTime(Math.floor(audioProgress))} / {formatTime(Math.floor(audioDuration))}
              </div>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold">
                {currentIndex + 1}
              </span>
              {currentPart && <span className="text-xs text-slate-400">Part {currentPart.part_number}</span>}
            </div>
            {currentQuestion?.question_text && (
              <p className="text-slate-800 font-medium mb-6 leading-relaxed">{currentQuestion.question_text}</p>
            )}
            <div className="space-y-3">
              {currentQuestion?.options.map((option, idx) => {
                const isSelected = userAnswers[currentIndex] === idx;
                const labels = ['A', 'B', 'C', 'D'];
                return (
                  <button
                    key={option.id}
                    onClick={() => selectAnswer(idx)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected ? 'border-primary bg-teal-50' : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                        isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {labels[idx]}
                    </span>
                    <span className={`text-sm ${isSelected ? 'text-primary font-medium' : 'text-slate-700'}`}>
                      {option.content}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" /> Trước
            </button>
            <span className="text-sm text-slate-500">
              {currentIndex + 1} / {questions.length}
            </span>
            <button
              onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
              disabled={currentIndex === questions.length - 1}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-40"
            >
              Sau <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Bubble sheet + Timer */}
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-3">Đáp án</p>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`aspect-square rounded-lg flex items-center justify-center text-xs font-semibold transition-all ${
                    i === currentIndex
                      ? 'bg-primary text-white ring-2 ring-primary/30'
                      : userAnswers[i] !== undefined
                        ? 'bg-teal-100 text-primary'
                        : 'bg-white border border-slate-200 text-slate-400'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 py-3 bg-amber-50 rounded-xl border border-amber-100">
            <Clock className="w-5 h-5 text-amber-600" />
            <span className="font-mono font-bold text-amber-800">{formatTime(timeLeft)}</span>
          </div>
          <button
            onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
          >
            <Send className="w-4 h-4" />
            Nộp bài ({answeredCount}/{questions.length})
          </button>
        </div>
      </div>

      {showSubmitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowSubmitDialog(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm mx-4 p-6 text-center">
            <Send className="w-12 h-12 text-primary mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-lg mb-2">Nộp bài?</h3>
            <p className="text-sm text-slate-500 mb-4">
              Bạn đã trả lời {answeredCount}/{questions.length} câu.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitDialog(false)}
                className="flex-1 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-600"
              >
                Hủy
              </button>
              <button
                onClick={() => { setShowSubmitDialog(false); handleSubmitInternal(); }}
                disabled={submitting}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold disabled:opacity-50"
              >
                {submitting ? 'Đang nộp...' : 'Nộp bài'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlacementTestPage() {
  return <PlacementTestContent />;
}
