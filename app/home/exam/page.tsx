'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Clock,
  HelpCircle,
  Star,
  Target,
  Mic,
  PenTool,
  ChevronRight,
  Search,
  Lock,
} from 'lucide-react';
import { getAllTests, getCurrentUserRole } from '@/lib/api';
import type { TestModel } from '@/lib/types';

export default function ExamPage() {
  const [tests, setTests] = useState<TestModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'full' | 'mini'>('all');
  const [search, setSearch] = useState('');
  const [isPremiumUser, setIsPremiumUser] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [data, role] = await Promise.all([
          getAllTests(),
          getCurrentUserRole(),
        ]);
        setTests(data);
        setIsPremiumUser(role === 'premium' || role === 'admin');
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const isFullTest = (type: string) => type.trim().startsWith('full');
  const isMiniTest = (type: string) => type.trim().startsWith('mini');

  const filteredTests = tests.filter(t => {
    if (filter === 'full' && !isFullTest(t.type)) return false;
    if (filter === 'mini' && !isMiniTest(t.type)) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const fullTests = filteredTests.filter(t => isFullTest(t.type));
  const miniTests = filteredTests.filter(t => isMiniTest(t.type));

  return (
    <div className="space-y-8 pb-20 lg:pb-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Đề thi TOEIC</h2>
        <p className="text-slate-500 text-sm">Luyện thi với các đề thi mô phỏng thực tế</p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm đề thi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'full', 'mini'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-primary text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-primary/30'
              }`}
            >
              {f === 'all' ? 'Tất cả' : f === 'full' ? 'Full Test' : 'Mini Test'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
              <div className="h-5 bg-slate-100 rounded w-3/4 mb-3" />
              <div className="h-4 bg-slate-100 rounded w-1/2 mb-4" />
              <div className="h-10 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Full Tests */}
          {(filter === 'all' || filter === 'full') && fullTests.length > 0 && (
            <section>
              <h3 className="text-lg font-bold text-slate-800 mb-4">Full Test ({fullTests.length})</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fullTests.map(test => (
                  <TestCard key={test.id} test={test} isPremiumUser={isPremiumUser} />
                ))}
              </div>
            </section>
          )}

          {/* Mini Tests */}
          {(filter === 'all' || filter === 'mini') && miniTests.length > 0 && (
            <section>
              <h3 className="text-lg font-bold text-slate-800 mb-4">Mini Test ({miniTests.length})</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {miniTests.map(test => (
                  <TestCard key={test.id} test={test} variant="mini" isPremiumUser={isPremiumUser} />
                ))}
              </div>
            </section>
          )}

          {/* Speaking & Writing practice */}
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Speaking & Writing</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Link
                href={isPremiumUser ? '/home/practice/speaking' : '/home/upgrade'}
                className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all group"
              >
                <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Mic className="w-7 h-7 text-orange-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-800">Speaking Practice</h4>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {isPremiumUser ? 'Luyện nói với các chủ đề TOEIC' : 'Nâng cấp Premium để mở khóa'}
                  </p>
                </div>
                {isPremiumUser ? <ChevronRight className="w-5 h-5 text-slate-400" /> : <Lock className="w-5 h-5 text-amber-500" />}
              </Link>
              <Link
                href={isPremiumUser ? '/home/practice/writing' : '/home/upgrade'}
                className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all group"
              >
                <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <PenTool className="w-7 h-7 text-purple-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-800">Writing Practice</h4>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {isPremiumUser ? 'Luyện viết theo các dạng bài' : 'Nâng cấp Premium để mở khóa'}
                  </p>
                </div>
                {isPremiumUser ? <ChevronRight className="w-5 h-5 text-slate-400" /> : <Lock className="w-5 h-5 text-amber-500" />}
              </Link>
            </div>
          </section>

          {filteredTests.length === 0 && (
            <div className="text-center py-16">
              <Target className="w-14 h-14 text-slate-300 mx-auto mb-3" />
              <h4 className="font-semibold text-slate-600 mb-1">Không tìm thấy đề thi</h4>
              <p className="text-sm text-slate-400">Thử tìm kiếm với từ khóa khác</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TestCard({
  test,
  variant = 'full',
  isPremiumUser,
}: {
  test: TestModel;
  variant?: 'full' | 'mini';
  isPremiumUser: boolean;
}) {
  const isMini = variant === 'mini';
  const isLocked = test.is_premium && !isPremiumUser;
  const href = isLocked
    ? '/home/upgrade'
    : `/home/exam/test-start?testId=${test.id}&title=${encodeURIComponent(test.title)}&duration=${test.duration}&total=${test.total_questions}&isPremium=${test.is_premium ? '1' : '0'}`;

  return (
    <Link
      href={href}
      className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 ${isMini ? 'bg-indigo-50' : 'bg-teal-50'} rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform`}>
          {isMini ? <Star className="w-5 h-5 text-indigo-600" /> : <FileText className="w-5 h-5 text-primary" />}
        </div>
        {test.is_premium && !isPremiumUser && (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">Premium</span>
        )}
      </div>
      <h4 className="font-semibold text-slate-800 text-sm mb-2 line-clamp-2">{test.title}</h4>
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{test.duration} phút</span>
        <span className="flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5" />{test.total_questions} câu</span>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-50">
        <span className={`text-xs font-medium ${isMini ? 'text-indigo-600' : 'text-primary'}`}>
          {isLocked ? 'Mở khóa Premium →' : 'Bắt đầu làm bài →'}
        </span>
      </div>
    </Link>
  );
}
