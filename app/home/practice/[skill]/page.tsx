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
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import {
  getCurrentUserRole,
  getListeningPracticeParts,
  getReadingPracticeParts,
  getFullTests,
  getWrongListeningQuestionIds,
  getWrongReadingQuestionIds,
} from '@/lib/api';
import type { TestModel, PracticePartData } from '@/lib/types';

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
  const [wrongQuestionIds, setWrongQuestionIds] = useState<string[]>([]);
  const [selectedPracticePart, setSelectedPracticePart] = useState<PracticePartData | null>(null);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState(0);
  const [tests, setTests] = useState<TestModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPremiumUser, setIsPremiumUser] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [allTests, role] = await Promise.all([
          getFullTests(),
          getCurrentUserRole(),
        ]);
        setIsPremiumUser(role === 'premium' || role === 'admin');
        setTests(allTests);
        if (skill === 'listening') {
          const [lParts, wrongIds] = await Promise.all([
            getListeningPracticeParts(),
            getWrongListeningQuestionIds(),
          ]);
          setListeningParts(lParts);
          setWrongQuestionIds(wrongIds);
        } else if (skill === 'reading') {
          const [rParts, wrongIds] = await Promise.all([
            getReadingPracticeParts(),
            getWrongReadingQuestionIds(),
          ]);
          setReadingParts(rParts);
          setWrongQuestionIds(wrongIds);
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
    if (isPremiumUser) return false;
    if (skill === 'listening' || skill === 'reading') return index > 0;
    if (skill === 'speaking' || skill === 'writing') return true;
    return false;
  };

  const openPracticePartConfig = (part: PracticePartData, index: number) => {
    if (isPartLocked(part.partNumber, index)) {
      router.push('/home/upgrade');
      return;
    }
    setSelectedPracticePart(part);
    setSelectedQuestionCount(part.questionCount || 0);
  };

  const buildCountOptions = (total: number): number[] => {
    if (total <= 0) return [0];
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
    const limit = selectedQuestionCount > 0 ? selectedQuestionCount : selectedPracticePart.questionCount;
    const params = new URLSearchParams({
      testId: selectedPracticePart.testId,
      title: partTitle,
      partId: selectedPracticePart.partId,
      partNumber: String(selectedPracticePart.partNumber),
      practice: 'true',
      questionLimit: String(limit),
    });
    setSelectedPracticePart(null);
    router.push(`/home/exam/question?${params.toString()}`);
  };

  const startWrongQuestionPractice = () => {
    if (!wrongQuestionIds.length) return;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('practice_wrong_question_ids', JSON.stringify(wrongQuestionIds));
    }
    const params = new URLSearchParams({
      testId: (skill === 'reading' ? readingParts[0]?.testId : listeningParts[0]?.testId) || tests[0]?.id || '',
      title: 'Luyện tập câu sai',
      practice: 'true',
      source: 'wrong',
    });
    router.push(`/home/exam/question?${params.toString()}`);
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

      {/* Practice wrong answers card */}
      <button
        type="button"
        onClick={startWrongQuestionPractice}
        disabled={(skill !== 'listening' && skill !== 'reading') || wrongQuestionIds.length === 0}
        className="w-full bg-linear-to-r from-orange-500 to-amber-500 rounded-2xl p-5 mb-6 text-white text-left disabled:opacity-60"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-8 h-8" />
          <div className="flex-1">
            <h4 className="font-semibold">Luyện tập câu sai</h4>
            <p className="text-sm text-orange-100">
              {(skill === 'listening' || skill === 'reading')
                ? `Tổng số câu sai: ${wrongQuestionIds.length}`
                : 'Ôn lại các câu đã trả lời sai'}
            </p>
          </div>
          <ChevronRight className="w-5 h-5" />
        </div>
      </button>

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
                const href = skill === 'speaking'
                  ? `/home/practice/speaking-question?partNumber=${partNumber}&title=${encodeURIComponent(desc.title)}`
                  : `/home/practice/writing-question?partNumber=${partNumber}&title=${encodeURIComponent(desc.title)}`;

                return (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    if (locked) {
                      router.push('/home/upgrade');
                      return;
                    }
                    router.push(href);
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
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedPracticePart(null)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5">
            <h4 className="text-lg font-bold text-slate-900 mb-2">
              {descriptions[selectedPracticePart.partNumber]?.title || `Part ${selectedPracticePart.partNumber}`}
            </h4>
            <p className="text-sm text-slate-500 mb-4">Chọn số câu muốn luyện</p>

            <div className="mb-5">
              <label className="block text-sm text-slate-600 mb-2">Số câu hỏi</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm max-h-48 overflow-y-auto"
                value={selectedQuestionCount}
                onChange={(e) => setSelectedQuestionCount(Number(e.target.value))}
              >
                {buildCountOptions(selectedPracticePart.questionCount).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedPracticePart(null)}
                className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={startPartPractice}
                className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-semibold"
              >
                Bắt đầu nào
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
