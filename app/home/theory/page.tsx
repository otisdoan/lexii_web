'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Volume2, Star, ChevronDown, ChevronLeft, ChevronRight, Search, CheckCircle, XCircle } from 'lucide-react';
import { getVocabulary, getGrammar, getLessonNumbers } from '@/lib/api';
import { WordDetailCard } from '@/components/WordDetailCard';
import type { VocabularyModel, GrammarModel } from '@/lib/types';
import type { DictResult } from '@/components/WordDetailCard';

const SCORE_LEVELS = ['Tất cả', '450+', '600+', '800+', '990+'];
const MODES = [
  'Danh sách',
  'Flashcard',
  'Trắc nghiệm',
  'Ghép cặp',
  'Điền từ',
  'Nghe chọn từ',
  'Sắp chữ',
  '60 giây',
  'Lật ô nhớ',
];

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function TheoryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'vocab' | 'grammar'>('vocab');

  return (
    <div className="w-full max-w-275 mx-auto pb-20 lg:pb-8 overflow-x-hidden">
      {/* Header */}
      <div className="bg-primary rounded-md">
        <div className="flex items-center px-4 py-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white flex-1 text-center pr-10">Lý thuyết</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white flex border-b border-slate-100">
        {(['vocab', 'grammar'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-bold text-center border-b-[3px] transition-colors ${
              activeTab === tab ? 'text-primary border-primary' : 'text-slate-500 border-transparent'
            }`}
          >
            {tab === 'vocab' ? 'Từ vựng' : 'Ngữ pháp'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'vocab' ? <VocabularyTab /> : <GrammarTab />}
    </div>
  );
}

// ── Vocabulary Tab ──────────────────────────────────────────────

// ── Vocabulary Tab ─────────────────────────────────────────────

function VocabularyTab() {
  const [lessons, setLessons] = useState<number[]>([1]);
  const [selectedLesson, setSelectedLesson] = useState(1);
  const [selectedScore, setSelectedScore] = useState('Tất cả');
  const [selectedMode, setSelectedMode] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [englishToVietnamese, setEnglishToVietnamese] = useState(true);
  const [words, setWords] = useState<VocabularyModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [playingWordId, setPlayingWordId] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<VocabularyModel | null>(null);
  const [selectedDictResult, setSelectedDictResult] = useState<DictResult | null>(null);
  const [selectedDictLoading, setSelectedDictLoading] = useState(false);

  // Flashcard state
  const [fcIndex, setFcIndex] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);

  // Quiz state
  const [qIndex, setQIndex] = useState(0);
  const [qSelected, setQSelected] = useState<number | null>(null);
  const [qCorrect, setQCorrect] = useState(0);
  const [qShowResult, setQShowResult] = useState(false);

  const filteredWords = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return words;
    return words.filter(w =>
      w.word.toLowerCase().includes(q) ||
      w.definition.toLowerCase().includes(q) ||
      (w.phonetic || '').toLowerCase().includes(q)
    );
  }, [words, searchInput]);

  useEffect(() => {
    getLessonNumbers().then(ls => {
      if (ls.length) setLessons(ls);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const scoreLevel = selectedScore === 'Tất cả' ? undefined : parseInt(selectedScore);
    setLoading(true);
    getVocabulary(selectedLesson, scoreLevel)
      .then(setWords)
      .catch(() => setWords([]))
      .finally(() => { setLoading(false); setFcIndex(0); setFcFlipped(false); setQIndex(0); setQSelected(null); setQCorrect(0); setQShowResult(false); });
  }, [selectedLesson, selectedScore]);

  useEffect(() => {
    if (filteredWords.length === 0) {
      setFcIndex(0);
      setQIndex(0);
      setQSelected(null);
      return;
    }
    if (fcIndex >= filteredWords.length) setFcIndex(0);
    if (qIndex >= filteredWords.length) setQIndex(0);
  }, [filteredWords, fcIndex, qIndex]);

  const toggleFav = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const playAudio = (url: string, id: string) => {
    if (playingWordId === id) {
      setPlayingWordId(null);
      return;
    }
    setPlayingWordId(id);
    const audio = new Audio(url);
    audio.play().catch(() => {});
    audio.onended = () => setPlayingWordId(null);
    audio.onerror = () => setPlayingWordId(null);
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
        setSelectedDictResult({
          word: word.word,
          phonetic: word.phonetic,
          audioUrl: word.audio_url,
          meanings: [{
            partOfSpeech: word.word_class || 'unknown',
            definitions: [{ definition: word.definition, definitionVi: '' }],
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
          definitions: [{ definition: word.definition, definitionVi: '' }],
        }],
      });
    } finally {
      setSelectedDictLoading(false);
    }
  };

  const word = filteredWords[fcIndex];

  // Quiz options
  const quizOptions = useMemo(() => {
    if (filteredWords.length === 0 || !word) return [];
    if (englishToVietnamese) {
      const correctDef = word.definition;
      const others = shuffle(filteredWords.filter(w => w.definition !== correctDef).map(w => w.definition)).slice(0, 3);
      return shuffle([correctDef, ...others]);
    }
    const correctWord = word.word;
    const others = shuffle(filteredWords.filter(w => w.word !== correctWord).map(w => w.word)).slice(0, 3);
    return shuffle([correctWord, ...others]);
  }, [filteredWords, word, englishToVietnamese]);

  const handleQuizPick = (i: number) => {
    if (qSelected !== null || !word) return;
    setQSelected(i);
    const isCorrect = englishToVietnamese
      ? quizOptions[i] === word.definition
      : quizOptions[i] === word.word;
    if (isCorrect) setQCorrect(c => c + 1);
  };

  const handleQuizNext = () => {
    if (qIndex < filteredWords.length - 1) {
      setQIndex(i => i + 1);
      setQSelected(null);
      setFcFlipped(false);
    } else {
      setQShowResult(true);
    }
  };

  const resetAll = () => {
    setFcIndex(0); setFcFlipped(false); setQIndex(0); setQSelected(null); setQCorrect(0); setQShowResult(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Header bar ── */}
      <div className="px-4 py-3 bg-white border-b border-slate-100">
        <div className="flex items-center justify-between gap-3">
          {/* Lesson pill */}
          <div className="relative">
            <button
              onClick={() => { setLessonOpen(!lessonOpen); setScoreOpen(false); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary/8 hover:bg-primary/12 rounded-xl transition-colors"
            >
              <span className="text-sm font-bold text-primary">Bài {selectedLesson}</span>
              <ChevronDown className={`w-4 h-4 text-primary transition-transform ${lessonOpen ? 'rotate-180' : ''}`} />
            </button>
            {lessonOpen && (
              <div className="absolute top-full left-0 mt-2 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 overflow-hidden">
                {lessons.map(l => (
                  <button key={l} onClick={() => { setSelectedLesson(l); setLessonOpen(false); resetAll(); }}
                    className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                      l === selectedLesson ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 hover:bg-slate-50'
                    }`}>
                    Bài {l}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Score pill */}
          <div className="relative">
            <button
              onClick={() => { setScoreOpen(!scoreOpen); setLessonOpen(false); }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-primary/30 rounded-xl transition-colors"
            >
              <span className="text-sm font-medium text-slate-600">{selectedScore}</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${scoreOpen ? 'rotate-180' : ''}`} />
            </button>
            {scoreOpen && (
              <div className="absolute top-full left-0 mt-2 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 overflow-hidden">
                {SCORE_LEVELS.map(s => (
                  <button key={s} onClick={() => { setSelectedScore(s); setScoreOpen(false); resetAll(); }}
                    className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                      s === selectedScore ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 hover:bg-slate-50'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Word count */}
          <div className="px-3 py-1.5 bg-slate-100 rounded-xl">
            <span className="text-xs font-semibold text-slate-500">{filteredWords.length} từ</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 bg-white border-b border-slate-100">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Tìm từ hoặc nghĩa..."
            className="w-full h-10 rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-primary/50"
          />
        </div>
      </div>

      {/* ── Mode selector ── */}
      <div className="px-4 py-3 bg-white border-b border-slate-100">
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {MODES.map((label, i) => (
            <button
              key={i}
              onClick={() => { setSelectedMode(i); resetAll(); }}
              className={`py-2.5 rounded-xl text-xs font-bold text-center transition-all duration-200 ${
                selectedMode === i
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {selectedMode !== 0 && (
          <div className="mt-3 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              {englishToVietnamese ? 'Chế độ EN -> VI' : 'Chế độ VI -> EN'}
            </span>
            <button
              onClick={() => {
                setEnglishToVietnamese(v => !v);
                resetAll();
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-primary font-bold"
            >
              Đổi
            </button>
          </div>
        )}
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-slate-100" />
            ))}
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Search className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm font-medium">Không có từ vựng</p>
          </div>
        ) : (
          <>
            {/* ── Mode 0: Vocab List ── */}
            {selectedMode === 0 && (
              <div className="p-3 space-y-2 pb-6">
                {filteredWords.map(w => (
                  <VocabWordCard
                    key={w.id}
                    word={w}
                    isPlaying={playingWordId === w.id}
                    isFav={favorites.has(w.id)}
                    onPlay={playAudio}
                    onFav={toggleFav}
                    onWordClick={handleWordClick}
                  />
                ))}
              </div>
            )}

            {/* ── Mode 1: Flashcards ── */}
            {selectedMode === 1 && word && (
              <FlashcardView
                word={word}
                index={fcIndex}
                total={filteredWords.length}
                isFlipped={fcFlipped}
                onFlip={() => setFcFlipped(!fcFlipped)}
                onPrev={() => { if (fcIndex > 0) { setFcIndex(i => i - 1); setFcFlipped(false); }}}
                onNext={() => { if (fcIndex < filteredWords.length - 1) { setFcIndex(i => i + 1); setFcFlipped(false); }}}
                onFav={toggleFav}
                isFav={word ? favorites.has(word.id) : false}
              />
            )}

            {/* ── Mode 2: Quiz ── */}
            {selectedMode === 2 && !qShowResult && word && (
              <QuizView
                word={word}
                options={quizOptions}
                mode={englishToVietnamese ? 3 : 2}
                index={qIndex}
                total={filteredWords.length}
                correct={qCorrect}
                selected={qSelected}
                onPick={handleQuizPick}
                onNext={handleQuizNext}
              />
            )}

            {/* ── Quiz Result ── */}
            {selectedMode === 2 && qShowResult && (
              <QuizResultView
                correct={qCorrect}
                total={filteredWords.length}
                onRetry={resetAll}
              />
            )}

            {selectedMode === 3 && (
              <MatchingMode key={`matching-${filteredWords.length}`} words={filteredWords} />
            )}

            {selectedMode === 4 && (
              <FillBlankMode
                key={`fill-${englishToVietnamese}-${filteredWords.length}`}
                words={filteredWords}
                englishToVietnamese={englishToVietnamese}
              />
            )}

            {selectedMode === 5 && (
              <ListeningMode key={`listen-${filteredWords.length}`} words={filteredWords} />
            )}

            {selectedMode === 6 && (
              <SpellingMode
                key={`spell-${englishToVietnamese}-${filteredWords.length}`}
                words={filteredWords}
                englishToVietnamese={englishToVietnamese}
              />
            )}

            {selectedMode === 7 && (
              <SpeedMode
                key={`speed-${englishToVietnamese}-${filteredWords.length}`}
                words={filteredWords}
                englishToVietnamese={englishToVietnamese}
              />
            )}

            {selectedMode === 8 && (
              <MemoryMode key={`memory-${filteredWords.length}`} words={filteredWords} />
            )}
          </>
        )}
      </div>

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

// ── Vocab Word Card ────────────────────────────────────────────

function VocabWordCard({ word, isPlaying, isFav, onPlay, onFav, onWordClick }: {
  word: VocabularyModel;
  isPlaying: boolean;
  isFav: boolean;
  onPlay: (url: string, id: string) => void;
  onFav: (id: string) => void;
  onWordClick: (word: VocabularyModel) => void;
}) {
  return (
    <div
      onClick={() => onWordClick(word)}
      className="bg-white rounded-2xl border border-slate-100 p-4 flex items-start gap-3 hover:shadow-sm hover:border-primary/20 transition-all duration-200 cursor-pointer"
    >
      <button
        onClick={() => word.audio_url ? onPlay(word.audio_url, word.id) : undefined}
        disabled={!word.audio_url}
        className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
          isPlaying
            ? 'bg-red-100 text-red-500 shadow-sm'
            : word.audio_url
              ? 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
              : 'bg-slate-100 text-slate-300 cursor-not-allowed'
        }`}
      >
        {isPlaying ? (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/></svg>
        ) : (
          <Volume2 className="w-5 h-5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <h4 className="text-base font-bold text-primary">{word.word}</h4>
          {word.word_class && (
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{word.word_class}</span>
          )}
        </div>
        {word.phonetic && (
          <p className="text-xs font-mono text-slate-400 mb-1">{word.phonetic}</p>
        )}
        <p className="text-sm text-slate-600 leading-relaxed">{word.definition}</p>
      </div>

      <button
        onClick={() => onFav(word.id)}
        className="w-9 h-9 flex items-center justify-center shrink-0 rounded-full transition-colors"
      >
        <Star className={`w-5 h-5 transition-colors ${isFav ? 'text-yellow-500 fill-yellow-400' : 'text-slate-300 hover:text-yellow-400'}`} />
      </button>
    </div>
  );
}

// ── Flashcard View ─────────────────────────────────────────────

function FlashcardView({ word, index, total, isFlipped, onFlip, onPrev, onNext, onFav, isFav }: {
  word: VocabularyModel; index: number; total: number; isFlipped: boolean;
  onFlip: () => void; onPrev: () => void; onNext: () => void;
  onFav: (id: string) => void; isFav: boolean;
}) {
  const pct = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center p-4 pb-6 min-h-full">
      {/* Progress */}
      <div className="w-full max-w-sm mb-4">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span className="font-semibold">{index + 1}/{total}</span>
          <span className="text-primary font-bold">{pct}% hoàn thành</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Card */}
      <button onClick={onFlip} className="w-full max-w-sm flex-1 flex flex-col items-center justify-center">
        {!isFlipped ? (
          <div className="w-full bg-white rounded-3xl border-2 border-primary/20 shadow-lg shadow-primary/10 p-8 flex flex-col items-center">
            {word.word_class && (
              <span className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-bold rounded-full mb-4">{word.word_class}</span>
            )}
            <p className="text-4xl font-black text-primary text-center mb-2">{word.word}</p>
            {word.phonetic && <p className="text-base italic text-slate-400 font-mono">{word.phonetic}</p>}
            <div className="mt-6 flex items-center gap-1.5 text-xs text-slate-400">
              <span>Chạm để lật</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        ) : (
          <div className="w-full bg-linear-to-br from-primary to-teal-500 rounded-3xl shadow-xl shadow-primary/20 p-8 flex flex-col items-center text-white">
            <p className="text-2xl font-bold text-white/80 mb-2">{word.word}</p>
            <div className="w-12 h-px bg-white/30 my-3" />
            <p className="text-2xl font-semibold text-white text-center leading-relaxed">{word.definition}</p>
            <div className="mt-6 flex items-center gap-1.5 text-xs text-white/60">
              <span>Lật lại</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        )}
      </button>

      {/* Nav */}
      <div className="w-full max-w-sm flex items-center gap-3 mt-4">
        <button
          onClick={onPrev}
          disabled={index === 0}
          className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-semibold rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Trước
        </button>
        <button onClick={() => onFav(word.id)} className="w-12 h-12 flex items-center justify-center">
          <Star className={`w-6 h-6 ${isFav ? 'text-yellow-500 fill-yellow-400' : 'text-slate-300'}`} />
        </button>
        <button
          onClick={onNext}
          disabled={index === total - 1}
          className="flex-1 py-3 bg-primary text-white font-semibold rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary-dark transition-colors flex items-center justify-center gap-1"
        >
          Tiếp <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Quiz View ─────────────────────────────────────────────────

function QuizView({ word, options, mode, index, total, correct, selected, onPick, onNext }: {
  word: VocabularyModel; options: string[]; mode: number; index: number; total: number;
  correct: number; selected: number | null; onPick: (i: number) => void; onNext: () => void;
}) {
  const pct = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;
  const isWordMode = mode === 3;

  const getOptionStyle = (i: number) => {
    if (selected === null) return 'bg-white border-slate-200 hover:border-primary/50';
    const isCorrect = isWordMode ? options[i] === word.definition : options[i] === word.word;
    if (isCorrect) return 'bg-green-50 border-green-500';
    if (i === selected) return 'bg-red-50 border-red-500';
    return 'bg-white border-slate-200 opacity-50';
  };

  return (
    <div className="p-4 pb-6 min-h-full flex flex-col">
      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span className="font-semibold">{index + 1}/{total}</span>
          <span className="flex items-center gap-1 text-primary font-bold">
            <CheckCircle className="w-3.5 h-3.5" /> {correct} đúng
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4 text-center shadow-sm">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          {isWordMode ? 'Chọn nghĩa đúng của từ:' : 'Chọn từ đúng:'}
        </p>
        <p className={`font-black text-primary leading-tight ${isWordMode ? 'text-4xl' : 'text-2xl'}`}>
          {isWordMode ? word.word : word.definition}
        </p>
        {isWordMode && word.phonetic && (
          <p className="text-sm italic text-slate-400 font-mono mt-1">{word.phonetic}</p>
        )}
      </div>

      {/* Options */}
      <div className="space-y-2.5 flex-1">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onPick(i)}
            disabled={selected !== null}
            className={`w-full px-4 py-3.5 rounded-xl border-2 text-left transition-all duration-200 ${getOptionStyle(i)}`}
          >
            <div className="flex items-start gap-3">
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                selected === null ? 'bg-slate-100 text-slate-500' :
                (isWordMode ? opt === word.definition : opt === word.word) ? 'bg-green-500 text-white' :
                i === selected ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-sm font-medium text-slate-700 flex-1 leading-relaxed">{opt}</span>
              {selected !== null && (isWordMode ? opt === word.definition : opt === word.word) && (
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              )}
              {selected === i && (isWordMode ? opt !== word.definition : opt !== word.word) && (
                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
              )}
            </div>
          </button>
        ))}
      </div>

      {selected !== null && (
        <button onClick={onNext} className="mt-4 w-full py-3.5 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20">
          {index < total - 1 ? <>Tiếp <ChevronRight className="inline w-4 h-4" /></> : 'Xem kết quả'}
        </button>
      )}
    </div>
  );
}

// ── Quiz Result ────────────────────────────────────────────────

function QuizResultView({ correct, total, onRetry }: { correct: number; total: number; onRetry: () => void }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const getResultColor = () => {
    if (pct >= 80) return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', label: 'Xuất sắc!' };
    if (pct >= 60) return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', label: 'Khá tốt!' };
    return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', label: 'Cần cố gắng!' };
  };
  const r = getResultColor();

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-6">
      <div className={`w-full max-w-sm rounded-3xl border-2 ${r.bg} ${r.border} p-8 text-center`}>
        <p className={`text-7xl font-black ${r.text} mb-2`}>{pct}%</p>
        <p className={`text-lg font-bold ${r.text} mb-1`}>{r.label}</p>
        <p className="text-sm text-slate-500">{correct}/{total} câu đúng</p>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onRetry}
            className="flex-1 py-3 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
          >
            Làm lại
          </button>
        </div>
      </div>
    </div>
  );
}

function MatchingMode({ words }: { words: VocabularyModel[] }) {
  const pairs = useMemo(() => shuffle(words).slice(0, Math.min(6, words.length)), [words]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const rightItems = useMemo(
    () => shuffle(pairs.map(w => ({ id: w.id, definition: w.definition }))),
    [pairs],
  );
  const [matched, setMatched] = useState<Set<string>>(new Set());

  const completed = matched.size === pairs.length;

  return (
    <div className="p-4 space-y-3 pb-6">
      <div className="text-sm font-semibold text-slate-600">Ghép từ với nghĩa tương ứng</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          {pairs.map(item => {
            const isMatched = matched.has(item.id);
            const isSelected = selectedWord === item.id;
            return (
              <button
                key={item.id}
                disabled={isMatched}
                onClick={() => setSelectedWord(item.id)}
                className={`w-full rounded-xl border p-3 text-left text-sm font-semibold transition ${
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
          {rightItems.map(item => {
            const isMatched = matched.has(item.id);
            return (
              <button
                key={item.id}
                disabled={isMatched || !selectedWord}
                onClick={() => {
                  if (!selectedWord) return;
                  if (selectedWord === item.id) {
                    setMatched(prev => new Set(prev).add(item.id));
                  }
                  setSelectedWord(null);
                }}
                className={`w-full rounded-xl border p-3 text-left text-sm transition ${
                  isMatched
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-primary/40'
                }`}
              >
                {item.definition}
              </button>
            );
          })}
        </div>
      </div>

      {completed && (
        <div className="rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-sm font-semibold text-green-700">
          Hoàn thành ghép cặp.
        </div>
      )}
    </div>
  );
}

function FillBlankMode({ words, englishToVietnamese }: { words: VocabularyModel[]; englishToVietnamese: boolean }) {
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState('');
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);

  const item = words[index];
  if (!item) return null;

  const answer = (englishToVietnamese ? item.definition : item.word).trim().toLowerCase();
  const prompt = englishToVietnamese ? item.word : item.definition;

  return (
    <div className="p-4 pb-6 space-y-4">
      <div className="text-xs font-semibold text-slate-500">{index + 1} / {words.length}</div>
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <p className="text-xs text-slate-400 mb-2">Điền đáp án đúng</p>
        <p className="text-lg font-bold text-primary">{prompt}</p>
      </div>

      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Nhập đáp án..."
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary/40"
      />

      <div className="flex gap-2">
        <button
          onClick={() => {
            const ok = value.trim().toLowerCase() === answer;
            setCorrect(ok);
            setChecked(true);
          }}
          className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold"
        >
          Kiểm tra
        </button>
        <button
          onClick={() => {
            const next = (index + 1) % words.length;
            setIndex(next);
            setValue('');
            setChecked(false);
          }}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
        >
          Câu tiếp
        </button>
      </div>

      {checked && (
        <div className={`rounded-xl px-3 py-2 text-sm font-semibold ${correct ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {correct ? 'Chính xác' : `Chưa đúng. Đáp án: ${englishToVietnamese ? item.definition : item.word}`}
        </div>
      )}
    </div>
  );
}

function ListeningMode({ words }: { words: VocabularyModel[] }) {
  const audioWords = useMemo(() => words.filter(w => !!w.audio_url), [words]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const item = audioWords[index];

  const options = useMemo(() => {
    if (!item) return [] as string[];
    const others = shuffle(words.filter(w => w.id !== item.id).map(w => w.word)).slice(0, 3);
    return shuffle([item.word, ...others]);
  }, [item, words]);

  if (!item) {
    return <div className="p-4 text-sm text-slate-500">Không có từ có audio trong bộ lọc hiện tại.</div>;
  }

  return (
    <div className="p-4 pb-6 space-y-4">
      <div className="text-xs font-semibold text-slate-500">{index + 1} / {audioWords.length}</div>
      <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
        <button
          onClick={() => {
            const audio = new Audio(item.audio_url);
            setPlaying(true);
            audio.play().catch(() => setPlaying(false));
            audio.onended = () => setPlaying(false);
            audio.onerror = () => setPlaying(false);
          }}
          className="mx-auto w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center"
        >
          <Volume2 className="w-6 h-6" />
        </button>
        <p className="text-xs text-slate-400 mt-2">{playing ? 'Đang phát...' : 'Bấm để nghe'}</p>
      </div>

      <div className="space-y-2">
        {options.map(opt => {
          const isCorrect = opt === item.word;
          const chosen = selected === opt;
          return (
            <button
              key={opt}
              onClick={() => setSelected(opt)}
              className={`w-full rounded-xl border p-3 text-left text-sm ${
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
          setIndex((index + 1) % audioWords.length);
          setSelected(null);
        }}
        className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold"
      >
        Câu tiếp
      </button>
    </div>
  );
}

function SpellingMode({ words, englishToVietnamese }: { words: VocabularyModel[]; englishToVietnamese: boolean }) {
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState('');
  const [checked, setChecked] = useState(false);

  const item = words[index];
  const target = ((englishToVietnamese ? item?.word : item?.definition) || '').trim();
  const shuffled = useMemo(() => shuffle(target.split('')).join(' '), [target]);
  if (!item) return null;
  const ok = value.trim().toLowerCase() === target.toLowerCase();

  return (
    <div className="p-4 pb-6 space-y-4">
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <p className="text-xs text-slate-400 mb-2">Sắp xếp chữ</p>
        <p className="text-sm font-semibold text-slate-600 mb-3">{englishToVietnamese ? item.definition : item.word}</p>
        <p className="text-lg font-bold text-primary tracking-[0.18em]">{shuffled}</p>
      </div>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Nhập đáp án"
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary/40"
      />
      <div className="flex gap-2">
        <button onClick={() => setChecked(true)} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold">Kiểm tra</button>
        <button
          onClick={() => {
            setIndex((index + 1) % words.length);
            setValue('');
            setChecked(false);
          }}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
        >
          Từ tiếp
        </button>
      </div>
      {checked && (
        <div className={`rounded-xl px-3 py-2 text-sm font-semibold ${ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {ok ? 'Chính xác' : `Đáp án: ${target}`}
        </div>
      )}
    </div>
  );
}

function SpeedMode({ words, englishToVietnamese }: { words: VocabularyModel[]; englishToVietnamese: boolean }) {
  const [seconds, setSeconds] = useState(60);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearInterval(t);
          setDone(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const item = words[index % words.length];
  const options = useMemo(() => {
    if (!item) return [] as string[];
    if (englishToVietnamese) {
      const others = shuffle(words.filter(w => w.id !== item.id).map(w => w.definition)).slice(0, 3);
      return shuffle([item.definition, ...others]);
    }
    const others = shuffle(words.filter(w => w.id !== item.id).map(w => w.word)).slice(0, 3);
    return shuffle([item.word, ...others]);
  }, [item, words, englishToVietnamese]);

  if (!item) return null;

  if (done) {
    return (
      <div className="p-6 flex flex-col items-center gap-3">
        <p className="text-4xl font-black text-primary">{score}</p>
        <p className="text-sm text-slate-600">Điểm của bạn trong 60 giây</p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-6 space-y-4">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span className="text-primary">{seconds}s</span>
        <span className="text-slate-600">Điểm: {score}</span>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <p className="text-sm font-bold text-primary">{englishToVietnamese ? item.word : item.definition}</p>
      </div>
      <div className="space-y-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => {
              const isCorrect = englishToVietnamese ? opt === item.definition : opt === item.word;
              if (isCorrect) setScore(s => s + 1);
              setIndex(i => i + 1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left text-sm hover:border-primary/40"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function MemoryMode({ words }: { words: VocabularyModel[] }) {
  const base = useMemo(() => shuffle(words).slice(0, Math.min(6, words.length)), [words]);
  const cards = useMemo(() => shuffle(base.flatMap(w => ([
    { id: `${w.id}-w`, pairId: w.id, label: w.word },
    { id: `${w.id}-d`, pairId: w.id, label: w.definition },
  ]))), [base]);

  const [opened, setOpened] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());

  return (
    <div className="p-4 pb-6">
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
    </div>
  );
}

// ── Grammar Tab ─────────────────────────────────────────────────

function GrammarTab() {
  const [lessons, setLessons] = useState<number[]>([1]);
  const [selectedLesson, setSelectedLesson] = useState(1);
  const [grammars, setGrammars] = useState<GrammarModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedGrammar, setSelectedGrammar] = useState<GrammarModel | null>(null);

  useEffect(() => {
    getLessonNumbers().then(ls => { if (ls.length) setLessons(ls); }).catch(() => {});
  }, []);

  useEffect(() => {
    getGrammar(selectedLesson)
      .then(setGrammars)
      .catch(() => setGrammars([]))
      .finally(() => setLoading(false));
  }, [selectedLesson]);

  return (
    <div className="p-3 sm:p-4 space-y-4">
      {/* Lesson filter */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="h-10 px-4 bg-white border border-slate-200 rounded-full flex items-center justify-between text-sm text-slate-600 w-full max-w-xs"
        >
          Bài {selectedLesson} <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>
        {showPicker && (
          <div className="absolute top-12 left-0 w-full max-w-xs bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
            {lessons.map(l => (
              <button
                key={l}
                onClick={() => { setSelectedLesson(l); setShowPicker(false); }}
                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 ${l === selectedLesson ? 'text-primary font-bold' : 'text-slate-600'}`}
              >
                Bài {l} {l === selectedLesson && '✓'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grammar list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : grammars.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <Search className="w-14 h-14 mb-4" />
          <p className="text-sm">Chưa có nội dung ngữ pháp cho bài này.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grammars.map((g, i) => (
            <button
              key={g.id}
              onClick={() => setSelectedGrammar(g)}
              className="w-full bg-white rounded-xl p-3 sm:p-4 border border-slate-100 shadow-sm flex items-center gap-3 sm:gap-4 text-left hover:border-primary/30 transition-colors"
            >
              <span className="w-10 h-10 rounded-full border-2 border-primary flex items-center justify-center text-sm font-bold text-primary shrink-0">
                {i + 1}
              </span>
              <span className="text-sm font-semibold text-primary flex-1 min-w-0 wrap-break-word">{g.title}</span>
              <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Grammar Detail Modal */}
      {selectedGrammar && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedGrammar(null)} />
          <div className="relative bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            {/* Teal header */}
            <div className="bg-primary px-4 sm:px-5 py-4 sm:py-5 flex items-start gap-3">
              <h3 className="text-base font-semibold text-white flex-1 leading-snug wrap-break-word min-w-0">{selectedGrammar.title}</h3>
              <button onClick={() => setSelectedGrammar(null)} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                <span className="text-white text-sm">✕</span>
              </button>
            </div>
            {/* Scrollable body */}
            <div className="overflow-y-auto p-4 sm:p-5 space-y-5">
              <h4 className="text-lg font-bold text-[#3D6B64] wrap-break-word">{selectedGrammar.title}</h4>

              {/* Formula */}
              {selectedGrammar.formula && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 tracking-wide mb-2">Công thức:</p>
                  <div className="bg-slate-50 border border-teal-100 rounded-2xl p-4 text-center">
                    <p className="text-sm font-bold text-primary leading-relaxed wrap-break-word">{selectedGrammar.formula}</p>
                  </div>
                </div>
              )}

              {/* Content */}
              {!selectedGrammar.formula && selectedGrammar.content && (
                <p className="text-sm text-slate-600 leading-relaxed wrap-break-word">{selectedGrammar.content}</p>
              )}

              {/* Examples */}
              {selectedGrammar.examples?.length > 0 && (
                <div>
                  <h5 className="text-base font-bold text-primary mb-3">Ví dụ:</h5>
                  <div className="space-y-3">
                    {selectedGrammar.examples.map((ex, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />
                        <p className="text-sm italic text-slate-600 leading-relaxed wrap-break-word">{ex}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related topics */}
              {selectedGrammar.related_topics?.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                  <h5 className="text-base font-bold text-primary mb-4">Ngữ pháp liên quan</h5>
                  <div className="space-y-3">
                    {selectedGrammar.related_topics.map((topic, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span>👉</span>
                        <span className="text-sm font-medium text-primary wrap-break-word">{topic}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
