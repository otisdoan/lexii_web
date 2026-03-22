'use client';

import { useEffect, useState } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Lightbulb,
  Hash,
  Copy,
  CheckCircle2,
  Loader2,
  AlignLeft,
  Sparkles,
} from 'lucide-react';
import { getGrammar, getLessonNumbers } from '@/lib/api';
import type { GrammarModel } from '@/lib/types';

function FormulaBlock({ formula }: { formula: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(formula).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4 flex items-start gap-3">
      <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
        <Hash className="w-4 h-4 text-teal-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-teal-300 uppercase tracking-wide mb-1.5">Công thức</p>
        <p className="text-sm font-mono text-white font-semibold leading-relaxed break-all">{formula}</p>
      </div>
      <button
        onClick={copy}
        className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors shrink-0"
        title="Copy công thức"
      >
        {copied ? (
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
        ) : (
          <Copy className="w-4 h-4 text-white/60 hover:text-white" />
        )}
      </button>
    </div>
  );
}

function GrammarCard({ item, isOpen, onToggle }: { item: GrammarModel; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all duration-200 hover:shadow-md">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
          <span className="text-xs font-black text-primary">B{item.lesson}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-800 text-sm leading-tight">{item.title}</h4>
          {item.formula && (
            <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{item.formula}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {item.examples && item.examples.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
              {item.examples.length} ví dụ
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Body */}
      {isOpen && (
        <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
          {/* Content */}
          {item.content && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlignLeft className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Giải thích</p>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{item.content}</p>
            </div>
          )}

          {/* Formula */}
          {item.formula && <FormulaBlock formula={item.formula} />}

          {/* Examples */}
          {item.examples && item.examples.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ví dụ</p>
              </div>
              <div className="space-y-2">
                {item.examples.map((ex, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed flex-1">{ex}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related topics */}
          {item.related_topics && item.related_topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.related_topics.map((topic, i) => (
                <span key={i} className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-medium hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer">
                  #{topic}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function GrammarPage() {
  const [items, setItems] = useState<GrammarModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lessonFilter, setLessonFilter] = useState<number | 'all'>('all');
  const [lessons, setLessons] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const PAGE_SIZE = 15;

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
        const allItems = await getGrammar(lessonFilter === 'all' ? undefined : lessonFilter);
        let filtered = allItems;
        if (search.trim()) {
          const q = search.toLowerCase();
          filtered = allItems.filter(g =>
            g.title.toLowerCase().includes(q) ||
            g.content.toLowerCase().includes(q) ||
            (g.formula && g.formula.toLowerCase().includes(q)) ||
            (g.examples && g.examples.some(e => e.toLowerCase().includes(q)))
          );
        }
        setTotal(filtered.length);
        setItems(filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE));
        if (filtered.length > 0 && expanded === null) {
          setExpanded(filtered[0].id);
        }
      } catch {
        //
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [lessonFilter, search, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const toggle = (id: string) => {
    setExpanded(prev => prev === id ? null : id);
  };

  return (
    <div className="pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-linear-to-br from-primary to-teal-600 rounded-xl flex items-center justify-center shadow-md">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Ngữ pháp TOEIC</h1>
          <p className="text-sm text-slate-500">{total} chủ đề</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm ngữ pháp, công thức, ví dụ..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      {/* Lesson Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        <button
          onClick={() => { setLessonFilter('all'); setPage(0); setExpanded(null); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 ${
            lessonFilter === 'all'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Tất cả
        </button>
        {lessons.map(lesson => (
          <button
            key={lesson}
            onClick={() => { setLessonFilter(lesson); setPage(0); setExpanded(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 ${
              lessonFilter === lesson
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Bài {lesson}
          </button>
        ))}
      </div>

      {/* Grammar List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-100 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Không tìm thấy ngữ pháp nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(g => (
            <GrammarCard
              key={g.id}
              item={g}
              isOpen={expanded === g.id}
              onToggle={() => toggle(g.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total} chủ đề
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

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
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
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

            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
