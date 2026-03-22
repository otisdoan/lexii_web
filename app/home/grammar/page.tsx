'use client';

import { useEffect, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronDown, HelpCircle } from 'lucide-react';
import { getGrammar, getLessonNumbers } from '@/lib/api';
import type { GrammarModel } from '@/lib/types';

function FormulaBadge({ formula }: { formula: string }) {
  if (!formula) return null;
  return (
    <span className="inline-block px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-mono text-slate-700 font-medium">
      {formula}
    </span>
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
        const allItems = await getGrammar(
          lessonFilter === 'all' ? undefined : lessonFilter
        );
        let filtered = allItems;
        if (search.trim()) {
          const q = search.toLowerCase();
          filtered = allItems.filter(g =>
            g.title.toLowerCase().includes(q) ||
            g.content.toLowerCase().includes(q) ||
            (g.formula && g.formula.toLowerCase().includes(q))
          );
        }
        setTotal(filtered.length);
        setItems(filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE));
        // Auto-expand first item if none expanded
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

  return (
    <div className="pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Ngữ pháp</h1>
          <p className="text-sm text-slate-500">{total} chủ đề</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm kiếm ngữ pháp..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
        />
      </div>

      {/* Lesson Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button
          onClick={() => { setLessonFilter('all'); setPage(0); setExpanded(null); }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            lessonFilter === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Tất cả
        </button>
        {lessons.map(lesson => (
          <button
            key={lesson}
            onClick={() => { setLessonFilter(lesson); setPage(0); setExpanded(null); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              lessonFilter === lesson
                ? 'bg-indigo-600 text-white'
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
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/3 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
          <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Không tìm thấy ngữ pháp nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(g => {
            const isOpen = expanded === g.id;
            return (
              <div key={g.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : g.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-indigo-600">B{g.lesson}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm">{g.title}</h4>
                    {g.formula && (
                      <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{g.formula}</p>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-slate-50 pt-3 space-y-3">
                    {g.content && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5 tracking-wide">Giải thích</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{g.content}</p>
                      </div>
                    )}
                    {g.formula && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5 tracking-wide">Công thức</p>
                        <FormulaBadge formula={g.formula} />
                      </div>
                    )}
                    {g.examples && g.examples.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5 tracking-wide">Ví dụ</p>
                        <ul className="space-y-1.5">
                          {g.examples.map((ex, i) => (
                            <li key={i} className="text-sm text-slate-700 flex gap-2">
                              <span className="text-indigo-500 font-bold mt-0.5">•</span>
                              <span>{ex}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
            {[...Array(Math.min(totalPages, 7))].map((_, i) => {
              const pageIndex = totalPages <= 7 ? i : i === 0 ? 0 : i === 6 ? totalPages - 1 : page - 2 + i;
              if (totalPages > 7 && i === 6 && page < totalPages - 3) {
                return <span key="ellipsis" className="px-1 text-slate-400">…</span>;
              }
              if (totalPages > 7 && i === 0 && page > 2) {
                return <span key="ellipsis-start" className="px-1 text-slate-400">…</span>;
              }
              return (
                <button
                  key={i}
                  onClick={() => setPage(pageIndex)}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    page === pageIndex
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {pageIndex + 1}
                </button>
              );
            })}
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
