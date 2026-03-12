'use client';

import { useEffect, useState } from 'react';
import { Search, Users, Crown, User, Trash2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface UserRow {
  id: string;
  full_name: string;
  phone: string;
  role: string;
  avatar_url: string;
  created_at: string;
  email?: string;
}

const PAGE_SIZE = 15;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'premium' | 'user'>('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (roleFilter !== 'all') query = query.eq('role', roleFilter);
      if (search) query = query.ilike('full_name', `%${search}%`);

      const { data, count, error } = await query;
      if (error) throw error;
      setUsers((data as UserRow[]) || []);
      setTotal(count ?? 0);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, roleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(0); load(); };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xoá người dùng này?')) return;
    await supabase.from('profiles').delete().eq('id', id);
    load();
  };

  const handleRoleChange = async (id: string, role: string) => {
    await supabase.from('profiles').update({ role }).eq('id', id);
    load();
  };

  const roleBadge = (role: string) => {
    if (role === 'admin') return 'bg-red-100 text-red-600';
    if (role === 'premium') return 'bg-amber-100 text-amber-600';
    return 'bg-slate-100 text-slate-500';
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Người dùng</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total.toLocaleString()} tài khoản</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors self-start">
          <RefreshCw className="w-4 h-4" /> Làm mới
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </form>
        <div className="flex gap-2">
          {(['all', 'admin', 'premium', 'user'] as const).map(r => (
            <button
              key={r}
              onClick={() => { setRoleFilter(r); setPage(0); }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors border ${
                roleFilter === r ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {r === 'all' ? 'Tất cả' : r === 'admin' ? 'Admin' : r === 'premium' ? 'Premium' : 'User'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Người dùng</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Điện thoại</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ngày tạo</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-slate-100" /><div className="h-3.5 w-32 bg-slate-100 rounded" /></div></td>
                    <td className="px-5 py-3.5"><div className="h-3.5 w-24 bg-slate-100 rounded" /></td>
                    <td className="px-5 py-3.5"><div className="h-5 w-16 bg-slate-100 rounded-full" /></td>
                    <td className="px-5 py-3.5"><div className="h-3.5 w-20 bg-slate-100 rounded" /></td>
                    <td className="px-5 py-3.5" />
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-slate-400 py-12">Không có người dùng nào</td></tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {(user.full_name || 'U')[0].toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-slate-700">{user.full_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{user.phone || '—'}</td>
                    <td className="px-5 py-3.5">
                      <select
                        value={user.role || 'user'}
                        onChange={e => handleRoleChange(user.id, e.target.value)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 outline-none cursor-pointer ${roleBadge(user.role || 'user')}`}
                      >
                        <option value="user">user</option>
                        <option value="premium">premium</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">
                      {new Date(user.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Admin', icon: Crown, color: 'text-red-500', bg: 'bg-red-50', role: 'admin' },
          { label: 'Premium', icon: Crown, color: 'text-amber-500', bg: 'bg-amber-50', role: 'premium' },
          { label: 'User thường', icon: User, color: 'text-blue-500', bg: 'bg-blue-50', role: 'user' },
        ].map(s => (
          <div key={s.role} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm text-center">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mx-auto mb-2`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-sm font-medium text-slate-600">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
