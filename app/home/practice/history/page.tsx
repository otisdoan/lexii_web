'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock3,
  FileCheck2,
  MessageSquareText,
  Mic,
  PenTool,
  RefreshCw,
  Headphones,
  Image as ImageIcon,
  FileAudio,
  FileText,
} from 'lucide-react';
import { getCurrentUser, getPracticeHistory, getListeningReadingPracticeHistory } from '@/lib/api';
import type { PracticeHistoryItem, PracticeListeningReadingHistoryItem } from '@/lib/types';
import AudioPlayer from '@/app/components/AudioPlayer';

type FilterKey = 'all' | 'listening' | 'reading' | 'speaking' | 'writing';

function toFilterKey(value: string | null): FilterKey {
  if (value === 'listening' || value === 'reading' || value === 'speaking' || value === 'writing' || value === 'all') {
    return value;
  }
  return 'all';
}

function getFilterFromLocation(): FilterKey {
  if (typeof window === 'undefined') return 'all';
  const params = new URLSearchParams(window.location.search);
  return toFilterKey(params.get('filter'));
}

type HistoryCardItem = {
  id: string;
  type: FilterKey;
  title: string;
  subtitle: string;
  scoreLabel: string;
  createdAt: string;
  practiceHistoryId?: string;
  userAnswer?: string;
  promptContent?: string;
  aiFeedback?: string;
  aiErrors?: string[];
  aiTaskScores?: Record<string, number>;
  aiImportantWords?: string[];
  suggestedAnswer?: string;
  promptDisplayText?: string;
  promptText?: string;
  passageText?: string;
  passageSubject?: string;
  imageUrl?: string;
  audioUrl?: string;
  modelAnswer?: string;
};

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700 w-9 text-right">{score}</span>
    </div>
  );
}

type PromptContentMeta = {
  displayText?: string;
  prompt?: string;
  passage?: string;
  passageText?: string;
  passageSubject?: string;
  imageUrl?: string;
  audioUrl?: string;
  modelAnswer?: string;
};

function parsePromptContent(raw: string): PromptContentMeta {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as PromptContentMeta;
    if (parsed && typeof parsed === 'object') return parsed;
    return {};
  } catch {
    return { displayText: raw };
  }
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toSpeakingWritingItem(row: PracticeHistoryItem): HistoryCardItem {
  const isSpeaking = row.mode === 'speaking';
  const content = parsePromptContent(row.prompt_content || '');
  return {
    id: `practice-${row.id}`,
    type: isSpeaking ? 'speaking' : 'writing',
    title: `${isSpeaking ? 'Speaking' : 'Writing'} Part ${row.part_number}`,
    subtitle: row.prompt_title || 'Bai luyen tap',
    scoreLabel: row.ai_score !== null ? `${row.ai_score}/100` : 'Chua co diem',
    createdAt: row.created_at,
    suggestedAnswer: row.ai_suggested_answer || '',
    userAnswer: row.user_answer || '',
    promptContent: content.displayText || row.prompt_content || '',
    promptDisplayText: content.displayText || row.prompt_content || '',
    promptText: content.prompt || '',
    passageText: content.passage || content.passageText || '',
    passageSubject: content.passageSubject || '',
    imageUrl: content.imageUrl || '',
    audioUrl: content.audioUrl || '',
    modelAnswer: content.modelAnswer || '',
    aiFeedback: row.ai_feedback || '',
    aiErrors: row.ai_errors || [],
    aiTaskScores: row.ai_task_scores || {},
    aiImportantWords: row.ai_important_words || [],
  };
}

function toListeningReadingItem(row: PracticeListeningReadingHistoryItem): HistoryCardItem {
  return {
    id: `lr-practice-${row.id}`,
    type: row.section,
    title: `${row.section === 'listening' ? 'Listening' : 'Reading'} Part ${row.part_number}`,
    subtitle: `${row.question_count} cau`,
    scoreLabel: `${row.correct_count}/${row.question_count} dung`,
    createdAt: row.created_at,
    practiceHistoryId: row.id,
  };
}

