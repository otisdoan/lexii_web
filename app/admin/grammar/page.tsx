'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, RefreshCw, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { GrammarModel } from '@/lib/types';

const PAGE_SIZE = 10;

export default function AdminGrammarPage() {
  const [items, setItems] = useState<GrammarModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lessonFilter, setLessonFilter] = useState<number | 'all'>('all');
  const [lessons, setLessons] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GrammarModel | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    lesson: 1,
    title: '',
    content: '',
    formula: '',
    examples: [''],
    related_topics: [''],
    sort_order: 0,
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('grammar')
        .select('*', { count: 'exact' })
        .order('lesson')
        .order('sort_order')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (lessonFilter !== 'all') query = query.eq('lesson', lessonFilter);
      if (search) query = query.ilike('title', `%${search}%`);

      const { data, count, error } = await query;
      if (error) throw error;
      setItems((data as GrammarModel[]) || []);
      setTotal(count ?? 0);

      if (lessons.length === 0) {
        const { data: ls } = await supabase.from('grammar').select('lesson').order('lesson');
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
    setEditing(null);
    setForm({ lesson: 1, title: '', content: '', formula: '', examples: [''], related_topics: [''], sort_order: 0 });
    setShowForm(true);
  };

  const openEdit = (g: GrammarModel) => {
    setEditing(g);
    setForm({
      lesson: g.lesson,
      title: g.title,
      content: g.content,
      formula: g.formula,
      examples: g.examples?.length ? g.examples : [''],
      related_topics: g.related_topics?.length ? g.related_topics : [''],
      sort_order: g.sort_order,
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      examples: form.examples.filter(Boolean),
      related_topics: form.related_topics.filter(Boolean),
    };
    try {
      if (editing) {
        await supabase.from('grammar').update(payload).eq('id', editing.id);
      } else {
        await supabase.from('grammar').insert(payload);
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
    if (!confirm('Xoá chủ đề ngữ pháp này?')) return;
    await supabase.from('grammar').delete().eq('id', id);
    load();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const updateListItem = (field: 'examples' | 'related_topics', idx: number, val: string) => {
    setForm(f => {
      const arr = [...f[field]];
      arr[idx] = val;
      return { ...f, [field]: arr };
    });
  };

  const addListItem = (field: 'examples' | 'related_topics') => {
    setForm(f => ({ ...f, [field]: [...f[field], ''] }));
  };

  const removeListItem = (field: 'examples' | 'related_topics', idx: number) => {
    setForm(f => ({ ...f, [field]: f[field].filter((_, i) => i !== idx) }));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Ngữ pháp</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total.toLocaleString()} chủ đề</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Thêm chủ đề
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
            placeholder="Tìm theo tiêu đề..."
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

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse shadow-sm">
              <div className="h-4 w-48 bg-slate-100 rounded mb-2" />
              <div className="h-3 w-full bg-slate-100 rounded" />
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 shadow-sm">
            Chưa có chủ đề ngữ pháp nào
          </div>
        ) : (
          items.map(g => (
            <div key={g.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div
                className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
                onClick={() => setExpanded(expanded === g.id ? null : g.id)}
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-indigo-600">B{g.lesson}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 text-sm">{g.title}</h3>
                  {g.formula && <p className="text-xs text-slate-400 mt-0.5 font-mono truncate">{g.formula}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={e => { e.stopPropagation(); openEdit(g); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-teal-50 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(g.id); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expanded === g.id ? 'rotate-180' : ''}`} />
                </div>
              </div>
              {expanded === g.id && (
                <div className="px-5 pb-5 border-t border-slate-50 pt-4 space-y-3">
                  {g.content && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Nội dung</p>
                      <p className="text-sm text-slate-600 leading-relaxed">{g.content}</p>
                    </div>
                  )}
                  {g.examples?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Ví dụ</p>
                      <ul className="space-y-1">
                        {g.examples.map((ex, i) => (
                          <li key={i} className="text-sm text-slate-600 flex gap-2">
                            <span className="text-primary">•</span> {ex}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 px-5 py-3 shadow-sm">
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

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 z-10 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-5">{editing ? 'Sửa chủ đề' : 'Thêm chủ đề mới'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tiêu đề *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bài</label>
                  <input type="number" value={form.lesson} onChange={e => setForm(f => ({ ...f, lesson: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nội dung</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={3}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Công thức</label>
                <input value={form.formula} onChange={e => setForm(f => ({ ...f, formula: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ví dụ</label>
                {form.examples.map((ex, i) => (
                  <div key={i} className="flex gap-2 mb-1.5">
                    <input value={ex} onChange={e => updateListItem('examples', i, e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
                      placeholder={`Ví dụ ${i + 1}`} />
                    <button type="button" onClick={() => removeListItem('examples', i)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => addListItem('examples')}
                  className="text-xs text-primary font-medium flex items-center gap-1 hover:underline mt-1">
                  <Plus className="w-3 h-3" /> Thêm ví dụ
                </button>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Huỷ
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark disabled:opacity-60">
                  {saving ? 'Đang lưu...' : (editing ? 'Cập nhật' : 'Thêm mới')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
