'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState, useMemo } from 'react';
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
import AudioPlayer from '@/app/components/AudioPlayer';
import {
  getCurrentUser,
  getCurrentUserRole,
  getQuestionsByIds,
  getQuestionsByReadingPartNumber,
  getQuestionsByListeningPartNumber,
  getQuestionsByPartId,
  getQuestionsByTestId,
  getTestById,
  getTestParts,
  saveListeningPracticeTracking,
  submitAttempt,
} from '@/lib/api';
import type { QuestionModel, TestPartModel } from '@/lib/types';
import LoginRequiredModal from '@/app/components/LoginRequiredModal';

interface QuestionGroup {
  startIndex: number;
  endIndex: number;
  questionNumbers: string;
  hasAudio: boolean;
  hasImage: boolean;
  hasPassage: boolean;
  passage?: { title?: string; content?: string };
  audioUrl?: string;
  imageUrl?: string;
  questions: QuestionModel[];
}

/** Cắt mảng câu hỏi theo group hoàn chỉnh (audio/image/passage),
 *  đảm bảo không cắt ngang giữa các nhóm media. */
function truncateToCompleteGroups(questions: QuestionModel[], limit: number): QuestionModel[] {
  if (limit <= 0 || limit >= questions.length) return questions;

  const groups: QuestionModel[][] = [];
  let i = 0;
  while (i < questions.length) {
    const q = questions[i];
    const group: QuestionModel[] = [q];
    let j = i + 1;

    // Passage group (Part 6, 7)
    if (q.passage) {
      while (j < questions.length &&
             questions[j].passage?.id === q.passage?.id &&
             questions[j].part_id === q.part_id) {
        group.push(questions[j]);
        j++;
      }
    }
    // Image-only group (Part 2, Part 3 no-audio) — bỏ part_id vì fetch nhiều tests
    else if (q.media?.find(m => m.type === 'image') && !q.media?.find(m => m.type === 'audio')) {
      const imgUrl = q.media?.find(m => m.type === 'image')?.url;
      while (j < questions.length &&
             questions[j].media?.find((m: { type: string; url: string }) => m.type === 'image')?.url === imgUrl) {
        group.push(questions[j]);
        j++;
      }
    }
    // Audio group (Part 2, 3, 4) — bỏ part_id vì fetch nhiều tests
    else if (q.media?.find(m => m.type === 'audio')) {
      const audUrl = q.media?.find(m => m.type === 'audio')?.url;
      while (j < questions.length &&
             questions[j].media?.find((m: { type: string; url: string }) => m.type === 'audio')?.url === audUrl) {
        group.push(questions[j]);
        j++;
      }
    }

    groups.push(group);
    i = j;
  }

  const result: QuestionModel[] = [];
  let count = 0;
  for (const group of groups) {
    if (count + group.length > limit) break;
    result.push(...group);
    count += group.length;
  }
  return result;
}

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
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(120 * 60);
  const [showOverview, setShowOverview] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Block navigation away from exam in exam mode
  useEffect(() => {
    if (practiceMode) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Intercept Next.js App Router navigation
    const handleAnchorClicks = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href === window.location.pathname) return;

      // Skip external links, hash links, and specific allowed paths
      if (
        href.startsWith('http') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('#') ||
        href.startsWith('/home/exam/question')
      ) return;

      e.preventDefault();
      setPendingNavigation(href);
      setShowExitConfirm(true);
    };

    document.addEventListener('click', handleAnchorClicks, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleAnchorClicks, true);
    };
  }, [practiceMode]);

  // Build question groups
  const groups = useMemo<QuestionGroup[]>(() => {
    if (!questions.length) return [];

    const result: QuestionGroup[] = [];
    let i = 0;

    while (i < questions.length) {
      const q = questions[i];
      let groupSize = 1;
      let hasAudio = false;
      let hasImage = false;
      let hasPassage = false;
      let passage: QuestionModel['passage'] = undefined;
      let audioUrl: string | undefined;
      let imageUrl: string | undefined;

      // Check for passage (Part 6, 7)
      if (q.passage) {
        hasPassage = true;
        passage = q.passage;
        for (let j = i + 1; j < questions.length; j++) {
          if (questions[j].passage?.id === q.passage?.id &&
              questions[j].part_id === q.part_id) {
            groupSize++;
          } else {
            break;
          }
        }
      }
      // Check for image only (Part 2, Part 3 no-audio) — bỏ part_id vì fetch nhiều tests
      else if (q.media?.find(m => m.type === 'image') && !q.media?.find(m => m.type === 'audio')) {
        imageUrl = q.media?.find(m => m.type === 'image')?.url;
        hasImage = true;
        const mediaUrl = q.media?.find(m => m.type === 'image')?.url;
        for (let j = i + 1; j < questions.length; j++) {
          const nextMediaUrl = questions[j].media?.find(m => m.type === 'image')?.url;
          if (nextMediaUrl === mediaUrl) {
            groupSize++;
          } else {
            break;
          }
        }
      }
      // Check for audio (Part 2, 3, 4) — bỏ part_id vì fetch nhiều tests
      else if (q.media?.find(m => m.type === 'audio')) {
        audioUrl = q.media?.find(m => m.type === 'audio')?.url;
        hasAudio = true;
        for (let j = i + 1; j < questions.length; j++) {
          const nextAudioUrl = questions[j].media?.find(m => m.type === 'audio')?.url;
          if (nextAudioUrl === audioUrl) {
            groupSize++;
          } else {
            break;
          }
        }
        // Also check if this group has images
        const firstQ = questions[i];
        if (firstQ.media?.find(m => m.type === 'image')) {
          hasImage = true;
          imageUrl = firstQ.media?.find(m => m.type === 'image')?.url;
        }
      }

      const endIndex = i + groupSize - 1;
      const questionNumbers = groupSize > 1
        ? `${i + 1}–${endIndex + 1}`
        : `${i + 1}`;

      result.push({
        startIndex: i,
        endIndex,
        questionNumbers,
        hasAudio,
        hasImage,
        hasPassage,
        passage,
        audioUrl,
        imageUrl,
        questions: questions.slice(i, i + groupSize),
      });

      i += groupSize;
    }

    return result;
  }, [questions]);

  const currentGroup = groups[currentGroupIndex];
  const totalGroups = groups.length;
  const currentQuestion = currentGroup?.questions[0];
  const currentPart = parts.find(p => p.id === currentQuestion?.part_id);

  // Load questions
  useEffect(() => {
    async function load() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          setShowLoginModal(true);
          return;
        }

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
        } else if (practiceMode && partNumber >= 1 && partNumber <= 4) {
          loadedQuestions = await getQuestionsByListeningPartNumber(partNumber);
        } else if (practiceMode && partNumber >= 5) {
          loadedQuestions = await getQuestionsByReadingPartNumber(partNumber);
        } else if (practiceMode && partId) {
          loadedQuestions = await getQuestionsByPartId(partId);
        } else {
          loadedQuestions = await getQuestionsByTestId(testId);
        }

        const [ps, test, role] = await Promise.all([
          getTestParts(testId),
          getTestById(testId),
          getCurrentUserRole(),
        ]);

        const premiumUser = role === 'premium' || role === 'admin';
        const blockedByTest = !practiceMode && Boolean(test?.is_premium) && !premiumUser;
        if (blockedByTest) {
          setHasAccess(false);
          return;
        }

        const finalQuestions = (questionLimit > 0 && practiceMode)
          ? truncateToCompleteGroups(loadedQuestions, questionLimit)
          : loadedQuestions;
        setQuestions(finalQuestions);
        setParts(ps);
      } catch {
        //
      } finally {
        setLoading(false);
      }
    }
    if (testId) load();
  }, [partId, partNumber, practiceMode, questionLimit, source, testId]);

  // Reset group index when questions change
  useEffect(() => {
    setCurrentGroupIndex(0);
  }, [questions.length]);

  // Timer
  useEffect(() => {
    if (practiceMode) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [practiceMode]);

  // Auto submit when timer reaches 0
  useEffect(() => {
    if (timeLeft === 0 && !practiceMode) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, practiceMode]);

  const selectAnswer = (questionIndex: number, optionIndex: number) => {
    setUserAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Audio progress
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentGroup?.audioUrl) return;

    if (audio.src !== currentGroup.audioUrl) {
      audio.src = currentGroup.audioUrl!;
      audio.load();
      setIsPlaying(false);
    }

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
  }, [currentGroup?.audioUrl]);

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

  const goNextGroup = () => {
    if (currentGroupIndex < totalGroups - 1) {
      setCurrentGroupIndex(currentGroupIndex + 1);
      setIsPlaying(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goPrevGroup = () => {
    if (currentGroupIndex > 0) {
      setCurrentGroupIndex(currentGroupIndex - 1);
      setIsPlaying(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const answeredCount = Object.keys(userAnswers).length;
  const totalQuestions = questions.length;

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

  if (questions.length === 0 || !currentGroup) {
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
      <div className="sm:px-10">
        <div className="sticky top-20 z-10 bg-white/90 backdrop-blur-md -mx-4 sm:-mx-10 py-3 mb-6 rounded-2xl px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowExitConfirm(true)}
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
                style={{ width: `${((currentGroupIndex + 1) / totalGroups) * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 shrink-0">
              {answeredCount}/{totalQuestions} đã trả lời
            </span>
          </div>
        </div>
      </div>

      {/* Main content - Web layout: side by side */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Media & Passage */}
        <div className="space-y-4">
          {/* Audio player */}
          {currentGroup.hasAudio && currentGroup.audioUrl && (
            practiceMode ? (
              <AudioPlayer src={currentGroup.audioUrl} />
            ) : (
              <div className="bg-slate-800 rounded-2xl p-5">
                <audio ref={audioRef} preload="metadata" />
                <div className="flex items-center gap-2 mb-3">
                  <Volume2 className="w-4 h-4 text-teal-400" />
                  <span className="text-xs text-slate-400">Audio - {currentGroup.questionNumbers}</span>
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
            )
          )}

          {/* Image */}
          {currentGroup.hasImage && currentGroup.imageUrl && (
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentGroup.imageUrl} alt="Question" className="w-full rounded-xl h-auto" />
            </div>
          )}

          {/* Passage */}
          {currentGroup.hasPassage && currentGroup.passage && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h4 className="font-semibold text-slate-800 mb-3">{currentGroup.passage.title}</h4>
              <div className="text-sm text-slate-700 leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap">
                {currentGroup.passage.content}
              </div>
            </div>
          )}

          {!currentGroup.hasAudio && !currentGroup.hasImage && !currentGroup.hasPassage && (
            <div className="bg-slate-50 rounded-2xl p-8 text-center">
              <p className="text-slate-400 text-sm">Không có tài liệu đính kèm</p>
            </div>
          )}
        </div>

        {/* Right: All Questions in this Group */}
        <div className="space-y-4">
          {/* Group header */}
          {/* All questions in the group */}
          {currentGroup.questions.map((question, qIdx) => {
            const globalIndex = currentGroup.startIndex + qIdx;
            const labels = ['A', 'B', 'C', 'D'];

            return (
              <div key={question.id} className="bg-white rounded-2xl border border-slate-100 p-6">
                {/* Question number */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold">
                    {globalIndex + 1}
                  </span>
                  <span className="text-xs text-slate-400">Part {currentPart?.part_number}</span>
                </div>

                {/* Question text */}
                {question.question_text && (
                  <p className="text-slate-800 font-medium mb-4 leading-relaxed">
                    {question.question_text}
                  </p>
                )}

                {/* Options */}
                <div className="space-y-2">
                  {question.options.map((option, optIdx) => {
                    const isSelected = userAnswers[globalIndex] === optIdx;
                    const isPart12 = (currentPart?.part_number ?? 0) <= 2;
                    return (
                      <button
                        key={option.id}
                        onClick={() => selectAnswer(globalIndex, optIdx)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-primary bg-teal-50'
                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                          isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {labels[optIdx]}
                        </span>
                        {isPart12 ? (
                          <span className={`text-sm ${isSelected ? 'text-primary font-medium' : 'text-slate-400'}`}>
                            Đáp án {labels[optIdx]}
                          </span>
                        ) : option.content ? (
                          <span className={`text-sm ${isSelected ? 'text-primary font-medium' : 'text-slate-700'}`}>
                            {option.content}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400 italic">Không có nội dung</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={goPrevGroup}
          disabled={currentGroupIndex === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Câu trước
        </button>

        <button
          onClick={goNextGroup}
          disabled={currentGroupIndex === totalGroups - 1}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
        Câu tiếp
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Question Overview Panel */}
      {showOverview && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowOverview(false)} />
          <div className="relative bg-white rounded-t-3xl lg:rounded-3xl w-full lg:w-120 max-h-[80vh] overflow-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Tổng quan ({answeredCount}/{totalQuestions})</h3>
              <button onClick={() => setShowOverview(false)} className="p-1 hover:bg-slate-100 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Question grid */}
            <div className="grid grid-cols-10 gap-2">
              {questions.map((_, i) => {
                const answered = userAnswers[i] !== undefined;
                const isCurrent = i >= (currentGroup?.startIndex || 0) && i <= (currentGroup?.endIndex || 0);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      // Find the group this question belongs to and navigate to it
                      const groupIdx = groups.findIndex(g => i >= g.startIndex && i <= g.endIndex);
                      if (groupIdx !== -1) setCurrentGroupIndex(groupIdx);
                      setShowOverview(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
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
              Nộp bài ({answeredCount}/{totalQuestions})
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
              Bạn đã trả lời {answeredCount}/{totalQuestions} câu hỏi.
            </p>
            {answeredCount < totalQuestions && (
              <p className="text-xs text-amber-600 mb-4">
                Còn {totalQuestions - answeredCount} câu chưa trả lời!
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

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowExitConfirm(false); setPendingNavigation(null); }} />
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ArrowLeft className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="font-bold text-slate-800 text-xl mb-2">Thoát bài thi?</h3>
              <p className="text-sm text-slate-500">Bạn có chắc muốn thoát? Tiến trình bài làm hiện tại sẽ không được lưu.</p>
            </div>

            {/* Exam Status */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{answeredCount}</p>
                  <p className="text-xs text-slate-500">Đã trả lời</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-400">{totalQuestions - answeredCount}</p>
                  <p className="text-xs text-slate-500">Chưa trả lời</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-700">{totalQuestions}</p>
                  <p className="text-xs text-slate-500">Tổng câu</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Thời gian còn lại</span>
                  <span className="font-semibold text-slate-700">
                    {practiceMode ? 'Không giới hạn' : formatTime(timeLeft)}
                  </span>
                </div>
                <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  setPendingNavigation(null);
                }}
                className="flex-1 py-3.5 border-2 border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Tiếp tục
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  if (pendingNavigation) {
                    router.push(pendingNavigation);
                  } else {
                    router.back();
                  }
                  setPendingNavigation(null);
                }}
                className="flex-1 py-3.5 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors"
              >
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
        description="Bạn cần đăng nhập để làm bài thi. Đăng nhập ngay để bắt đầu!"
      />
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
