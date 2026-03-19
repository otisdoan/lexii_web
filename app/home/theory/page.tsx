'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { ArrowLeft, Volume2, Star, ChevronDown, ChevronLeft, ChevronRight, Mic, Search, CheckCircle, XCircle } from 'lucide-react';
import { getVocabulary, getGrammar, getLessonNumbers } from '@/lib/api';
import type { VocabularyModel, GrammarModel } from '@/lib/types';

const SCORE_LEVELS = ['Tất cả', '450+', '600+', '800+', '990+'];
const MODES = ['Chọn', 'Flashcards', 'Định nghĩa', 'Chọn từ', 'Luyện nói'];

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

function VocabularyTab() {
  const [lessons, setLessons] = useState<number[]>([1]);
  const [selectedLesson, setSelectedLesson] = useState(1);
  const [selectedScore, setSelectedScore] = useState('Tất cả');
  const [selectedMode, setSelectedMode] = useState(0);
  const [words, setWords] = useState<VocabularyModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLessonPicker, setShowLessonPicker] = useState(false);
  const [showScorePicker, setShowScorePicker] = useState(false);

  useEffect(() => {
    getLessonNumbers().then(ls => { if (ls.length) setLessons(ls); }).catch(() => {});
  }, []);

  useEffect(() => {
    const scoreLevel = selectedScore === 'Tất cả' ? undefined : parseInt(selectedScore);
    getVocabulary(selectedLesson, scoreLevel)
      .then(setWords)
      .catch(() => setWords([]))
      .finally(() => setLoading(false));
  }, [selectedLesson, selectedScore]);

  return (
    <div>
      {/* Controls */}
      <div className="bg-slate-50 px-3 sm:px-4 py-4 space-y-3">
        <div className="flex gap-2 sm:gap-3">
          {/* Lesson dropdown */}
          <div className="relative flex-1 min-w-0">
            <button
              onClick={() => setShowLessonPicker(!showLessonPicker)}
              className="w-full h-10 px-4 bg-white border border-slate-200 rounded-full flex items-center justify-between text-sm text-slate-600 min-w-0"
            >
              Bài {selectedLesson} <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            {showLessonPicker && (
              <div className="absolute top-12 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                {lessons.map(l => (
                  <button
                    key={l}
                    onClick={() => { setSelectedLesson(l); setShowLessonPicker(false); }}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 ${l === selectedLesson ? 'text-primary font-bold' : 'text-slate-600'}`}
                  >
                    Bài {l} {l === selectedLesson && '✓'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Score filter */}
          <div className="relative flex-1 min-w-0">
            <button
              onClick={() => setShowScorePicker(!showScorePicker)}
              className="w-full h-10 px-4 bg-white border border-slate-200 rounded-full flex items-center justify-between text-sm text-slate-600 min-w-0"
            >
              {selectedScore} <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            {showScorePicker && (
              <div className="absolute top-12 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-20">
                {SCORE_LEVELS.map(s => (
                  <button
                    key={s}
                    onClick={() => { setSelectedScore(s); setShowScorePicker(false); }}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 ${s === selectedScore ? 'text-primary font-bold' : 'text-slate-600'}`}
                  >
                    {s} {s === selectedScore && '✓'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mode chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-1">
          {MODES.map((mode, i) => (
            <button
              key={mode}
              onClick={() => setSelectedMode(i)}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors shadow-sm text-center ${
                selectedMode === i
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)}
        </div>
      ) : words.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <Search className="w-14 h-14 mb-4" />
          <p className="text-sm">Không có từ vựng cho bộ lọc này.</p>
        </div>
      ) : (
        <ModeContent mode={selectedMode} words={words} />
      )}
    </div>
  );
}

// ── Mode Content Router ─────────────────────────────────────────

function ModeContent({ mode, words }: { mode: number; words: VocabularyModel[] }) {
  switch (mode) {
    case 1: return <FlashcardMode words={words} />;
    case 2: return <DefinitionQuizMode words={words} />;
    case 3: return <WordChoiceMode words={words} />;
    case 4: return <SpeakingMode words={words} />;
    default: return <VocabListMode words={words} />;
  }
}

