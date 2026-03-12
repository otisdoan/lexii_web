'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Volume2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { VocabularyModel } from '@/lib/types';

const PAGE_SIZE = 15;
const SCORE_LEVELS = [0, 450, 600, 800, 990];

export default function AdminVocabularyPage() {
  const [words, setWords] = useState<VocabularyModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lessonFilter, setLessonFilter] = useState<number | 'all'>('all');
  const [lessons, setLessons] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingWord, setEditingWord] = useState<VocabularyModel | null>(null);
  const [form, setForm] = useState({ lesson: 1, word: '', phonetic: '', definition: '', word_class: '', score_level: 450, audio_url: '', sort_order: 0 });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('vocabulary')
        .select('*', { count: 'exact' })
        .order('lesson')
        .order('sort_order')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (lessonFilter !== 'all') query = query.eq('lesson', lessonFilter);
      if (search) query = query.ilike('word', `%${search}%`);

      const { data, count, error } = await query;
      if (error) throw error;
      setWords((data as VocabularyModel[]) || []);
      setTotal(count ?? 0);

      // Load lesson list once
      if (lessons.length === 0) {
        const { data: ls } = await supabase.from('vocabulary').select('lesson').order('lesson');
        if (ls) setLessons([...new Set(ls.map((d: { lesson: number }) => d.lesson))]);
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, lessonFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(0); load(); };

  const openCreate = () => {
    setEditingWord(null);
    setForm({ lesson: 1, word: '', phonetic: '', definition: '', word_class: '', score_level: 450, audio_url: '', sort_order: 0 });
    setShowForm(true);
  };

  const openEdit = (w: VocabularyModel) => {
    setEditingWord(w);
    setForm({ lesson: w.lesson, word: w.word, phonetic: w.phonetic, definition: w.definition, word_class: w.word_class, score_level: w.score_level, audio_url: w.audio_url || '', sort_order: w.sort_order });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingWord) {
        await supabase.from('vocabulary').update(form).eq('id', editingWord.id);
      } else {
        await supabase.from('vocabulary').insert(form);
      }
      setShowForm(false);
      load();
    } catch {
      //
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xoá từ vựng này?')) return;
    await supabase.from('vocabulary').delete().eq('id', id);
    load();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Từ vựng</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total.toLocaleString()} từ</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Thêm từ
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo từ..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </form>
        <select
          value={lessonFilter}
          onChange={e => { setLessonFilter(e.target.value === 'all' ? 'all' : Number(e.target.value)); setPage(0); }}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:border-primary"
        >
          <option value="all">Tất cả bài</option>
          {lessons.map(l => <option key={l} value={l}>Bài {l}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Từ</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phiên âm</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nghĩa</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Loại từ</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bài</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-3.5"><div className="h-3.5 bg-slate-100 rounded w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : words.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-slate-400 py-12">Không có từ vựng nào</td></tr>
              ) : (
                words.map(w => (
                  <tr key={w.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{w.word}</span>
                        {w.audio_url && <Volume2 className="w-3.5 h-3.5 text-slate-400" />}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{w.phonetic}</td>
                    <td className="px-5 py-3.5 text-slate-600 max-w-[160px] truncate">{w.definition}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-medium px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">{w.word_class}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">Bài {w.lesson}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-medium px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full">{w.score_level}+</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(w)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-teal-50 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(w.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 z-10 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-5">{editingWord ? 'Sửa từ vựng' : 'Thêm từ mới'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Từ *</label>
                  <input value={form.word} onChange={e => setForm(f => ({ ...f, word: e.target.value }))} required
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary" placeholder="example" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phiên âm</label>
                  <input value={form.phonetic} onChange={e => setForm(f => ({ ...f, phonetic: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary" placeholder="/ɪɡˈzæmpl/" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nghĩa *</label>
                <input value={form.definition} onChange={e => setForm(f => ({ ...f, definition: e.target.value }))} required
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary" placeholder="ví dụ, mẫu" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Loại từ</label>
                  <input value={form.word_class} onChange={e => setForm(f => ({ ...f, word_class: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary" placeholder="n, v, adj..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bài</label>
                  <input type="number" value={form.lesson} onChange={e => setForm(f => ({ ...f, lesson: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Score level</label>
                  <select value={form.score_level} onChange={e => setForm(f => ({ ...f, score_level: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary">
                    {SCORE_LEVELS.map(s => <option key={s} value={s}>{s}+</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">URL audio</label>
                <input value={form.audio_url} onChange={e => setForm(f => ({ ...f, audio_url: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary" placeholder="https://..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Huỷ
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark disabled:opacity-60">
                  {saving ? 'Đang lưu...' : (editingWord ? 'Cập nhật' : 'Thêm mới')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
