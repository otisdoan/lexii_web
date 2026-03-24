'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Headphones,
  BookOpen,
  Mic,
  PenTool,
  ChevronRight,
  Lock,
  BarChart3,
  TrendingUp,
  HelpCircle,
  Play,
  X,
} from 'lucide-react';
import {
  getCurrentUser,
  getCurrentUserRole,
  getListeningPracticeParts,
  getReadingPracticeParts,
  getUnansweredQuestionIdsForPracticePart,
  getSpeakingPartsCount,
  getWritingPartsCount,
} from '@/lib/api';
import type { PracticePartData } from '@/lib/types';
import LoginRequiredModal from '@/app/components/LoginRequiredModal';

const skillConfig: Record<string, { title: string; icon: typeof Headphones; color: string; bgColor: string; textColor: string }> = {
  listening: { title: 'Listening', icon: Headphones, color: 'bg-blue-500', bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
  reading: { title: 'Reading', icon: BookOpen, color: 'bg-green-600', bgColor: 'bg-green-50', textColor: 'text-green-600' },
  speaking: { title: 'Speaking', icon: Mic, color: 'bg-orange-500', bgColor: 'bg-orange-50', textColor: 'text-orange-600' },
  writing: { title: 'Writing', icon: PenTool, color: 'bg-purple-500', bgColor: 'bg-purple-50', textColor: 'text-purple-600' },
};

const partDescriptions: Record<string, Record<number, { title: string; description: string }>> = {
  listening: {
    1: { title: 'Part 1: Photographs', description: 'Xem ảnh và chọn mô tả phù hợp nhất' },
    2: { title: 'Part 2: Question-Response', description: 'Nghe câu hỏi và chọn câu trả lời phù hợp' },
    3: { title: 'Part 3: Conversations', description: 'Nghe hội thoại và trả lời câu hỏi' },
    4: { title: 'Part 4: Talks', description: 'Nghe bài nói và trả lời câu hỏi' },
  },
  reading: {
    5: { title: 'Part 5: Incomplete Sentences', description: 'Chọn từ phù hợp để hoàn thành câu' },
    6: { title: 'Part 6: Text Completion', description: 'Chọn từ/câu để hoàn thành đoạn văn' },
    7: { title: 'Part 7: Reading Comprehension', description: 'Đọc bài đọc và trả lời câu hỏi' },
  },
  speaking: {
    1: { title: 'Part 1: Read Aloud', description: 'Đọc to đoạn văn bản' },
    2: { title: 'Part 2: Describe a Picture', description: 'Mô tả hình ảnh trong 45 giây' },
    3: { title: 'Part 3: Respond to Questions', description: 'Trả lời câu hỏi về chủ đề' },
    4: { title: 'Part 4: Express an Opinion', description: 'Trình bày quan điểm cá nhân' },
    5: { title: 'Part 5: Propose a Solution', description: 'Đề xuất giải pháp cho vấn đề' },
  },
  writing: {
    1: { title: 'Part 1: Write a Sentence', description: 'Viết câu mô tả hình ảnh' },
    2: { title: 'Part 2: Respond to a Request', description: 'Viết email phản hồi yêu cầu' },
    3: { title: 'Part 3: Write an Opinion Essay', description: 'Viết bài luận trình bày quan điểm' },
  },
};

export default function PracticeDetailPage({ params }: { params: Promise<{ skill: string }> }) {
  const { skill } = use(params);
  const router = useRouter();
  const config = skillConfig[skill] || skillConfig.listening;
  const Icon = config.icon;

  const [listeningParts, setListeningParts] = useState<PracticePartData[]>([]);
  const [readingParts, setReadingParts] = useState<PracticePartData[]>([]);
  const [speakingPartsCount, setSpeakingPartsCount] = useState<Record<number, number>>({});
  const [writingPartsCount, setWritingPartsCount] = useState<Record<number, number>>({});
  const [selectedPracticePart, setSelectedPracticePart] = useState<PracticePartData | null>(null);
  const [selectedSpeakingPart, setSelectedSpeakingPart] = useState<{ partNumber: number; title: string; description: string } | null>(null);
  const [selectedWritingPart, setSelectedWritingPart] = useState<{ partNumber: number; title: string; description: string } | null>(null);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState(0);
  const [availableQuestionIds, setAvailableQuestionIds] = useState<string[] | null>(null);
  const [showRestartChoiceModal, setShowRestartChoiceModal] = useState(false);
  const [pendingPracticeSelection, setPendingPracticeSelection] = useState<{
    part: PracticePartData;
    index: number;
  } | null>(null);
  const [loadingUnanswered, setLoadingUnanswered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const role = await getCurrentUserRole();
        setIsPremiumUser(role === 'premium' || role === 'admin');
        if (skill === 'listening') {
          const lParts = await getListeningPracticeParts();
          setListeningParts(lParts);
        } else if (skill === 'reading') {
          const rParts = await getReadingPracticeParts();
          setReadingParts(rParts);
        } else if (skill === 'speaking') {
          const counts = await getSpeakingPartsCount();
          setSpeakingPartsCount(counts);
        } else if (skill === 'writing') {
          const counts = await getWritingPartsCount();
          setWritingPartsCount(counts);
        }
      } catch {
        //
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [skill]);

  const descriptions = partDescriptions[skill] || {};

  const isPartLocked = (partNumber: number, index: number) => {
    if (isPremiumUser === true) return false;
    if (skill === 'listening' || skill === 'reading') return Number(index) > 0;
    if (skill === 'speaking' || skill === 'writing') return Number(index) > 0;
    return false;
  };

  const openPracticePartConfig = async (part: PracticePartData, index: number) => {
    if (isPartLocked(part.partNumber, index)) {
      router.push('/home/upgrade');
      return;
    }

    const user = await getCurrentUser();
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    const supportsUnansweredMode =
      (skill === 'listening' || skill === 'reading') &&
      (part.questionType === 'mcq_audio' || part.questionType === 'mcq_text') &&
      part.questionCount > 0 &&
      part.answeredCount > 0;

    if (!supportsUnansweredMode) {
      openPracticeConfigModal(part, null);
      return;
    }

    setPendingPracticeSelection({ part, index });
    setShowRestartChoiceModal(true);
  };

  const openPracticeConfigModal = (part: PracticePartData, ids: string[] | null) => {
    const total = ids?.length ?? part.questionCount;
    setSelectedPracticePart(part);
    setAvailableQuestionIds(ids);
    const defaultCount = total > 0 ? Math.min(10, total) : 0;
    setSelectedQuestionCount(defaultCount);
  };

  const chooseRestartFromBeginning = () => {
    if (!pendingPracticeSelection) return;
    const { part } = pendingPracticeSelection;
    setShowRestartChoiceModal(false);
    setPendingPracticeSelection(null);
    openPracticeConfigModal(part, null);
  };

  const choosePracticeUnanswered = async () => {
    if (!pendingPracticeSelection) return;
    const { part } = pendingPracticeSelection;
    setLoadingUnanswered(true);
    try {
      const ids = await getUnansweredQuestionIdsForPracticePart(
        part.partNumber,
        part.questionType,
      );
      setShowRestartChoiceModal(false);
      setPendingPracticeSelection(null);
      if (!ids.length) {
        window.alert('Bạn đã hoàn thành tất cả câu hỏi của part này.');
        return;
      }
      openPracticeConfigModal(part, ids);
    } catch {
      window.alert('Không thể tải danh sách câu chưa làm. Vui lòng thử lại.');
    } finally {
      setLoadingUnanswered(false);
    }
  };

  const buildCountOptions = (total: number, compact = false): number[] => {
    if (total <= 0) return [0];
    if (compact) {
      const presets = [5, 10, 20, 50, 100].filter(n => n <= total);
      if (!presets.includes(total)) presets.push(total);
      return presets;
    }
    const opts: number[] = [];
    for (let n = 5; n <= total; n += 5) opts.push(n);
    if (opts.length === 0 || opts[opts.length - 1] !== total) {
      opts.push(total);
    }
    return opts;
  };

  const startPartPractice = () => {
    if (!selectedPracticePart) return;
    const partTitle = descriptions[selectedPracticePart.partNumber]?.title || `Part ${selectedPracticePart.partNumber}`;
    const totalAvailable = availableQuestionIds?.length ?? selectedPracticePart.questionCount;
    const limit = selectedQuestionCount > 0 ? selectedQuestionCount : totalAvailable;
    const params = new URLSearchParams({
      testId: selectedPracticePart.testId,
      title: partTitle,
      partId: selectedPracticePart.partId,
      partNumber: String(selectedPracticePart.partNumber),
      practice: 'true',
      questionLimit: String(limit),
    });

    if (availableQuestionIds && typeof window !== 'undefined') {
      const selectedIds = availableQuestionIds.slice(0, limit);
      window.sessionStorage.setItem(
        'practice_unanswered_question_ids',
        JSON.stringify(selectedIds),
      );
      params.set('source', 'unanswered');
    } else if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('practice_unanswered_question_ids');
    }

    setAvailableQuestionIds(null);
    setSelectedPracticePart(null);
    router.push(`/home/exam/question?${params.toString()}`);
  };

  const openSpeakingPartConfig = async (partNumber: number, title: string, description: string) => {
    const locked = isPartLocked(partNumber, 1);
    if (locked) {
      router.push('/home/upgrade');
      return;
    }
    const user = await getCurrentUser();
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setSelectedSpeakingPart({ partNumber, title, description });
    const total = speakingPartsCount[partNumber] || 0;
    setSelectedQuestionCount(Math.min(1, total));
  };

  const openWritingPartConfig = async (partNumber: number, title: string, description: string) => {
    const locked = isPartLocked(partNumber, 1);
    if (locked) {
      router.push('/home/upgrade');
      return;
    }
    const user = await getCurrentUser();
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setSelectedWritingPart({ partNumber, title, description });
    const total = writingPartsCount[partNumber] || 0;
    setSelectedQuestionCount(Math.min(1, total));
  };

  const startSpeakingPractice = () => {
    if (!selectedSpeakingPart) return;
    const params = new URLSearchParams({
      partNumber: String(selectedSpeakingPart.partNumber),
      title: selectedSpeakingPart.title,
      questionLimit: String(selectedQuestionCount > 0 ? selectedQuestionCount : speakingPartsCount[selectedSpeakingPart.partNumber] || 5),
    });
    setSelectedSpeakingPart(null);
    router.push(`/home/practice/speaking-question?${params.toString()}`);
  };

  const startWritingPractice = () => {
    if (!selectedWritingPart) return;
    const params = new URLSearchParams({
      partNumber: String(selectedWritingPart.partNumber),
      title: selectedWritingPart.title,
      questionLimit: String(selectedQuestionCount > 0 ? selectedQuestionCount : writingPartsCount[selectedWritingPart.partNumber] || 5),
    });
    setSelectedWritingPart(null);
    router.push(`/home/practice/writing-question?${params.toString()}`);
  };

  const listeningTotalQuestions = listeningParts.reduce((sum, p) => sum + p.questionCount, 0);
  const listeningAnswered = listeningParts.reduce((sum, p) => sum + p.answeredCount, 0);
  const listeningCorrect = listeningParts.reduce((sum, p) => sum + p.correctCount, 0);
  const listeningPercent = listeningTotalQuestions > 0
    ? Math.round((listeningCorrect / listeningTotalQuestions) * 100)
    : 0;

  const readingTotalQuestions = readingParts.reduce((sum, p) => sum + p.questionCount, 0);
  const readingAnswered = readingParts.reduce((sum, p) => sum + p.answeredCount, 0);
  const readingCorrect = readingParts.reduce((sum, p) => sum + p.correctCount, 0);
  const readingPercent = readingTotalQuestions > 0
    ? Math.round((readingCorrect / readingTotalQuestions) * 100)
    : 0;

  return (
    <div className="pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${config.bgColor} rounded-xl flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${config.textColor}`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{config.title}</h2>
            <p className="text-sm text-slate-500">Luyện tập từng phần</p>
          </div>
        </div>
      </div>

      {/* Stats card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-slate-800">Tiến độ chung</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">{skill === 'listening' ? listeningAnswered : skill === 'reading' ? readingAnswered : 0}</p>
            <p className="text-xs text-slate-500">Đã làm</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{skill === 'listening' ? listeningCorrect : skill === 'reading' ? readingCorrect : 0}</p>
            <p className="text-xs text-slate-500">Đúng</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-400">
              {skill === 'listening'
                ? `${listeningPercent}%`
                : skill === 'reading'
                  ? `${readingPercent}%`
                  : '0%'}
            </p>
            <p className="text-xs text-slate-500">Tỷ lệ</p>
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
          <div
            className="bg-primary rounded-full h-2"
            style={{
              width: `${skill === 'listening' ? listeningPercent : skill === 'reading' ? readingPercent : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Parts list */}
      <h3 className="text-lg font-bold text-slate-800 mb-4">Danh sách Part</h3>
      <div className="space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-100 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))
        ) : (
          <>
            {/* DB-backed parts */}
            {skill === 'listening' && listeningParts.map((part, index) => {
              const desc = descriptions[part.partNumber];
              const locked = isPartLocked(part.partNumber, index);
              const percent = part.questionCount > 0
                ? Math.round((part.correctCount / part.questionCount) * 100)
                : 0;
              return (
                <button
                  key={part.partId}
                  onClick={() => openPracticePartConfig(part, index)}
                  className={`w-full flex items-center gap-4 bg-white rounded-xl border p-4 transition-all text-left group ${
                    locked
                      ? 'border-amber-200 bg-amber-50/40'
                      : 'border-slate-100 hover:shadow-sm hover:border-primary/20'
                  }`}
                >
                  <div className={`w-12 h-12 ${config.bgColor} rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon className={`w-6 h-6 ${config.textColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm">{desc?.title || `Part ${part.partNumber}`}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{part.answeredCount} đã làm · {part.correctCount} đúng · {part.questionCount} câu</p>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                      <div className="bg-primary rounded-full h-1.5" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                  {locked ? (
                    <span className="text-xs text-amber-700 font-semibold flex items-center gap-1 shrink-0">
                      <Lock className="w-3.5 h-3.5" /> Premium
                    </span>
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                </button>
              );
            })}

            {skill === 'reading' && readingParts.map((part, index) => {
              const desc = descriptions[part.partNumber];
              const locked = isPartLocked(part.partNumber, index);
              const percent = part.questionCount > 0
                ? Math.round((part.correctCount / part.questionCount) * 100)
                : 0;
              return (
                <button
                  key={part.partId}
                  onClick={() => openPracticePartConfig(part, index)}
                  className={`w-full flex items-center gap-4 bg-white rounded-xl border p-4 transition-all text-left group ${
                    locked
                      ? 'border-amber-200 bg-amber-50/40'
                      : 'border-slate-100 hover:shadow-sm hover:border-primary/20'
                  }`}
                >
                  <div className={`w-12 h-12 ${config.bgColor} rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon className={`w-6 h-6 ${config.textColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm">{desc?.title || `Part ${part.partNumber}`}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{part.answeredCount} đã làm · {part.correctCount} đúng · {part.questionCount} câu</p>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                      <div className="bg-primary rounded-full h-1.5" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                  {locked ? (
                    <span className="text-xs text-amber-700 font-semibold flex items-center gap-1 shrink-0">
                      <Lock className="w-3.5 h-3.5" /> Premium
                    </span>
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                </button>
              );
            })}

            {/* Static parts for speaking/writing */}
            {(skill === 'speaking' || (skill === 'writing' && readingParts.length === 0)) && (
              Object.entries(descriptions).map(([num, desc], index) => {
                const partNumber = Number(num);
                const locked = isPartLocked(partNumber, index);
                const totalCount = skill === 'speaking'
                  ? speakingPartsCount[partNumber] || 0
                  : writingPartsCount[partNumber] || 0;

                return (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    if (skill === 'speaking') {
                      void openSpeakingPartConfig(partNumber, desc.title, desc.description);
                    } else {
                      void openWritingPartConfig(partNumber, desc.title, desc.description);
                    }
                  }}
                  className={`w-full flex items-center gap-4 bg-white rounded-xl border p-4 transition-all text-left group ${
                    locked
                      ? 'border-amber-200 bg-amber-50/40'
                      : 'border-slate-100 hover:shadow-sm hover:border-primary/20'
                  }`}
                >
                  <div className={`w-12 h-12 ${config.bgColor} rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon className={`w-6 h-6 ${config.textColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm">{desc.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{desc.description}</p>
                    {totalCount > 0 && (
                      <p className="text-xs text-primary mt-1 font-medium">{totalCount} câu</p>
                    )}
                  </div>
                  {locked ? (
                    <span className="text-xs text-amber-700 font-semibold flex items-center gap-1 shrink-0">
                      <Lock className="w-3.5 h-3.5" /> Premium
                    </span>
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                </button>
                );
              })
            )}

            {readingParts.length === 0 && listeningParts.length === 0 && skill !== 'speaking' && skill !== 'writing' && (
              <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
                <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Chưa có dữ liệu luyện tập</p>
                <p className="text-xs text-slate-400">Thêm đề thi vào hệ thống để bắt đầu</p>
              </div>
            )}
          </>
        )}
      </div>

      {selectedPracticePart && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedPracticePart(null)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl">
            {(() => {
              const totalAvailable = availableQuestionIds?.length ?? selectedPracticePart.questionCount;
              const availabilityLabel = availableQuestionIds ? 'câu chưa làm' : 'câu hỏi có sẵn';
              const options = buildCountOptions(totalAvailable, true);
              return (
                <>
            {/* Header */}
            <div className="bg-linear-to-r from-primary to-blue-500 px-6 pt-6 pb-5 text-white">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold bg-white/20 px-2.5 py-1 rounded-full uppercase tracking-wide">
                  {skill === 'listening' ? 'Listening' : 'Reading'}
                </span>
                <button
                  onClick={() => setSelectedPracticePart(null)}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h4 className="text-lg font-bold text-white">
                {descriptions[selectedPracticePart.partNumber]?.title || `Part ${selectedPracticePart.partNumber}`}
              </h4>
              <p className="text-blue-100 text-sm mt-0.5">
                {totalAvailable} {availabilityLabel}
              </p>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-slate-700">Chọn số câu muốn luyện</label>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                  Tối đa {totalAvailable} câu
                </span>
              </div>

              {/* Question count selector */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-slate-700">Số câu luyện tập</label>
                  <div className="flex items-center gap-1.5 bg-primary/5 border border-primary/20 rounded-full px-3 py-1">
                    <HelpCircle className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm font-bold text-primary">{selectedQuestionCount}</span>
                    <span className="text-xs text-primary/60">câu</span>
                  </div>
                </div>

                {/* Quick preset chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {options.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSelectedQuestionCount(n)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        selectedQuestionCount === n
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-primary/40 hover:text-primary'
                      }`}
                    >
                      {n === totalAvailable ? 'Tất cả' : `${n}`}
                    </button>
                  ))}
                </div>

                {/* Range slider */}
                {totalAvailable > 1 && (
                  <div className="px-1">
                    <input
                      type="range"
                      min={1}
                      max={totalAvailable}
                      step={1}
                      value={selectedQuestionCount || 1}
                      onChange={(e) => setSelectedQuestionCount(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-slate-100 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                    />
                    <div className="flex justify-between mt-1.5 text-xs text-slate-400">
                      <span>1 câu</span>
                      <span>{totalAvailable} câu</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-blue-50 rounded-xl p-3 mb-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <HelpCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedQuestionCount > 0 ? `${selectedQuestionCount} câu hỏi` : 'Chọn số câu'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedQuestionCount > 0
                      ? `Bạn sẽ luyện ${selectedQuestionCount} câu từ Part ${selectedPracticePart.partNumber}${availableQuestionIds ? ' (chưa làm)' : ''}`
                      : 'Vui lòng chọn số câu để bắt đầu'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPracticePart(null)}
                  className="flex-1 border border-slate-200 rounded-xl py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={startPartPractice}
                  disabled={selectedQuestionCount === 0}
                  className="flex-1 bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-bold transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Bắt đầu ngay
                </button>
              </div>
            </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {showRestartChoiceModal && pendingPracticeSelection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              if (loadingUnanswered) return;
              setShowRestartChoiceModal(false);
              setPendingPracticeSelection(null);
            }}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-100">
            <h4 className="text-lg font-bold text-slate-900 mb-2">Luyện tập tiếp</h4>
            <p className="text-sm text-slate-600 leading-relaxed mb-5">
              Bạn có muốn luyện tập lại từ đầu không?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={choosePracticeUnanswered}
                disabled={loadingUnanswered}
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 text-sm font-semibold transition-colors"
              >
                {loadingUnanswered ? 'Đang tải...' : 'Từ chối'}
              </button>
              <button
                type="button"
                onClick={chooseRestartFromBeginning}
                disabled={loadingUnanswered}
                className="flex-1 rounded-xl bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 text-sm font-bold transition-colors"
              >
                Chấp nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Speaking Practice Modal */}
      {selectedSpeakingPart && (
        <SpeakingWritingModal
          title={selectedSpeakingPart.title}
          partLabel="Speaking"
          totalCount={speakingPartsCount[selectedSpeakingPart.partNumber] || 0}
          selectedQuestionCount={selectedQuestionCount}
          onCountChange={setSelectedQuestionCount}
          onCancel={() => setSelectedSpeakingPart(null)}
          onStart={startSpeakingPractice}
        />
      )}

      {/* Writing Practice Modal */}
      {selectedWritingPart && (
        <SpeakingWritingModal
          title={selectedWritingPart.title}
          partLabel="Writing"
          totalCount={writingPartsCount[selectedWritingPart.partNumber] || 0}
          selectedQuestionCount={selectedQuestionCount}
          onCountChange={setSelectedQuestionCount}
          onCancel={() => setSelectedWritingPart(null)}
          onStart={startWritingPractice}
        />
      )}

      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Yêu cầu đăng nhập"
        description="Bạn cần đăng nhập để luyện tập. Đăng nhập ngay để bắt đầu!"
      />
    </div>
  );
}

function buildCountOptions(total: number): number[] {
  if (total <= 0) return [0];
  // All possible options: 1, 2, 3, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100
  const allPresets = [1, 2, 3, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100];
  const presets = allPresets.filter(n => n <= total && n >= 1);
  // Always include total if not already in presets
  if (!presets.includes(total)) presets.push(total);
  // Sort ascending
  presets.sort((a, b) => a - b);
  return presets;
}

function SpeakingWritingModal({
  title,
  partLabel,
  totalCount,
  selectedQuestionCount,
  onCountChange,
  onCancel,
  onStart,
}: {
  title: string;
  partLabel: string;
  totalCount: number;
  selectedQuestionCount: number;
  onCountChange: (n: number) => void;
  onCancel: () => void;
  onStart: () => void;
}) {
  const presets = buildCountOptions(totalCount);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-linear-to-r from-primary to-teal-500 px-6 pt-6 pb-5 text-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold bg-white/20 px-2.5 py-1 rounded-full uppercase tracking-wide">
              {partLabel}
            </span>
            <button
              onClick={onCancel}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <h4 className="text-lg font-bold text-white">{title}</h4>
          <p className="text-teal-100 text-sm mt-0.5">
            {totalCount} câu hỏi có sẵn
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Count selector header */}
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-slate-700">Chọn số câu muốn luyện</label>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
              Tối đa {totalCount} câu
            </span>
          </div>

          {/* Counter display */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-slate-700">Số câu luyện tập</label>
              <div className="flex items-center gap-1.5 bg-primary/5 border border-primary/20 rounded-full px-3 py-1">
                <HelpCircle className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-bold text-primary">{selectedQuestionCount}</span>
                <span className="text-xs text-primary/60">câu</span>
              </div>
            </div>

            {/* Preset chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {presets.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onCountChange(n)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    selectedQuestionCount === n
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-primary/40 hover:text-primary'
                  }`}
                >
                  {n === totalCount ? 'Tất cả' : `${n}`}
                </button>
              ))}
            </div>

            {/* Range slider */}
            {totalCount > 1 && (
              <div className="px-1">
                <input
                  type="range"
                  min={1}
                  max={totalCount}
                  step={1}
                  value={selectedQuestionCount || 1}
                  onChange={(e) => onCountChange(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-slate-100 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                />
                <div className="flex justify-between mt-1.5 text-xs text-slate-400">
                  <span>1 câu</span>
                  <span>{totalCount} câu</span>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-teal-50 rounded-xl p-3 mb-5 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {selectedQuestionCount > 0 ? `${selectedQuestionCount} câu hỏi` : 'Chọn số câu'}
              </p>
              <p className="text-xs text-slate-500">
                {selectedQuestionCount > 0
                  ? `Bạn sẽ luyện ${selectedQuestionCount} câu`
                  : 'Vui lòng chọn số câu để bắt đầu'}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 border border-slate-200 rounded-xl py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={onStart}
              disabled={selectedQuestionCount === 0}
              className="flex-1 bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-bold transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Bắt đầu ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}