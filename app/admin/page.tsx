'use client';

import { useEffect, useState } from 'react';
import { Users, FileText, BookOpen, ScrollText, TrendingUp, Award, Activity, ChevronRight, ArrowUpRight, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Stats {
  users: number;
  tests: number;
  questions: number;
  vocabulary: number;
  attempts: number;
}

interface RecentTest {
  id: string;
  title: string;
  type: string;
  total_questions: number;
  is_premium: boolean;
  created_at: string;
}

interface RecentUser {
  id: string;
  full_name: string;
  email?: string;
  created_at: string;
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  trend,
  href,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  bg: string;
  trend?: string;
  href: string;
}) {
  return (
    <Link href={href} className="group bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all block">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
      </div>
      <div className="text-3xl font-bold text-slate-800 mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        {trend && (
          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> {trend}
          </span>
        )}
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl bg-slate-100" />
        <div className="w-4 h-4 rounded bg-slate-100" />
      </div>
      <div className="h-8 w-20 bg-slate-100 rounded-lg mb-2" />
      <div className="h-4 w-28 bg-slate-100 rounded" />
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentTests, setRecentTests] = useState<RecentTest[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [
          { count: users },
          { count: tests },
          { count: questions },
          { count: vocabulary },
          { count: attempts },
          { data: testsData },
          { data: usersData },
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('tests').select('*', { count: 'exact', head: true }),
          supabase.from('questions').select('*', { count: 'exact', head: true }),
          supabase.from('vocabulary').select('*', { count: 'exact', head: true }),
          supabase.from('attempts').select('*', { count: 'exact', head: true }),
          supabase.from('tests').select('id,title,type,total_questions,is_premium,created_at').order('created_at', { ascending: false }).limit(5),
          supabase.from('profiles').select('id,full_name,created_at').order('created_at', { ascending: false }).limit(5),
        ]);

        setStats({
          users: users ?? 0,
          tests: tests ?? 0,
          questions: questions ?? 0,
          vocabulary: vocabulary ?? 0,
          attempts: attempts ?? 0,
        });
        setRecentTests((testsData as RecentTest[]) || []);
        setRecentUsers((usersData as RecentUser[]) || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Hôm nay';
    if (days === 1) return 'Hôm qua';
    return `${days} ngày trước`;
  };

  const testTypeBadge = (type: string) => {
    if (type.includes('full')) return { label: 'Full Test', cls: 'bg-blue-50 text-blue-600' };
    if (type.includes('mini')) return { label: 'Mini Test', cls: 'bg-purple-50 text-purple-600' };
    return { label: type, cls: 'bg-slate-100 text-slate-600' };
  };

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative bg-linear-to-r from-primary to-teal-400 rounded-2xl px-6 py-5 overflow-hidden shadow-lg shadow-teal-900/15">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -right-2 top-6 w-20 h-20 bg-white/10 rounded-full" />
        <div className="relative z-10">
          <p className="text-teal-100 text-sm font-medium mb-1">Chào mừng trở lại 👋</p>
          <h1 className="text-white text-xl font-bold">Lexii Admin Dashboard</h1>
          <p className="text-teal-100 text-sm mt-1">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="Người dùng" value={stats?.users ?? 0} icon={Users} color="text-blue-600" bg="bg-blue-50" trend="+12%" href="/admin/users" />
            <StatCard label="Đề thi" value={stats?.tests ?? 0} icon={FileText} color="text-primary" bg="bg-teal-50" href="/admin/tests" />
            <StatCard label="Câu hỏi" value={stats?.questions ?? 0} icon={Activity} color="text-purple-600" bg="bg-purple-50" href="/admin/tests" />
            <StatCard label="Từ vựng" value={stats?.vocabulary ?? 0} icon={BookOpen} color="text-amber-600" bg="bg-amber-50" href="/admin/vocabulary" />
          </>
        )}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
              <Award className="w-4.5 h-4.5 text-green-600" />
            </div>
            <p className="text-sm font-medium text-slate-600">Lượt thi</p>
          </div>
          <p className="text-2xl font-bold text-slate-800">{loading ? '—' : (stats?.attempts ?? 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <ScrollText className="w-4.5 h-4.5 text-indigo-600" />
            </div>
            <p className="text-sm font-medium text-slate-600">Bài ngữ pháp</p>
          </div>
          <p className="text-2xl font-bold text-slate-800">—</p>
        </div>
        <div className="bg-linear-to-br from-primary to-teal-400 rounded-2xl p-5 shadow-sm">
          <p className="text-teal-100 text-xs font-semibold uppercase tracking-wider mb-2">Premium</p>
          <p className="text-white text-2xl font-bold mb-1">
            {loading ? '—' : recentTests.filter(t => t.is_premium).length}
          </p>
          <p className="text-teal-100 text-sm">Đề thi premium</p>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tests */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-slate-800 text-sm">Đề thi gần đây</h3>
            </div>
            <Link href="/admin/tests" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-40 bg-slate-100 rounded" />
                    <div className="h-3 w-24 bg-slate-100 rounded" />
                  </div>
                </div>
              ))
            ) : recentTests.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">Chưa có đề thi nào</p>
            ) : (
              recentTests.map(test => {
                const badge = testTypeBadge(test.type);
                return (
                  <div key={test.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{test.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${badge.cls}`}>{badge.label}</span>
                        <span className="text-xs text-slate-400">{test.total_questions} câu</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-slate-400 text-xs">
                        <Clock className="w-3 h-3" />
                        {timeAgo(test.created_at)}
                      </div>
                      {test.is_premium && (
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md mt-1 inline-block">
                          Premium
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <h3 className="font-semibold text-slate-800 text-sm">Người dùng mới</h3>
            </div>
            <Link href="/admin/users" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-32 bg-slate-100 rounded" />
                    <div className="h-3 w-20 bg-slate-100 rounded" />
                  </div>
                </div>
              ))
            ) : recentUsers.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">Chưa có người dùng</p>
            ) : (
              recentUsers.map(user => (
                <div key={user.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {(user.full_name || 'U')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{user.full_name || 'Chưa đặt tên'}</p>
                    <p className="text-xs text-slate-400">Tham gia {formatDate(user.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 text-xs shrink-0">
                    <Clock className="w-3 h-3" />
                    {timeAgo(user.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h3 className="font-semibold text-slate-800 text-sm mb-4">Thao tác nhanh</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Thêm đề thi', icon: FileText, color: 'text-primary', bg: 'bg-teal-50', href: '/admin/tests/new' },
            { label: 'Thêm từ vựng', icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50', href: '/admin/vocabulary/new' },
            { label: 'Thêm ngữ pháp', icon: ScrollText, color: 'text-indigo-600', bg: 'bg-indigo-50', href: '/admin/grammar/new' },
            { label: 'Quản lý người dùng', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', href: '/admin/users' },
          ].map(action => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-teal-50/30 transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl ${action.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-5 h-5 ${action.color}`} />
                </div>
                <span className="text-xs font-medium text-slate-600 text-center leading-tight">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