// ── Mode 0: Vocab List ──────────────────────────────────────────

function VocabListMode({ words }: { words: VocabularyModel[] }) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const toggleFav = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="p-3 sm:p-4 space-y-3">
      {words.map(v => (
        <div key={v.id} className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm flex gap-2 sm:gap-4">
          {/* Play button */}
          <button className="w-11 h-11 bg-primary rounded-full flex items-center justify-center shrink-0">
            <Volume2 className="w-5 h-5 text-white" />
          </button>
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-800">{v.word}</span>
              {v.word_class && (
                <span className="px-2 py-0.5 bg-teal-100 text-primary text-[11px] font-semibold rounded-lg">{v.word_class}</span>
              )}
            </div>
            {v.phonetic && <p className="text-sm italic text-slate-400">{v.phonetic}</p>}
            <p className="text-sm text-slate-600 mt-1">{v.definition}</p>
          </div>
          {/* Favorite */}
          <button onClick={() => toggleFav(v.id)}>
            <Star className={`w-6 h-6 ${favorites.has(v.id) ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300'}`} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Mode 1: Flashcards ──────────────────────────────────────────

function FlashcardMode({ words }: { words: VocabularyModel[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const word = words[index];

  return (
    <div className="p-4 sm:p-6 flex flex-col items-center min-h-125">
      {/* Progress */}
      <div className="w-full flex items-center justify-between text-sm text-slate-500 mb-2">
        <span>{index + 1} / {words.length}</span>
        <span className="text-xs text-slate-400">Nhấn thẻ để lật</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full mb-6 overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((index + 1) / words.length) * 100}%` }} />
      </div>

      {/* Card */}
      <button
        onClick={() => setFlipped(!flipped)}
        className="w-full max-w-md flex-1 mb-6"
      >
        {!flipped ? (
          <div className="bg-white rounded-3xl shadow-lg p-6 sm:p-8 flex flex-col items-center justify-center min-h-75">
            {word.word_class && (
              <span className="px-4 py-1 bg-teal-100 text-primary text-xs font-semibold rounded-full mb-5">{word.word_class}</span>
            )}
            <p className="text-4xl font-bold text-slate-800">{word.word}</p>
            {word.phonetic && <p className="text-base italic text-slate-400 mt-2">{word.phonetic}</p>}
            <p className="text-xs text-slate-400 mt-8 flex items-center gap-1">
              <span>👆</span> Nhấn để xem nghĩa
            </p>
          </div>
        ) : (
          <div className="bg-primary rounded-3xl shadow-lg p-6 sm:p-8 flex flex-col items-center justify-center min-h-75">
            <p className="text-2xl font-bold text-white/80">{word.word}</p>
            <div className="w-16 h-px bg-white/25 my-6" />
            <p className="text-2xl font-semibold text-white text-center leading-relaxed">{word.definition}</p>
            {word.word_class && (
              <span className="px-4 py-1 bg-white/20 text-white text-xs font-semibold rounded-full mt-4">{word.word_class}</span>
            )}
          </div>
        )}
      </button>

      {/* Nav */}
      <div className="flex gap-3 w-full max-w-md">
        <button
          onClick={() => { setIndex(Math.max(0, index - 1)); setFlipped(false); }}
          disabled={index === 0}
          className="flex-1 py-3 border-2 border-primary text-primary rounded-xl font-semibold disabled:opacity-40 flex items-center justify-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Trước
        </button>
        <button
          onClick={() => { setIndex(Math.min(words.length - 1, index + 1)); setFlipped(false); }}
          disabled={index === words.length - 1}
          className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold disabled:opacity-40 flex items-center justify-center gap-1"
        >
          Tiếp <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Quiz shared: option tile ────────────────────────────────────

function OptionTile({ label, isAnswered, isCorrect, isSelected, onTap }: {
  label: string; isAnswered: boolean; isCorrect: boolean; isSelected: boolean; onTap: () => void;
}) {
  let bg = 'bg-white';
  let border = 'border-slate-200';
  if (isAnswered && isCorrect) { bg = 'bg-green-50'; border = 'border-green-500'; }
  else if (isAnswered && isSelected) { bg = 'bg-red-50'; border = 'border-red-500'; }

  return (
    <button onClick={onTap} className={`w-full px-4 py-3.5 rounded-xl border ${bg} ${border} flex items-center justify-between gap-3 text-left shadow-sm transition-all`}>
      <span className="text-sm font-medium text-slate-800 wrap-break-word min-w-0">{label}</span>
      {isAnswered && isCorrect && <CheckCircle className="w-5 h-5 text-green-500" />}
      {isAnswered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500" />}
    </button>
  );
}

// ── Mode 2: Definition Quiz (definition → pick word) ────────────

function DefinitionQuizMode({ words }: { words: VocabularyModel[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const options = useMemo(() => {
    const correctWord = words[index].word;
    const others = shuffle(words.filter(w => w.word !== correctWord).map(w => w.word)).slice(0, 3);
    return shuffle([correctWord, ...others]);
  }, [words, index]);

  const pick = useCallback((i: number) => {
    if (selected !== null) return;
    setSelected(i);
    if (options[i] === words[index].word) setCorrect(c => c + 1);
  }, [selected, options, words, index]);

  const next = () => {
    if (index < words.length - 1) {
      setIndex(i => i + 1);
      setSelected(null);
    } else {
      setShowResult(true);
    }
  };

  const retry = () => { setIndex(0); setSelected(null); setCorrect(0); setShowResult(false); };

  if (showResult) return <QuizResult correct={correct} total={words.length} onRetry={retry} />;

  const word = words[index];
  return (
    <div className="p-4 sm:p-6 flex flex-col min-h-125">
      <QuizProgress index={index} total={words.length} correct={correct} />
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm text-center my-4">
        <p className="text-xs text-slate-400 mb-3">Từ nào có nghĩa là?</p>
        <p className="text-xl font-semibold text-slate-800 leading-relaxed wrap-break-word">{word.definition}</p>
        {word.word_class && <span className="inline-block mt-2 px-3 py-0.5 bg-teal-100 text-primary text-[11px] font-semibold rounded-lg">{word.word_class}</span>}
      </div>
      <div className="space-y-2.5 flex-1">
        {options.map((opt, i) => (
          <OptionTile key={`${index}-${i}`} label={opt} isAnswered={selected !== null} isCorrect={opt === word.word} isSelected={selected === i} onTap={() => pick(i)} />
        ))}
      </div>
      {selected !== null && (
        <button onClick={next} className="mt-4 w-full py-3 bg-primary text-white rounded-xl font-bold">
          {index < words.length - 1 ? 'Tiếp theo →' : 'Xem kết quả'}
        </button>
      )}
    </div>
  );
}

// ── Mode 3: Word Choice (word → pick definition) ────────────────

function WordChoiceMode({ words }: { words: VocabularyModel[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const options = useMemo(() => {
    const correctDef = words[index].definition;
    const others = shuffle(words.filter(w => w.definition !== correctDef).map(w => w.definition)).slice(0, 3);
    return shuffle([correctDef, ...others]);
  }, [words, index]);

  const pick = useCallback((i: number) => {
    if (selected !== null) return;
    setSelected(i);
    if (options[i] === words[index].definition) setCorrect(c => c + 1);
  }, [selected, options, words, index]);

  const next = () => {
    if (index < words.length - 1) {
      setIndex(i => i + 1);
      setSelected(null);
    } else {
      setShowResult(true);
    }
  };

  const retry = () => { setIndex(0); setSelected(null); setCorrect(0); setShowResult(false); };

  if (showResult) return <QuizResult correct={correct} total={words.length} onRetry={retry} />;

  const word = words[index];
  return (
    <div className="p-4 sm:p-6 flex flex-col min-h-125">
      <QuizProgress index={index} total={words.length} correct={correct} />
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm text-center my-4">
        <p className="text-xs text-slate-400 mb-3">Nghĩa của từ này là?</p>
        <p className="text-3xl font-bold text-slate-800 wrap-break-word">{word.word}</p>
        {word.phonetic && <p className="text-sm italic text-slate-400 mt-1">{word.phonetic}</p>}
      </div>
      <div className="space-y-2.5 flex-1">
        {options.map((opt, i) => (
          <OptionTile key={`${index}-${i}`} label={opt} isAnswered={selected !== null} isCorrect={opt === word.definition} isSelected={selected === i} onTap={() => pick(i)} />
        ))}
      </div>
      {selected !== null && (
        <button onClick={next} className="mt-4 w-full py-3 bg-primary text-white rounded-xl font-bold">
          {index < words.length - 1 ? 'Tiếp theo →' : 'Xem kết quả'}
        </button>
      )}
    </div>
  );
}

// ── Mode 4: Speaking Mode ───────────────────────────────────────

function SpeakingMode({ words }: { words: VocabularyModel[] }) {
  const [index, setIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const word = words[index];

  return (
    <div className="p-4 sm:p-6 flex flex-col items-center min-h-125">
      <div className="w-full flex items-center justify-between text-sm text-slate-500 mb-6">
        <span>{index + 1} / {words.length}</span>
        <span className="text-xs text-slate-400">Nghe và luyện phát âm</span>
      </div>

      <div className="bg-white rounded-3xl shadow-sm p-5 sm:p-7 w-full max-w-md text-center mb-8">
        <p className="text-4xl font-bold text-slate-800 wrap-break-word">{word.word}</p>
        {word.phonetic && <p className="text-base italic text-slate-400 mt-1">{word.phonetic}</p>}
        <p className="text-sm text-slate-600 mt-4 wrap-break-word">{word.definition}</p>
        <button className="mt-5 w-13 h-13 bg-primary rounded-full flex items-center justify-center mx-auto">
          <Volume2 className="w-6 h-6 text-white" />
        </button>
      </div>

      <div className="flex-1" />

      {/* Record button */}
      <button
        onClick={() => setIsRecording(!isRecording)}
        className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-colors ${
          isRecording ? 'bg-red-500 shadow-red-500/30' : 'bg-primary shadow-primary/30'
        }`}
      >
        {isRecording ? (
          <div className="w-6 h-6 bg-white rounded-sm" />
        ) : (
          <Mic className="w-9 h-9 text-white" />
        )}
      </button>
      <p className="text-sm text-slate-500 mt-2 mb-6">
        {isRecording ? 'Đang ghi âm...' : 'Nhấn để nói'}
      </p>

      <div className="flex gap-3 w-full max-w-md">
        <button
          onClick={() => { setIndex(Math.max(0, index - 1)); setIsRecording(false); }}
          disabled={index === 0}
          className="flex-1 py-3 border-2 border-primary text-primary rounded-xl font-semibold disabled:opacity-40"
        >
          Trước
        </button>
        <button
          onClick={() => { setIndex(Math.min(words.length - 1, index + 1)); setIsRecording(false); }}
          disabled={index === words.length - 1}
          className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold disabled:opacity-40"
        >
          Tiếp
        </button>
      </div>
    </div>
  );
}

// ── Shared quiz components ──────────────────────────────────────

function QuizProgress({ index, total, correct }: { index: number; total: number; correct: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
        <span>{index + 1} / {total}</span>
        <span className="flex items-center gap-1 text-primary text-xs">
          <CheckCircle className="w-4 h-4" /> {correct} đúng
        </span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>
    </div>
  );
}

function QuizResult({ correct, total, onRetry }: { correct: number; total: number; onRetry: () => void }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <div className="p-6 sm:p-8 flex flex-col items-center justify-center min-h-100">
      <p className={`text-6xl font-bold mb-2 ${pct >= 70 ? 'text-primary' : 'text-red-500'}`}>{pct}%</p>
      <p className="text-sm text-slate-600 wrap-break-word text-center">{correct} / {total} câu đúng</p>
      <button onClick={onRetry} className="mt-6 px-8 py-3 bg-primary text-white rounded-xl font-semibold">
        Làm lại
      </button>
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
              <span className="text-sm font-semibold text-slate-800 flex-1 min-w-0 wrap-break-word">{g.title}</span>
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
                  <h5 className="text-base font-bold text-slate-800 mb-3">Ví dụ:</h5>
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
                  <h5 className="text-base font-bold text-slate-800 mb-4">Ngữ pháp liên quan</h5>
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
