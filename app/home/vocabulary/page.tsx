'use client';

import { useEffect, useState } from 'react';
import { Search, Volume2, BookMarked, ChevronLeft, ChevronRight } from 'lucide-react';
import { getVocabulary, getLessonNumbers } from '@/lib/api';
import type { VocabularyModel } from '@/lib/types';

const SCORE_LABELS: Record<number, string> = {
  0: 'Mọi cấp độ',
  450: '450–549',
  600: '600–749',
  800: '800–899',
  990: '990+',
};

function ScoreBadge({ level }: { level: number }) {
  const colors: Record<number, string> = {
    0: 'bg-slate-100 text-slate-600',
    450: 'bg-amber-100 text-amber-700',
    600: 'bg-green-100 text-green-700',
    800: 'bg-teal-100 text-teal-700',
    990: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[level] || colors[0]}`}>
      {SCORE_LABELS[level] || level}
    </span>
  );
}

export default function VocabularyPage() {
  const [words, setWords] = useState<VocabularyModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lessonFilter, setLessonFilter] = useState<number | 'all'>('all');
  const [lessons, setLessons] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  useEffect(() => {
    async function init() {
      try {
        const ls = await getLessonNumbers();
        setLessons(ls);
        if (ls.length > 0 && lessonFilter === 'all') {
          setLessonFilter(ls[0]);
        }
      } catch {
        //
      }
    }
    init();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const allWords = await getVocabulary(
          lessonFilter === 'all' ? undefined : lessonFilter,
          undefined
        );
        let filtered = allWords;
        if (search.trim()) {
          const q = search.toLowerCase();
          filtered = allWords.filter(w =>
            w.word.toLowerCase().includes(q) ||
            w.definition.toLowerCase().includes(q)
          );
        }
        setTotal(filtered.length);
        setWords(filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE));
      } catch {
        //
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [lessonFilter, search, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const playAudio = (url: string, wordId: string) => {
    if (!url) return;
    setPlayingAudio(wordId);
    const audio = new Audio(url);
    audio.play().catch(() => {});
    audio.onended = () => setPlayingAudio(null);
    audio.onerror = () => setPlayingAudio(null);
  };

  return (
    <div className="pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
          <BookMarked className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Từ vựng</h1>
          <p className="text-sm text-slate-500">{total} từ</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm kiếm từ vựng..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {/* Lesson Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button
          onClick={() => { setLessonFilter('all'); setPage(0); }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            lessonFilter === 'all'
              ? 'bg-primary text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Tất cả
        </button>
        {lessons.map(lesson => (
          <button
            key={lesson}
            onClick={() => { setLessonFilter(lesson); setPage(0); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              lessonFilter === lesson
                ? 'bg-primary text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Bài {lesson}
          </button>
        ))}
      </div>

      {/* Word List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/4 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : words.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
          <BookMarked className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Không tìm thấy từ vựng nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {words.map(word => (
            <div key={word.id} className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-base font-bold text-slate-800">{word.word}</h4>
                    <span className="text-xs text-slate-500 italic">{word.word_class}</span>
                    <ScoreBadge level={word.score_level} />
                  </div>
                  <p className="text-xs text-slate-500 font-mono mb-1.5">{word.phonetic}</p>
                  <p className="text-sm text-slate-700">{word.definition}</p>
                </div>
                {word.audio_url && (
                  <button
                    onClick={() => playAudio(word.audio_url, word.id)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      playingAudio === word.id
                        ? 'bg-red-100 text-red-500'
                        : 'bg-slate-100 text-slate-500 hover:bg-teal-100 hover:text-primary'
                    }`}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-1">
          <p className="text-sm text-slate-500">
            Hiển thị {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} của {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  page === i
                    ? 'bg-primary text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
