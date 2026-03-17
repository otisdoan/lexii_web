'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Grid3X3,
  Pause,
  Play,
  Send,
  Volume2,
  X,
  Lock,
} from 'lucide-react';
import {
  getCurrentUser,
  getCurrentUserRole,
  getQuestionsByIds,
  getQuestionsByReadingPartNumber,
  getQuestionsByPartId,
  getQuestionsByTestId,
  getTestById,
  getTestParts,
  saveListeningPracticeTracking,
  submitAttempt,
} from '@/lib/api';
import type { QuestionModel, TestPartModel } from '@/lib/types';

function ExamQuestionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const testId = searchParams.get('testId') || '';
  const testTitle = searchParams.get('title') || 'Test';
  const practiceMode = searchParams.get('practice') === 'true';
  const partId = searchParams.get('partId') || '';
  const partNumber = parseInt(searchParams.get('partNumber') || '0', 10);
  const source = searchParams.get('source') || '';
  const questionLimit = parseInt(searchParams.get('questionLimit') || '0', 10);

  const [questions, setQuestions] = useState<QuestionModel[]>([]);
  const [parts, setParts] = useState<TestPartModel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(120 * 60); // 120 min
  const [showOverview, setShowOverview] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load questions
  useEffect(() => {
    async function load() {
      try {
        let loadedQuestions: QuestionModel[] = [];
        if (practiceMode && source === 'wrong') {
          let wrongIds: string[] = [];
          if (typeof window !== 'undefined') {
            const raw = sessionStorage.getItem('practice_wrong_question_ids');
            if (raw) {
              try {
                wrongIds = JSON.parse(raw) as string[];
              } catch {
                wrongIds = [];
              }
            }
          }
          loadedQuestions = await getQuestionsByIds(wrongIds);
        } else if (practiceMode && partNumber >= 5) {
          loadedQuestions = await getQuestionsByReadingPartNumber(
            partNumber,
            questionLimit > 0 ? questionLimit : undefined,
          );
        } else if (practiceMode && partId) {
          loadedQuestions = await getQuestionsByPartId(
            partId,
            questionLimit > 0 ? questionLimit : undefined,
          );
        } else {
          loadedQuestions = await getQuestionsByTestId(testId);
        }

        const [ps, test, role] = await Promise.all([
          getTestParts(testId),
          getTestById(testId),
          getCurrentUserRole(),
        ]);

        const premiumUser = role === 'premium' || role === 'admin';
        const blockedByTest = Boolean(test?.is_premium) && !premiumUser;
        if (blockedByTest) {
          setHasAccess(false);
          return;
        }

        setQuestions(loadedQuestions);
        setParts(ps);
      } catch {
        //
      } finally {
        setLoading(false);
      }
    }
    if (testId) load();
  }, [partId, partNumber, practiceMode, questionLimit, source, testId]);

  // Timer
  useEffect(() => {
    if (practiceMode) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceMode]);

  // Audio progress
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
  const currentPart = parts.find(p => p.id === currentQuestion?.part_id);

  const audioUrl = currentQuestion?.media?.find(m => m.type === 'audio')?.url;
  const imageUrl = currentQuestion?.media?.find(m => m.type === 'image')?.url;

  const selectAnswer = (optionIndex: number) => {
    setUserAnswers(prev => ({ ...prev, [currentIndex]: optionIndex }));
  };

  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsPlaying(false);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsPlaying(false);
    }
  };

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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = parseFloat(e.target.value);
  };

  const answeredCount = Object.keys(userAnswers).length;

  const calculateScores = useCallback(() => {
    let listeningCorrect = 0;
    let readingCorrect = 0;
    let listeningTotal = 0;
    let readingTotal = 0;

    questions.forEach((q, i) => {
      const part = parts.find(p => p.id === q.part_id);
      const isListening = part && part.part_number <= 4;
      if (isListening) {
        listeningTotal++;
        if (userAnswers[i] !== undefined) {
          const selectedOption = q.options[userAnswers[i]];
          if (selectedOption?.is_correct) listeningCorrect++;
        }
      } else {
        readingTotal++;
        if (userAnswers[i] !== undefined) {
          const selectedOption = q.options[userAnswers[i]];
          if (selectedOption?.is_correct) readingCorrect++;
        }
      }
    });

    const listeningScore = Math.round((listeningCorrect / Math.max(listeningTotal, 1)) * 495);
    const readingScore = Math.round((readingCorrect / Math.max(readingTotal, 1)) * 495);

    return { listeningScore, readingScore, totalCorrect: listeningCorrect + readingCorrect };
  }, [questions, parts, userAnswers]);

  const handleSubmit = useCallback(async () => {
    if (practiceMode) {
      let correct = 0;
      const answerRows: { question_id: string; option_id: string; is_correct: boolean }[] = [];
      questions.forEach((q, i) => {
        const selectedIdx = userAnswers[i];
        if (selectedIdx === undefined || selectedIdx < 0 || selectedIdx >= q.options.length) return;
        const selected = q.options[selectedIdx];
        if (selected?.is_correct) correct += 1;
        answerRows.push({
          question_id: q.id,
          option_id: selected.id,
          is_correct: Boolean(selected.is_correct),
        });
      });

      const user = await getCurrentUser();
      if (user && answerRows.length > 0) {
        try {
          await submitAttempt(user.id, testId, correct, answerRows);
          await saveListeningPracticeTracking(questions, userAnswers);
        } catch {
          // keep UX smooth even when saving fails
        }
      }

      const params = new URLSearchParams({
        testId,
        title: testTitle,
        correct: String(correct),
        total: String(questions.length),
        section: partNumber >= 5 ? 'reading' : 'listening',
        practice: 'true',
        source,
      });
      if (partId) params.set('partId', partId);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('exam_answers', JSON.stringify(userAnswers));
        sessionStorage.setItem(
          'practice_question_ids',
          JSON.stringify(questions.map((q) => q.id)),
        );
      }
      router.push(`/home/practice/result?${params.toString()}`);
      return;
    }

    const { listeningScore, readingScore, totalCorrect } = calculateScores();
    const answerRows: { question_id: string; option_id: string; is_correct: boolean }[] = [];
    questions.forEach((q, i) => {
      const selectedIdx = userAnswers[i];
      if (selectedIdx === undefined || selectedIdx < 0 || selectedIdx >= q.options.length) return;
      const selected = q.options[selectedIdx];
      answerRows.push({
        question_id: q.id,
        option_id: selected.id,
        is_correct: Boolean(selected.is_correct),
      });
    });

    const user = await getCurrentUser();
    if (user && answerRows.length > 0) {
      try {
        await submitAttempt(user.id, testId, listeningScore + readingScore, answerRows);
      } catch {
        // Keep UX smooth even if persistence fails.
      }
    }

    const params = new URLSearchParams({
      testId,
      title: testTitle,
      listeningScore: String(listeningScore),
      readingScore: String(readingScore),
      totalCorrect: String(totalCorrect),
      totalQuestions: String(questions.length),
    });
    // Store answers in sessionStorage for the result page
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('exam_answers', JSON.stringify(userAnswers));
    }
    router.push(`/home/exam/score?${params.toString()}`);
  }, [calculateScores, partId, partNumber, practiceMode, questions, router, source, testId, testTitle, userAnswers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-slate-500 text-sm">Đang tải đề thi...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-white border border-amber-200 rounded-2xl p-6 text-center max-w-md">
          <Lock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 mb-1">Nội dung Premium</h3>
          <p className="text-sm text-slate-500 mb-4">Tài khoản hiện tại chưa có quyền truy cập bài thi này.</p>
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
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-slate-500">Không có câu hỏi nào</p>
          <button onClick={() => router.back()} className="text-primary font-medium mt-2 hover:underline">
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-8">
      {/* Header */}
     <div className='sm:px-10'>
      <div className="sticky top-20 z-10 bg-white/90 backdrop-blur-md -mx-4 sm:-mx-10 py-3 mb-6 rounded-2xl px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (confirm('Bạn có chắc muốn thoát? Bài làm sẽ không được lưu.')) {
                  router.back();
                }
              }}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">{testTitle}</h3>
              {currentPart && (
                <p className="text-xs text-slate-500">Part {currentPart.part_number}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Timer */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
              timeLeft < 300 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-700'
            }`}>
              <Clock className="w-4 h-4" />
              {practiceMode ? 'Practice' : formatTime(timeLeft)}
            </div>

            {/* Overview */}
            <button
              onClick={() => setShowOverview(!showOverview)}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Grid3X3 className="w-5 h-5 text-slate-600" />
            </button>

            {/* Submit */}
            <button
              onClick={() => setShowSubmitDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Nộp bài</span>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 shrink-0">
            {currentIndex + 1}/{questions.length}
          </span>
        </div>
      </div>
     </div>

      {/* Main content - Web layout: side by side */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Media & Passage */}
        <div className="space-y-4">
          {/* Audio player */}
          {audioUrl && (
            <div className="bg-slate-800 rounded-2xl p-5">
              <audio ref={audioRef} src={audioUrl} preload="metadata" />
              <div className="flex items-center gap-2 mb-3">
                <Volume2 className="w-4 h-4 text-teal-400" />
                <span className="text-xs text-slate-400">Audio</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 bg-primary rounded-full flex items-center justify-center hover:bg-primary-dark transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
                </button>
                <div className="flex-1">
                  <input
                    type="range"
                    min={0}
                    max={audioDuration || 0}
                    value={audioProgress}
                    onChange={handleSeek}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>{formatTime(Math.floor(audioProgress))}</span>
                    <span>{formatTime(Math.floor(audioDuration))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Image */}
          {imageUrl && (
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Question" className="w-full rounded-xl h-auto" />
            </div>
          )}

          {/* Passage */}
          {currentQuestion?.passage && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h4 className="font-semibold text-slate-800 mb-3">{currentQuestion.passage.title}</h4>
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-100 overflow-y-auto">
                {currentQuestion.passage.content}
              </div>
            </div>
          )}

          {!audioUrl && !imageUrl && !currentQuestion?.passage && (
            <div className="bg-slate-50 rounded-2xl p-8 text-center">
              <p className="text-slate-400 text-sm">Không có tài liệu đính kèm</p>
            </div>
          )}
        </div>

        {/* Right: Question & Options */}
        <div>
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            {/* Question number */}
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold">
                {currentIndex + 1}
              </span>
              {currentPart && (
                <span className="text-xs text-slate-400">Part {currentPart.part_number}</span>
              )}
            </div>

            {/* Question text */}
            {currentQuestion?.question_text && (
              <p className="text-slate-800 font-medium mb-6 leading-relaxed">
                {currentQuestion.question_text}
              </p>
            )}

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion?.options.map((option, idx) => {
                const isSelected = userAnswers[currentIndex] === idx;
                const labels = ['A', 'B', 'C', 'D'];
                const isPart1Or2 = currentPart && (currentPart.part_number === 1 || currentPart.part_number === 2);
                
                return (
                  <button
                    key={option.id}
                    onClick={() => selectAnswer(idx)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-teal-50'
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                      isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {labels[idx]}
                    </span>
                    {!isPart1Or2 && (
                      <span className={`text-sm ${isSelected ? 'text-primary font-medium' : 'text-slate-700'}`}>
                        {option.content}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Câu trước
            </button>
            <span className="text-sm text-slate-500">{answeredCount}/{questions.length} đã trả lời</span>
            <button
              onClick={goNext}
              disabled={currentIndex === questions.length - 1}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Câu tiếp
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Question Overview Panel */}
      {showOverview && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowOverview(false)} />
          <div className="relative bg-white rounded-t-3xl lg:rounded-3xl w-full lg:w-120 max-h-[80vh] overflow-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Tổng quan ({answeredCount}/{questions.length})</h3>
              <button onClick={() => setShowOverview(false)} className="p-1 hover:bg-slate-100 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-10 gap-2">
              {questions.map((_, i) => {
                const answered = userAnswers[i] !== undefined;
                const isCurrent = i === currentIndex;
                return (
                  <button
                    key={i}
                    onClick={() => { setCurrentIndex(i); setShowOverview(false); }}
                    className={`w-full aspect-square rounded-lg flex items-center justify-center text-xs font-semibold transition-all ${
                      isCurrent
                        ? 'bg-primary text-white ring-2 ring-primary/30'
                        : answered
                          ? 'bg-teal-100 text-primary'
                          : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-teal-100 rounded" /> Đã trả lời</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-slate-100 rounded" /> Chưa trả lời</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-primary rounded" /> Đang xem</span>
            </div>
            <button
              onClick={() => { setShowOverview(false); setShowSubmitDialog(true); }}
              className="w-full mt-4 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
            >
              Nộp bài ({answeredCount}/{questions.length})
            </button>
          </div>
        </div>
      )}

      {/* Submit confirmation dialog */}
      {showSubmitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowSubmitDialog(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm mx-4 p-6 text-center">
            <Send className="w-12 h-12 text-primary mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-lg mb-2">Nộp bài?</h3>
            <p className="text-sm text-slate-500 mb-1">
              Bạn đã trả lời {answeredCount}/{questions.length} câu hỏi.
            </p>
            {answeredCount < questions.length && (
              <p className="text-xs text-amber-600 mb-4">
                Còn {questions.length - answeredCount} câu chưa trả lời!
              </p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowSubmitDialog(false)}
                className="flex-1 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
              >
                Nộp bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExamQuestionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>}>
      <ExamQuestionContent />
    </Suspense>
  );
}
