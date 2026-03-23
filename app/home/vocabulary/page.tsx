'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import {
  BookOpen,
  Volume2,
  Pause,
  Play,
  Search,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  Bookmark,
  BookMarked,
  ChevronDown,
  VolumeX,
  Loader2,
  Globe,
  SlidersHorizontal,
  Layers,
  Brain,
  Puzzle,
  PenSquare,
  Headphones,
  Type,
  Timer,
  Grid3X3,
  Lightbulb,
  Star,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { getVocabulary, getLessonNumbers } from '@/lib/api';
import { WordDetailCard } from '@/components/WordDetailCard';
import type { VocabularyModel } from '@/lib/types';

const SCORE_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  0:    { label: 'Mọi',     color: 'text-slate-600', bg: 'bg-slate-100' },
  450:  { label: '450+',   color: 'text-amber-700',  bg: 'bg-amber-100' },
  600:  { label: '600+',   color: 'text-green-700',  bg: 'bg-green-100' },
  800:  { label: '800+',   color: 'text-teal-700',   bg: 'bg-teal-100' },
  990:  { label: '990+',   color: 'text-purple-700', bg: 'bg-purple-100' },
};

const LEARN_MODES = [
  { id: 0, label: 'Danh sách', icon: BookOpen },
  { id: 1, label: 'Flashcard', icon: Layers },
  { id: 2, label: 'Trắc nghiệm', icon: Brain },
  { id: 3, label: 'Ghép cặp', icon: Puzzle },
  { id: 4, label: 'Điền từ', icon: PenSquare },
  { id: 5, label: 'Nghe chọn từ', icon: Headphones },
  { id: 6, label: 'Sắp chữ', icon: Type },
  { id: 7, label: '60 giây', icon: Timer },
  { id: 8, label: 'Lật ô nhớ', icon: Grid3X3 },
];

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface DictMeaning {
  partOfSpeech: string;
  definitions: Array<{
    definition: string;
    definitionVi: string;
    example?: string;
    synonyms?: string[];
  }>;
}

interface DictResult {
  word: string;
  phonetic?: string;
  audioUrl?: string;
  meanings: DictMeaning[];
}

interface WordCardProps {
  word: VocabularyModel;
  isPlaying: boolean;
  onPlay: (url: string, id: string) => void;
  onWordClick: (word: VocabularyModel) => void;
}

