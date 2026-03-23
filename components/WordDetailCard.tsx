'use client';

import { useEffect } from 'react';
import { useState, useRef } from 'react';
import { X, Volume2, VolumeX, ChevronDown } from 'lucide-react';

interface DictMeaning {
  partOfSpeech: string;
  definitions: Array<{
    definition: string;
    definitionVi: string;
    example?: string;
    synonyms?: string[];
  }>;
}

export interface DictResult {
  word: string;
  phonetic?: string;
  audioUrl?: string;
  meanings: DictMeaning[];
}

interface WordDetailCardProps {
  result: DictResult;
  onClose: () => void;
}

export function WordDetailCard({ result, onClose }: WordDetailCardProps) {
  const [playing, setPlaying] = useState(false);
  const [expandedDef, setExpandedDef] = useState<number | null>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

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
    conjunction: 'bg-indigo-50 text-indigo-700',
    interjection: 'bg-yellow-50 text-yellow-700',
    determiner: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-linear-to-br from-primary via-primary to-teal-600 p-6 text-white relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors z-10"
        >
          <X className="w-4 h-4 text-white" />
        </button>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 right-16 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />

        <div className="relative">
          <p className="text-xs font-medium text-teal-200 uppercase tracking-wider mb-1">Chi tiết từ vựng</p>
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
              {playing ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
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
                            {def.definitionVi && (
                              <p className="text-sm text-teal-700 font-medium leading-snug mt-0.5">{def.definitionVi}</p>
                            )}
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
                              <p className="text-xs text-slate-400 font-medium w-full mb-1">Từ đồng nghĩa:</p>
                              {def.synonyms.slice(0, 6).map((syn, si) => (
                                <span key={si} className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-medium">
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
