'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  BookOpen,
  Volume2,
  Search,
  Star,
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
  ArrowRight,
  StarHalf,
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

function DictionaryCard({ result, onClose }: { result: DictResult; onClose: () => void }) {
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
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>
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
                              <p className="text-sm text-slate-700 italic leading-relaxed">"{def.example}"</p>
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
          <h1 className="text-xl font-bold text-slate-800">Từ vựng & Ngữ pháp</h1>
          <p className="text-sm text-slate-500">
            {tab === 'dictionary' ? 'Tra cứu từ điển chuyên nghiệp' : `${total} từ trong ngân hàng`}
          </p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-6 w-fit">
        <button
          onClick={() => setTab('dictionary')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
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
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
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

          {dictResult && <DictionaryCard result={dictResult} onClose={() => { setDictResult(null); setSearchInput(''); }} />}

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

          {/* Filter pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => { setLessonFilter('all'); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                lessonFilter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
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
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Bài {lesson}
              </button>
            ))}
          </div>

          {/* Score filter */}
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

          {/* Word count */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {total > 0 ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} trong ${total} từ` : 'Không có kết quả'}
            </p>
          </div>

          {/* Word List */}
          {loading ? (
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
          ) : words.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
              <Bookmark className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Không tìm thấy từ vựng nào</p>
            </div>
          ) : (
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
          )}

          {/* Pagination */}
          {totalPages > 1 && (
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
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const pageNum = totalPages <= 7 ? i : Math.max(0, Math.min(page - 2 + i, totalPages - 1));
                  const displayPages = totalPages <= 7
                    ? [...Array(totalPages)].map((_, j) => j)
                    : [0, ...(page > 2 ? [page - 1] : []), page, ...(page < totalPages - 2 ? [page + 1] : []), totalPages - 1].filter((v, idx, arr) => arr.indexOf(v) === idx && v >= 0 && v < totalPages);
                  return null;
                })}
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
                  <p className="text-slate-500 font-medium">Đang tra từ "{selectedWord.word}"...</p>
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