export default function PracticeHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>(() => getFilterFromLocation());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [items, setItems] = useState<HistoryCardItem[]>([]);

  useEffect(() => {
    const nextFilter = getFilterFromLocation();
    setFilter(nextFilter);
  }, []);

  const loadHistory = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const user = await getCurrentUser();
      if (!user) {
        setItems([]);
        return;
      }

      const [practiceRows, listeningReadingRows] = await Promise.all([
        getPracticeHistory(user.id),
        getListeningReadingPracticeHistory(100),
      ]);

      const merged = [
        ...practiceRows.map(toSpeakingWritingItem),
        ...listeningReadingRows.map(toListeningReadingItem),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setItems(merged);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory(false);
  }, [loadHistory]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter(item => item.type === filter);
  }, [filter, items]);

  return (
    <div className="pb-20 lg:pb-8">
      <div className="bg-primary px-4 py-4 rounded-md flex items-center gap-3 mb-4">
        <button onClick={() => router.push('/home')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-lg font-semibold text-white flex-1 text-center pr-10">Lịch sử luyện tập</h1>
        <button
          onClick={() => void loadHistory(true)}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
          aria-label="Lam moi lich su"
          title="Lam moi"
        >
          <RefreshCw className={`w-5 h-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === 'all' ? 'bg-primary text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Tất cả
        </button>
        <button
          onClick={() => setFilter('listening')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === 'listening' ? 'bg-primary text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Listening
        </button>
        <button
          onClick={() => setFilter('reading')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === 'reading' ? 'bg-primary text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Reading
        </button>
        <button
          onClick={() => setFilter('speaking')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === 'speaking' ? 'bg-primary text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Speaking
        </button>
        <button
          onClick={() => setFilter('writing')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === 'writing' ? 'bg-primary text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Writing
        </button>
      </div>

      <div className="space-y-3">
        {loading && (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
            <div className="h-8 w-8 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-slate-500 mt-3">Đang tải lịch sử...</p>
          </div>
        )}

        {!loading && filteredItems.length === 0 && (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-slate-100">
            <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">Chưa có lịch sử luyện tập</p>
            <p className="text-sm text-slate-500 mt-1">Sau khi nộp bài, kết quả sẽ hiển thị tại đây.</p>
          </div>
        )}

        {!loading && filteredItems.map((item) => {
          const isExpanded = expandedId === item.id;
          const isSpeaking = item.type === 'speaking';
          const isWriting = item.type === 'writing';
          const canExpand = isSpeaking || isWriting;
          const isListening = item.type === 'listening';
          const isReading = item.type === 'reading';
          const canOpenAttemptDetail = (isListening || isReading) && Boolean(item.practiceHistoryId);

          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-100 ${canOpenAttemptDetail ? 'cursor-pointer hover:border-primary/30 transition-colors' : ''}`}
              onClick={() => {
                if (canOpenAttemptDetail && item.practiceHistoryId) {
                  router.push(`/home/practice/history/mcq/${item.practiceHistoryId}`);
                }
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                  {isListening && <Headphones className="w-5 h-5 text-blue-600" />}
                  {isReading && <FileText className="w-5 h-5 text-emerald-600" />}
                  {isSpeaking && <Mic className="w-5 h-5 text-orange-500" />}
                  {isWriting && <PenTool className="w-5 h-5 text-purple-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{item.title}</p>
                  <p className="text-sm text-slate-600 truncate">{item.subtitle}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span className="text-slate-600">{item.scoreLabel}</span>
                    <span className="text-slate-500 inline-flex items-center gap-1">
                      <Clock3 className="w-3.5 h-3.5" />
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                </div>
                {canExpand && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedId(isExpanded ? null : item.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                    aria-label="Mo chi tiet"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {canExpand && isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                  {item.imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                      <div className="flex items-center gap-2 p-2 border-b border-slate-100">
                        <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                        <p className="text-xs font-semibold text-slate-500">Hinh minh hoa</p>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.imageUrl} alt={item.subtitle} className="w-full h-44 object-cover" />
                    </div>
                  )}

                  {(item.promptText || item.passageText || item.promptDisplayText) && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">De bai</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.promptText || item.promptDisplayText}</p>
                    </div>
                  )}

                  {item.passageText && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-500 mb-1 inline-flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {item.passageSubject || 'Noi dung'}
                      </p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.passageText}</p>
                    </div>
                  )}

                  {item.audioUrl && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                      <p className="text-xs font-semibold text-blue-700 mb-2 inline-flex items-center gap-1">
                        <FileAudio className="w-3.5 h-3.5" />
                        Audio nguoi dung da noi
                      </p>
                      <AudioPlayer src={item.audioUrl} />
                    </div>
                  )}

                  {item.userAnswer && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">Cau tra loi cua ban</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.userAnswer}</p>
                    </div>
                  )}
                  {item.aiFeedback && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-amber-700 mb-1 inline-flex items-center gap-1">
                        <MessageSquareText className="w-3.5 h-3.5" />
                        Nhan xet AI
                      </p>
                      <p className="text-sm text-amber-800 whitespace-pre-wrap">{item.aiFeedback}</p>
                    </div>
                  )}

                  {item.aiTaskScores && Object.keys(item.aiTaskScores).length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-semibold text-slate-600">Diem chi tiet</p>
                      {Object.entries(item.aiTaskScores).map(([key, value]) => (
                        <ScoreBar key={key} score={value} label={key} />
                      ))}
                    </div>
                  )}

                  {item.aiErrors && item.aiErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-red-700 mb-1">Loi can sua</p>
                      <ul className="space-y-1">
                        {item.aiErrors.map((err, index) => (
                          <li key={`${item.id}-err-${index}`} className="text-sm text-red-800">• {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {item.aiImportantWords && item.aiImportantWords.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-blue-700 mb-2">Tu vung goi y</p>
                      <div className="flex flex-wrap gap-2">
                        {item.aiImportantWords.map((word, index) => (
                          <span
                            key={`${item.id}-word-${index}`}
                            className="px-2.5 py-1 bg-white border border-blue-200 rounded-full text-xs font-medium text-blue-700"
                          >
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {item.suggestedAnswer && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-emerald-700 mb-1">Dap an goi y</p>
                      <p className="text-sm text-emerald-800 whitespace-pre-wrap">{item.suggestedAnswer}</p>
                    </div>
                  )}

                  {item.modelAnswer && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-green-700 mb-1">Dap an mau</p>
                      <p className="text-sm text-green-800 whitespace-pre-wrap">{item.modelAnswer}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
