'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, FileText, ChevronLeft, ChevronRight, RefreshCw, Crown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { TestModel } from '@/lib/types';

const PAGE_SIZE = 12;

type TestType = 'all' | 'full_test' | 'mini_test';

export default function AdminTestsPage() {
  const [tests, setTests] = useState<TestModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TestType>('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [editingTest, setEditingTest] = useState<TestModel | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'full_test', duration: 120, total_questions: 200, is_premium: false });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('tests')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (typeFilter === 'full_test') query = query.or('type.eq.full_test,type.ilike.full%');
      if (typeFilter === 'mini_test') query = query.eq('type', 'mini_test');
      if (search) query = query.ilike('title', `%${search}%`);

      const { data, count, error } = await query;
      if (error) throw error;
      setTests((data as TestModel[]) || []);
      setTotal(count ?? 0);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, typeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(0); load(); };

  const openCreate = () => {
    setEditingTest(null);
    setForm({ title: '', type: 'full_test', duration: 120, total_questions: 200, is_premium: false });
    setShowForm(true);
  };

  const openEdit = (test: TestModel) => {
    setEditingTest(test);
    setForm({ title: test.title, type: test.type, duration: test.duration, total_questions: test.total_questions, is_premium: test.is_premium });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingTest) {
        await supabase.from('tests').update(form).eq('id', editingTest.id);
      } else {
        await supabase.from('tests').insert(form);
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
    if (!confirm('Xoá đề thi này?')) return;
    await supabase.from('tests').delete().eq('id', id);
    load();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const typeBadge = (type: string) => {
    if (type.toLowerCase().includes('full')) return { label: 'Full Test', cls: 'bg-blue-50 text-blue-600' };
    if (type.toLowerCase().includes('mini')) return { label: 'Mini Test', cls: 'bg-purple-50 text-purple-600' };
    return { label: type, cls: 'bg-slate-100 text-slate-500' };
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Đề thi</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total.toLocaleString()} đề thi</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Thêm đề thi
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
            placeholder="Tìm theo tên đề thi..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </form>
        <div className="flex gap-2">
          {(['all', 'full_test', 'mini_test'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setPage(0); }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors border ${
                typeFilter === t ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {t === 'all' ? 'Tất cả' : t === 'full_test' ? 'Full Test' : 'Mini Test'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse shadow-sm">
              <div className="h-4 w-48 bg-slate-100 rounded mb-3" />
              <div className="h-3 w-24 bg-slate-100 rounded mb-4" />
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-slate-100 rounded-full" />
                <div className="h-6 w-16 bg-slate-100 rounded-full" />
              </div>
            </div>
          ))
        ) : tests.length === 0 ? (
          <div className="col-span-3 text-center text-slate-400 py-16">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Chưa có đề thi nào</p>
          </div>
        ) : (
          tests.map(test => {
            const badge = typeBadge(test.type);
            return (
              <div key={test.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-slate-800 text-sm leading-snug flex-1 pr-2">{test.title}</h3>
                  {test.is_premium && <Crown className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-500">{test.total_questions} câu</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-500">{test.duration} phút</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">{new Date(test.created_at).toLocaleDateString('vi-VN')}</p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(test)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-teal-50 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(test.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 px-5 py-3 shadow-sm">
          <p className="text-xs text-slate-500">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total}</p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            <h2 className="text-lg font-bold text-slate-800 mb-5">{editingTest ? 'Sửa đề thi' : 'Thêm đề thi mới'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tên đề thi</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="TOEIC Full Test 1..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Loại</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="full_test">Full Test</option>
                    <option value="mini_test">Mini Test</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Thời gian (phút)</label>
                  <input
                    type="number"
                    value={form.duration}
                    onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Số câu hỏi</label>
                <input
                  type="number"
                  value={form.total_questions}
                  onChange={e => setForm(f => ({ ...f, total_questions: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_premium}
                  onChange={e => setForm(f => ({ ...f, is_premium: e.target.checked }))}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm text-slate-700">Đề thi Premium</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                  Huỷ
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60">
                  {saving ? 'Đang lưu...' : (editingTest ? 'Cập nhật' : 'Thêm mới')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