function WordCard({ word, isPlaying, onPlay, onWordClick }: WordCardProps) {
  const score = SCORE_LABELS[word.score_level] || SCORE_LABELS[0];
  return (
    <div
      onClick={() => onWordClick(word)}
      className="group relative bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer"
    >  <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="text-base font-bold text-primary">{word.word}</h4>
            <span className="text-xs font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{word.phonetic || '—'}</span>
            {word.word_class && (
              <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">{word.word_class}</span>
            )}
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${score.bg} ${score.color}`}>
              {score.label}
            </span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{word.definition}</p>
          {word.lesson > 0 && (
            <p className="text-xs text-slate-400 mt-1.5">Bài {word.lesson}</p>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (word.audio_url) onPlay(word.audio_url, word.id);
          }}
          disabled={!word.audio_url}
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
            isPlaying
              ? 'bg-red-100 text-red-500 shadow-sm'
              : word.audio_url
                ? 'bg-slate-50 text-slate-400 hover:bg-primary hover:text-white group-hover:bg-primary group-hover:text-white'
                : 'bg-slate-50 text-slate-300 cursor-not-allowed'
          }`}
        >
          {isPlaying ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}

function DictionaryCard({ result }: { result: DictResult }) {
  const [playing, setPlaying] = useState(false);
  const [expandedDef, setExpandedDef] = useState<number | null>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = () => {
    if (!result.audioUrl) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(result.audioUrl);
    audioRef.current = audio;
    audio.play().catch(() => {});
    setPlaying(true);
    audio.onended = () => setPlaying(false);
    audio.onerror = () => setPlaying(false);
  };

  const posColors: Record<string, string> = {
    noun: 'bg-blue-50 text-blue-700',
    verb: 'bg-green-50 text-green-700',
    adjective: 'bg-purple-50 text-purple-700',
    adverb: 'bg-orange-50 text-orange-700',
    pronoun: 'bg-pink-50 text-pink-700',
    preposition: 'bg-teal-50 text-teal-700',
    conjunction: 'bg-primary/10 text-primary',
    interjection: 'bg-yellow-50 text-yellow-700',
    determiner: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-linear-to-br from-primary via-primary to-teal-600 p-6 text-white relative overflow-hidden">
        
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 right-16 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-medium text-teal-200 uppercase tracking-wider">English Dictionary</span>
          </div>
          <h3 className="text-3xl font-black text-white mb-1">{result.word}</h3>
          {result.phonetic && (
            <p className="text-teal-200 font-mono text-sm mb-3">{result.phonetic}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={playAudio}
              disabled={!result.audioUrl}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                playing
                  ? 'bg-white/30 text-white'
                  : result.audioUrl
                    ? 'bg-white/20 text-white hover:bg-white/30'
                    : 'bg-white/10 text-white/50 cursor-not-allowed'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span>{playing ? 'Đang phát...' : 'Phát âm'}</span>
            </button>
            <span className="text-xs text-teal-200">
              {result.meanings.length} nghĩa
            </span>
          </div>
        </div>
      </div>

      {/* Meanings */}
      <div className="divide-y divide-slate-100">
        {result.meanings.map((meaning, mi) => {
          const posColor = posColors[meaning.partOfSpeech.toLowerCase()] || 'bg-slate-50 text-slate-600';
          const posIcon: Record<string, string> = {
            noun: 'n.',
            verb: 'v.',
            adjective: 'adj.',
            adverb: 'adv.',
            pronoun: 'pron.',
            preposition: 'prep.',
            conjunction: 'conj.',
            interjection: 'interj.',
            determiner: 'det.',
          };

          return (
            <div key={mi} className="p-4">
              {/* POS Header */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${posColor}`}>
                  {posIcon[meaning.partOfSpeech.toLowerCase()] || meaning.partOfSpeech}
                </span>
                <span className={`text-xs font-semibold ${posColor}`}>{meaning.partOfSpeech}</span>
              </div>

              {/* Definitions */}
              <div className="space-y-2">
                {meaning.definitions.slice(0, 3).map((def, di) => {
                  const globalIdx = mi * 10 + di;
                  const isOpen = expandedDef === globalIdx;
                  return (
                    <div key={di} className="group/def">
                      <button
                        onClick={() => setExpandedDef(isOpen ? null : globalIdx)}
                        className="w-full text-left rounded-xl p-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {di + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-800 leading-snug">{def.definition}</p>
                            <p className="text-sm text-teal-700 font-medium leading-snug mt-0.5">{def.definitionVi}</p>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 mt-0.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {isOpen && (
                        <div className="ml-8 pl-2 border-l-2 border-primary/20 space-y-2 pt-1">
                          {def.example && (
                            <div className="bg-amber-50 rounded-lg p-2.5">
                              <p className="text-xs font-semibold text-amber-700 mb-1 uppercase tracking-wide">Ví dụ</p>
                              <p className="text-sm text-slate-700 italic leading-relaxed">&quot;{def.example}&quot;</p>
                            </div>
                          )}
                          {def.synonyms && def.synonyms.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {def.synonyms.slice(0, 6).map((syn, si) => (
                                <span key={si} className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-medium hover:bg-primary hover:text-white transition-colors cursor-pointer">
                                  {syn}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {meaning.definitions.length > 3 && (
                  <button
                    onClick={() => setExpandedDef(mi * 10)}
                    className="text-xs text-primary font-medium hover:underline ml-8"
                  >
                    +{meaning.definitions.length - 3} nghĩa khác
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function VocabularyPage() {
  const [tab, setTab] = useState<'dictionary' | 'learn'>('dictionary');
  const [words, setWords] = useState<VocabularyModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [lessonFilter, setLessonFilter] = useState<number | 'all'>('all');
  const [scoreFilter, setScoreFilter] = useState<number | 'all'>('all');
  const [lessons, setLessons] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [playingWordId, setPlayingWordId] = useState<string | null>(null);
  const [dictResult, setDictResult] = useState<DictResult | null>(null);
  const [dictLoading, setDictLoading] = useState(false);
  const [dictError, setDictError] = useState('');
  const [selectedWord, setSelectedWord] = useState<VocabularyModel | null>(null);
  const [selectedDictResult, setSelectedDictResult] = useState<DictResult | null>(null);
  const [selectedDictLoading, setSelectedDictLoading] = useState(false);
  const [learnMode, setLearnMode] = useState(0);
  const [englishToVietnamese, setEnglishToVietnamese] = useState(true);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const PAGE_SIZE = 20;
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search for dictionary lookup
  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    const trimmed = value.trim();
    if (!trimmed) {
      setDictResult(null);
      setDictError('');
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      await lookupWord(trimmed);
    }, 600);
  };

  const lookupWord = async (word: string) => {
    setDictLoading(true);
    setDictError('');
    setDictResult(null);
    try {
      const res = await fetch(`/api/dictionary?word=${encodeURIComponent(word)}`);
      const data = await res.json();
      if (res.ok && data.word) {
        setDictResult(data);
      } else {
        setDictError(data.error || 'Không tìm thấy từ này');
      }
    } catch {
      setDictError('Lỗi kết nối, vui lòng thử lại');
    } finally {
      setDictLoading(false);
    }
  };

  const handleWordClick = async (word: VocabularyModel) => {
    setSelectedWord(word);
    setSelectedDictResult(null);
    setSelectedDictLoading(true);
    try {
      const res = await fetch(`/api/dictionary?word=${encodeURIComponent(word.word)}`);
      const data = await res.json();
      if (res.ok && data.word) {
        setSelectedDictResult(data);
      } else {
        // fallback: show basic info from DB
        setSelectedDictResult({
          word: word.word,
          phonetic: word.phonetic,
          audioUrl: word.audio_url,
          meanings: [{
            partOfSpeech: word.word_class || 'unknown',
            definitions: [{
              definition: word.definition,
              definitionVi: '',
            }],
          }],
        });
      }
    } catch {
      setSelectedDictResult({
        word: word.word,
        phonetic: word.phonetic,
        audioUrl: word.audio_url,
        meanings: [{
          partOfSpeech: word.word_class || 'unknown',
          definitions: [{
            definition: word.definition,
            definitionVi: '',
          }],
        }],
      });
    } finally {
      setSelectedDictLoading(false);
    }
  };

  // Load vocabulary from DB
  useEffect(() => {
    async function init() {
      try {
        const ls = await getLessonNumbers();
        setLessons(ls);
        if (ls.length > 0) {
          setLessonFilter(prev => (prev === 'all' ? ls[0] : prev));
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
          scoreFilter === 'all' ? undefined : scoreFilter,
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
  }, [lessonFilter, scoreFilter, search, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const playWordAudio = (url: string, wordId: string) => {
    if (playingWordId === wordId) {
      setPlayingWordId(null);
      return;
    }
    setPlayingWordId(wordId);
    const audio = new Audio(url);
    audio.play().catch(() => {});
    audio.onended = () => setPlayingWordId(null);
    audio.onerror = () => setPlayingWordId(null);
  };

  return (
    <div className="pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-linear-to-br from-primary to-teal-500 rounded-xl flex items-center justify-center shadow-md">
          <BookMarked className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Từ vựng & Từ điển</h1>
          <p className="text-sm text-slate-500">
            {tab === 'dictionary' ? 'Tra cứu từ điển chuyên nghiệp' : `${total} từ trong ngân hàng`}
          </p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-6 w-fit border-2 border-primary/45">
        <button
          onClick={() => setTab('dictionary')}
          className={`cursor-pointer flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            tab === 'dictionary'
              ? 'bg-white text-primary shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Globe className="w-4 h-4" />
          Từ điển
        </button>
        <button
          onClick={() => setTab('learn')}
          className={`cursor-pointer flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            tab === 'learn'
              ? 'bg-white text-primary shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Học từ vựng
        </button>
      </div>

      {/* Dictionary Tab */}
      {tab === 'dictionary' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              {dictLoading ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : (
                <Search className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <input
              type="text"
              placeholder="Nhập từ tiếng Anh để tra cứu..."
              value={searchInput}
              onChange={e => handleSearchInput(e.target.value)}
              autoFocus
              className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(''); setDictResult(null); setDictError(''); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>

          {/* Dictionary Result */}
          {dictLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-slate-500">Đang tra từ điển...</p>
              </div>
            </div>
          )}

          {dictError && !dictLoading && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500 font-medium">{dictError}</p>
              <p className="text-xs text-slate-400 mt-1">Thử nhập một từ khác</p>
            </div>
          )}

          {dictResult && <DictionaryCard result={dictResult} />}

          {!dictResult && !dictLoading && !dictError && (
            <div className="bg-linear-to-br from-slate-50 to-blue-50 rounded-2xl border border-slate-200 p-8 text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Tra từ ngay</h3>
              <p className="text-sm text-slate-500">Nhập từ bất kỳ để xem nghĩa, phiên âm, ví dụ và phát âm</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {['example', 'beautiful', 'knowledge', 'opportunity', 'environment'].map(w => (
                  <button
                    key={w}
                    onClick={() => handleSearchInput(w)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:border-primary hover:text-primary transition-colors"
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Learn Tab */}
      {tab === 'learn' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm từ vựng..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilterPanel(v => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-primary/30 rounded-xl text-xs font-semibold text-primary"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Bộ lọc
            </button>
            <div className="text-xs text-slate-500">
              Bài {lessonFilter === 'all' ? 'tất cả' : lessonFilter} • {scoreFilter === 'all' ? 'mọi mức' : `${scoreFilter}+`}
            </div>
          </div>

          {showFilterPanel && (
            <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Lọc theo bài</p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <button
                    onClick={() => { setLessonFilter('all'); setPage(0); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                      lessonFilter === 'all'
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tất cả bài
                  </button>
                  {lessons.map(lesson => (
                    <button
                      key={lesson}
                      onClick={() => { setLessonFilter(lesson); setPage(0); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                        lessonFilter === lesson
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Bài {lesson}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Lọc theo điểm</p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => { setScoreFilter('all'); setPage(0); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      scoreFilter === 'all'
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Mọi cấp
                  </button>
                  {[450, 600, 800, 990].map(level => (
                    <button
                      key={level}
                      onClick={() => { setScoreFilter(level); setPage(0); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        scoreFilter === level
                          ? `${SCORE_LABELS[level].bg} ${SCORE_LABELS[level].color} ring-2 ring-offset-1 ring-current`
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {SCORE_LABELS[level].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl p-2">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {LEARN_MODES.map(mode => {
                const Icon = mode.icon;
                const active = learnMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setLearnMode(mode.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                      active
                        ? 'bg-primary text-white shadow'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {mode.label}
                  </button>
                );
              })}
            </div>

            {learnMode !== 0 && (
              <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  {englishToVietnamese ? 'Chế độ EN -> VI' : 'Chế độ VI -> EN'}
                </span>
                <button
                  onClick={() => setEnglishToVietnamese(v => !v)}
                  className="text-xs px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-primary font-bold"
                >
                  Đổi
                </button>
              </div>
            )}
          </div>

          {/* Word count */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {total > 0 ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} trong ${total} từ` : 'Không có kết quả'}
            </p>
          </div>

          {/* Word List / Games */}
          {learnMode === 0 && loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-4 w-20 bg-slate-100 rounded" />
                        <div className="h-3 w-12 bg-slate-100 rounded" />
                      </div>
                      <div className="h-3 w-3/4 bg-slate-100 rounded" />
                    </div>
                    <div className="w-9 h-9 bg-slate-100 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : learnMode === 0 && words.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
              <Bookmark className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Không tìm thấy từ vựng nào</p>
            </div>
          ) : learnMode === 0 ? (
            <div className="space-y-2">
              {words.map(word => (
                <WordCard
                  key={word.id}
                  word={word}
                  isPlaying={playingWordId === word.id}
                  onPlay={playWordAudio}
                  onWordClick={handleWordClick}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              {learnMode === 1 && (
                <LearnFlashcardMode
                  key={`flash-${words.length}-${englishToVietnamese}`}
                  words={words}
                  englishToVietnamese={englishToVietnamese}
                />
              )}
              {learnMode === 2 && (
                <LearnQuizMode
                  key={`quiz-${words.length}-${englishToVietnamese}`}
                  words={words}
                  englishToVietnamese={englishToVietnamese}
                />
              )}
              {learnMode === 3 && (
                <LearnMatchingMode
                  key={`match-${words.length}`}
                  words={words}
                />
              )}
              {learnMode === 4 && (
                <LearnFillBlankMode
                  key={`fill-${words.length}-${englishToVietnamese}`}
                  words={words}
                  englishToVietnamese={englishToVietnamese}
                />
              )}
              {learnMode === 5 && (
                <LearnListeningMode
                  key={`listen-${words.length}`}
                  words={words}
                />
              )}
              {learnMode === 6 && (
                <LearnSpellingMode
                  key={`spell-${words.length}-${englishToVietnamese}`}
                  words={words}
                  englishToVietnamese={englishToVietnamese}
                />
              )}
              {learnMode === 7 && (
                <LearnSpeedMode
                  key={`speed-${words.length}-${englishToVietnamese}`}
                  words={words}
                  englishToVietnamese={englishToVietnamese}
                />
              )}
              {learnMode === 8 && (
                <LearnMemoryMode
                  key={`memory-${words.length}`}
                  words={words}
                />
              )}
            </div>
          )}

          {/* Pagination */}
          {learnMode === 0 && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Trước
              </button>

              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1">
                  {(() => {
                    const pages: (number | '...')[] = [];
                    if (totalPages <= 7) {
                      for (let i = 0; i < totalPages; i++) pages.push(i);
                    } else {
                      pages.push(0);
                      if (page > 2) pages.push('...');
                      for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) pages.push(i);
                      if (page < totalPages - 3) pages.push('...');
                      pages.push(totalPages - 1);
                    }
                    return pages.map((p, idx) =>
                      p === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 text-sm">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p as number)}
                          className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                            page === p
                              ? 'bg-primary text-white shadow-sm'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {(p as number) + 1}
                        </button>
                      )
                    );
                  })()}
                </div>
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white border border-primary rounded-xl text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary-dark transition-colors"
              >
                Sau
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Word Detail Modal */}
      {selectedWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setSelectedWord(null); setSelectedDictResult(null); }}
          />

          {/* Content */}
          <div className="relative z-10 w-full max-w-lg max-h-[90vh]">
            <div className="max-h-[90vh] overflow-y-auto scrollbar-hide">
              {selectedDictLoading ? (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-12 flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-slate-500 font-medium">Đang tra từ &quot;{selectedWord.word}&quot;...</p>
                </div>
              ) : selectedDictResult ? (
                <>
                  <WordDetailCard
                    result={selectedDictResult}
                    onClose={() => { setSelectedWord(null); setSelectedDictResult(null); }}
                  />
                  <div className="text-center mt-2">
                    <p className="text-xs text-slate-400">Nguồn: DictionaryAPI.dev</p>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LearnFlashcardMode({
  words,
  englishToVietnamese,
}: {
  words: VocabularyModel[];
  englishToVietnamese: boolean;
}) {
  const [deck, setDeck] = useState<VocabularyModel[]>(() => shuffle(words));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [unknown, setUnknown] = useState(0);
  const [trackProgress, setTrackProgress] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [audioPlaying, setAudioPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dictAudioCacheRef = useRef<Record<string, string>>({});
  const dictAudioNoResultRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    if (!autoPlay) return;
    autoTimerRef.current = setInterval(() => {
      setFlipped(v => !v);
    }, 3000);
    return () => {
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
  }, [autoPlay]);

  useEffect(() => {
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const current = deck[index % Math.max(1, deck.length)];

  const goNext = () => {
    if (deck.length <= 1) return;
    setIndex(i => (i + 1) % deck.length);
    setFlipped(false);
    setShowHint(false);
  };

  const goPrev = () => {
    if (deck.length <= 1) return;
    setIndex(i => (i - 1 + deck.length) % deck.length);
    setFlipped(false);
    setShowHint(false);
  };

  const markKnown = () => {
    if (deck.length === 0) return;
    setKnown(v => v + 1);
    goNext();
  };

  const markUnknown = () => {
    if (deck.length === 0 || !current) return;
    setUnknown(v => v + 1);
    setDeck(prev => {
      const nextDeck = [...prev];
      const currentPos = index % nextDeck.length;
      const [card] = nextDeck.splice(currentPos, 1);
      if (!card) return nextDeck;
      const insertPos = Math.min(currentPos + 2, nextDeck.length);
      nextDeck.splice(insertPos, 0, card);
      return nextDeck;
    });
    setFlipped(false);
    setShowHint(false);
    setIndex(i => (i + 1) % Math.max(1, deck.length));
  };

  const resolveAudioUrlForWord = async (word: string, localUrl?: string) => {
    const fromLocal = (localUrl || '').trim();
    if (fromLocal) return fromLocal;

    const key = word.trim().toLowerCase();
    if (!key) return '';
    if (dictAudioCacheRef.current[key]) return dictAudioCacheRef.current[key];
    if (dictAudioNoResultRef.current.has(key)) return '';

    try {
      const res = await fetch(`/api/dictionary?word=${encodeURIComponent(word)}`);
      const data = await res.json();
      const url = (data?.audioUrl || '').trim();
      if (url) {
        dictAudioCacheRef.current[key] = url;
        return url;
      }
      dictAudioNoResultRef.current.add(key);
      return '';
    } catch {
      return '';
    }
  };

  const playAudio = async () => {
    if (!current) return;
    const url = await resolveAudioUrlForWord(current.word, current.audio_url);
    if (!url) return;

    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioPlaying(false);
      return;
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setAudioPlaying(false);
    audio.onerror = () => setAudioPlaying(false);
    try {
      setAudioPlaying(true);
      await audio.play();
    } catch {
      setAudioPlaying(false);
    }
  };

  if (!current) return <p className="text-sm text-slate-500">Không có dữ liệu flashcard.</p>;

  const front = englishToVietnamese ? current.word : current.definition;
  const back = englishToVietnamese ? current.definition : current.word;
  const hint = current.phonetic?.trim() || `Bài ${current.lesson} · ${current.score_level}`;
  const isFavorite = favorites.has(current.id);

  return (
    <div className="space-y-3">
      <div className={`mx-auto ${fullscreen ? 'max-w-6xl' : 'max-w-5xl'}`}>
        <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setFlipped(v => !v)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setFlipped(v => !v);
              }
            }}
            className={`w-full p-4 md:p-5 ${fullscreen ? 'min-h-105' : 'min-h-75 md:min-h-90'} bg-[#F9F9F9] text-left cursor-pointer`}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHint(v => !v);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500"
              >
                <Lightbulb className="w-4 h-4" />
                Hiển thị gợi ý
              </button>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void playAudio();
                  }}
                  className="w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-500 flex items-center justify-center"
                >
                  <Volume2 className={`w-4 h-4 ${audioPlaying ? 'animate-pulse text-primary' : ''}`} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFavorites(prev => {
                      const next = new Set(prev);
                      if (next.has(current.id)) next.delete(current.id);
                      else next.add(current.id);
                      return next;
                    });
                  }}
                  className="w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-500 flex items-center justify-center"
                >
                  <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
                </button>
              </div>
            </div>

            {showHint && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                {hint}
              </div>
            )}

            <div className="mt-2 flex min-h-55 md:min-h-65 items-center justify-center px-2 perspective-[1400px]">
              <div
                className="relative h-44 md:h-56 w-full max-w-4xl transition-transform duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)]"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  willChange: 'transform',
                }}
              >
                <div
                  className="absolute inset-0 flex items-center justify-center px-2"
                  style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                >
                  <p className="text-center font-semibold leading-tight text-3xl md:text-4xl text-slate-800">
                    {front}
                  </p>
                </div>
                <div
                  className="absolute inset-0 flex items-center justify-center px-2"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <p className="text-center font-semibold leading-tight text-2xl md:text-3xl text-slate-800">
                    {back}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary px-4 py-3 text-center text-sm font-medium text-white">Nhấp vào thẻ để lật</div>
        </div>

        <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex items-center gap-2 text-xs text-slate-600 md:flex-1">
            <span>Theo dõi tiến độ</span>
            <button
              onClick={() => setTrackProgress(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${trackProgress ? 'bg-primary' : 'bg-slate-300'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${trackProgress ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={goPrev}
              className="w-9 h-9 rounded-full border border-slate-200 bg-white text-slate-600 flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goNext}
              className="w-9 h-9 rounded-full border border-slate-200 bg-white text-slate-600 flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 md:flex-1">
            <button
              onClick={() => setAutoPlay(v => !v)}
              className="w-9 h-9 rounded-full border border-slate-200 bg-white text-slate-600 flex items-center justify-center"
            >
              {autoPlay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setFullscreen(v => !v)}
              className="w-9 h-9 rounded-full border border-slate-200 bg-white text-slate-600 flex items-center justify-center"
            >
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {trackProgress && (
          <div className="mt-2 flex items-center justify-center gap-4 text-xs">
            <span className="text-slate-500">Thẻ {Math.min(index + 1, deck.length)}/{deck.length}</span>
            <span className="text-primary">Đã nhớ {known}</span>
            <span className="text-red-500">Chưa nhớ {unknown}</span>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={markUnknown}
            className="h-10 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
          >
            Không nhớ
          </button>
          <button
            onClick={markKnown}
            className="h-10 rounded-xl bg-primary text-sm font-semibold text-white"
          >
            Đã nhớ
          </button>
        </div>
      </div>
    </div>
  );
}

function LearnQuizMode({
  words,
  englishToVietnamese,
}: {
  words: VocabularyModel[];
  englishToVietnamese: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const current = words[index];
  const options = useMemo(() => {
    if (!current) return [] as string[];
    if (englishToVietnamese) {
      const others = shuffle(words.filter(w => w.id !== current.id).map(w => w.definition)).slice(0, 3);
      return shuffle([current.definition, ...others]);
    }
    const others = shuffle(words.filter(w => w.id !== current.id).map(w => w.word)).slice(0, 3);
    return shuffle([current.word, ...others]);
  }, [current, words, englishToVietnamese]);

  if (!current) return <p className="text-sm text-slate-500">Không có dữ liệu.</p>;

  if (done) {
    const pct = words.length ? Math.round((correct / words.length) * 100) : 0;
    return (
      <div className="text-center py-8">
        <p className="text-5xl font-black text-primary">{pct}%</p>
        <p className="text-sm text-slate-600 mt-1">{correct}/{words.length} câu đúng</p>
      </div>
    );
  }

  const answer = englishToVietnamese ? current.definition : current.word;

  return (
    <div className="space-y-3">
      <div className="text-xs text-slate-500 font-semibold">{index + 1}/{words.length}</div>
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <p className="text-xs text-slate-500 mb-1">{englishToVietnamese ? 'Chọn nghĩa đúng:' : 'Chọn từ đúng:'}</p>
        <p className="text-lg font-bold text-primary">{englishToVietnamese ? current.word : current.definition}</p>
      </div>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const isCorrect = opt === answer;
          const isSelected = selected === i;
          return (
            <button
              key={`${opt}-${i}`}
              onClick={() => {
                if (selected !== null) return;
                setSelected(i);
                if (isCorrect) setCorrect(v => v + 1);
              }}
              className={`w-full text-left rounded-xl border p-3 text-sm ${
                selected === null
                  ? 'bg-white border-slate-200'
                  : isCorrect
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : isSelected
                      ? 'bg-red-50 border-red-300 text-red-700'
                      : 'bg-white border-slate-200 opacity-60'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <button
          onClick={() => {
            if (index >= words.length - 1) {
              setDone(true);
            } else {
              setIndex(i => i + 1);
              setSelected(null);
            }
          }}
          className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold"
        >
          {index >= words.length - 1 ? 'Xem kết quả' : 'Câu tiếp'}
        </button>
      )}
    </div>
  );
}

function LearnMatchingMode({ words }: { words: VocabularyModel[] }) {
  const pairs = useMemo(() => shuffle(words).slice(0, Math.min(6, words.length)), [words]);
  const right = useMemo(() => shuffle(pairs.map(p => ({ id: p.id, text: p.definition }))), [pairs]);
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-2">
        {pairs.map(item => {
          const isMatched = matched.has(item.id);
          const isSelected = selected === item.id;
          return (
            <button
              key={item.id}
              disabled={isMatched}
              onClick={() => setSelected(item.id)}
              className={`w-full text-left rounded-xl border p-3 text-sm font-semibold ${
                isMatched
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : isSelected
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              {item.word}
            </button>
          );
        })}
      </div>
      <div className="space-y-2">
        {right.map(item => {
          const isMatched = matched.has(item.id);
          return (
            <button
              key={item.id}
              disabled={!selected || isMatched}
              onClick={() => {
                if (!selected) return;
                if (selected === item.id) {
                  setMatched(prev => new Set(prev).add(item.id));
                }
                setSelected(null);
              }}
              className={`w-full text-left rounded-xl border p-3 text-sm ${
                isMatched
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              {item.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LearnFillBlankMode({
  words,
  englishToVietnamese,
}: {
  words: VocabularyModel[];
  englishToVietnamese: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState('');
  const [checked, setChecked] = useState(false);
  const item = words[index];
  if (!item) return <p className="text-sm text-slate-500">Không có dữ liệu.</p>;

  const answer = (englishToVietnamese ? item.definition : item.word).trim().toLowerCase();
  const prompt = englishToVietnamese ? item.word : item.definition;
  const ok = value.trim().toLowerCase() === answer;

  return (
    <div className="space-y-3">
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <p className="text-xs text-slate-500 mb-1">Điền đáp án cho:</p>
        <p className="text-lg font-bold text-primary">{prompt}</p>
      </div>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary/50"
        placeholder="Nhập đáp án..."
      />
      <div className="flex gap-2">
        <button onClick={() => setChecked(true)} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold">Kiểm tra</button>
        <button
          onClick={() => {
            setIndex(i => (i + 1) % words.length);
            setValue('');
            setChecked(false);
          }}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
        >
          Từ tiếp
        </button>
      </div>
      {checked && (
        <p className={`text-sm font-semibold ${ok ? 'text-green-600' : 'text-red-600'}`}>
          {ok ? 'Chính xác' : `Chưa đúng. Đáp án: ${englishToVietnamese ? item.definition : item.word}`}
        </p>
      )}
    </div>
  );
}

function LearnListeningMode({ words }: { words: VocabularyModel[] }) {
  const audioWords = useMemo(() => words.filter(w => !!w.audio_url), [words]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const item = audioWords[index];

  const options = useMemo(() => {
    if (!item) return [] as string[];
    const others = shuffle(words.filter(w => w.id !== item.id).map(w => w.word)).slice(0, 3);
    return shuffle([item.word, ...others]);
  }, [item, words]);

  if (!item) return <p className="text-sm text-slate-500">Không có từ có audio.</p>;

  return (
    <div className="space-y-3">
      <button
        onClick={() => {
          const audio = new Audio(item.audio_url);
          audio.play().catch(() => {});
        }}
        className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center"
      >
        <Volume2 className="w-6 h-6" />
      </button>
      <div className="space-y-2">
        {options.map(opt => {
          const isCorrect = opt === item.word;
          const chosen = selected === opt;
          return (
            <button
              key={opt}
              onClick={() => setSelected(opt)}
              className={`w-full text-left rounded-xl border p-3 text-sm ${
                selected == null
                  ? 'bg-white border-slate-200'
                  : isCorrect
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : chosen
                      ? 'bg-red-50 border-red-300 text-red-700'
                      : 'bg-white border-slate-200 opacity-60'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => {
          setIndex(i => (i + 1) % audioWords.length);
          setSelected(null);
        }}
        className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold"
      >
        Câu tiếp
      </button>
    </div>
  );
}

function LearnSpellingMode({
  words,
  englishToVietnamese,
}: {
  words: VocabularyModel[];
  englishToVietnamese: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState('');
  const [checked, setChecked] = useState(false);
  const item = words[index];
  const target = (englishToVietnamese ? item?.word : item?.definition)?.trim() ?? '';
  const scrambled = useMemo(() => shuffle(target.split('')).join(' '), [target]);
  if (!item) return <p className="text-sm text-slate-500">Không có dữ liệu.</p>;
  const ok = value.trim().toLowerCase() === target.toLowerCase();

  return (
    <div className="space-y-3">
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <p className="text-xs text-slate-500 mb-1">Gợi ý</p>
        <p className="text-sm font-semibold text-slate-700 mb-2">{englishToVietnamese ? item.definition : item.word}</p>
        <p className="text-base font-bold text-primary tracking-[0.18em]">{scrambled}</p>
      </div>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Nhập từ đúng"
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary/50"
      />
      <div className="flex gap-2">
        <button onClick={() => setChecked(true)} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold">Kiểm tra</button>
        <button
          onClick={() => {
            setIndex(i => (i + 1) % words.length);
            setValue('');
            setChecked(false);
          }}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
        >
          Từ tiếp
        </button>
      </div>
      {checked && <p className={`text-sm font-semibold ${ok ? 'text-green-600' : 'text-red-600'}`}>{ok ? 'Đúng' : `Đáp án: ${target}`}</p>}
    </div>
  );
}

function LearnSpeedMode({
  words,
  englishToVietnamese,
}: {
  words: VocabularyModel[];
  englishToVietnamese: boolean;
}) {
  const [seconds, setSeconds] = useState(60);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setDone(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const item = words[index % Math.max(1, words.length)];
  const options = useMemo(() => {
    if (!item) return [] as string[];
    if (englishToVietnamese) {
      const others = shuffle(words.filter(w => w.id !== item.id).map(w => w.definition)).slice(0, 3);
      return shuffle([item.definition, ...others]);
    }
    const others = shuffle(words.filter(w => w.id !== item.id).map(w => w.word)).slice(0, 3);
    return shuffle([item.word, ...others]);
  }, [item, words, englishToVietnamese]);

  if (!item) return <p className="text-sm text-slate-500">Không có dữ liệu.</p>;

  if (done) {
    return (
      <div className="text-center py-8">
        <p className="text-4xl font-black text-primary">{score}</p>
        <p className="text-sm text-slate-600">Điểm trong 60 giây</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span className="text-primary">{seconds}s</span>
        <span className="text-slate-600">Điểm: {score}</span>
      </div>
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <p className="text-lg font-bold text-primary">{englishToVietnamese ? item.word : item.definition}</p>
      </div>
      <div className="space-y-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => {
              const ok = englishToVietnamese ? opt === item.definition : opt === item.word;
              if (ok) setScore(s => s + 1);
              setIndex(i => i + 1);
            }}
            className="w-full text-left rounded-xl border border-slate-200 bg-white p-3 text-sm hover:border-primary/40"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function LearnMemoryMode({ words }: { words: VocabularyModel[] }) {
  const base = useMemo(() => shuffle(words).slice(0, Math.min(6, words.length)), [words]);
  const cards = useMemo(
    () =>
      shuffle(
        base.flatMap(w => [
          { id: `${w.id}-w`, pairId: w.id, label: w.word },
          { id: `${w.id}-d`, pairId: w.id, label: w.definition },
        ]),
      ),
    [base],
  );

  const [opened, setOpened] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {cards.map(card => {
        const isOpen = opened.includes(card.id) || matched.has(card.pairId);
        return (
          <button
            key={card.id}
            onClick={() => {
              if (isOpen || opened.length === 2) return;
              if (opened.length === 0) {
                setOpened([card.id]);
                return;
              }
              const first = cards.find(c => c.id === opened[0]);
              if (!first) {
                setOpened([card.id]);
                return;
              }
              if (first.pairId === card.pairId) {
                setMatched(prev => new Set(prev).add(card.pairId));
                setOpened([]);
                return;
              }
              setOpened([card.id]);
            }}
            className={`h-24 rounded-xl border p-2 text-xs transition ${
              isOpen ? 'bg-white border-primary/40 text-slate-700' : 'bg-primary/10 border-primary/20 text-transparent'
            }`}
          >
            {isOpen ? card.label : 'Lexii'}
          </button>
        );
      })}
    </div>
  );
}
