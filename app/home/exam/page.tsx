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

const FULLTEST_YEARS = ['2018', '2019', '2020', '2022', '2023', '2024', '2026'] as const;

function extractYear(title: string): string | null {
  const match = title.match(/\b(201[89]|202[0-46])\b/);
  return match ? match[1] : null;
}

export default function ExamPage() {
  const [tests, setTests] = useState<TestModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'full' | 'mini'>('all');
  const [search, setSearch] = useState('');
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [fulltestYear, setFulltestYear] = useState<string>('all');
  const [openedTestIds, setOpenedTestIds] = useState<Set<string>>(new Set());
  const [fulltestPage, setFulltestPage] = useState(1);
  const FULLTEST_PAGE_SIZE = 10;

  useEffect(() => {
    async function load() {
      try {
        const [data, role] = await Promise.all([
          getAllTests(),
          getCurrentUserRole(),
        ]);
        setTests(data);

        const { supabase } = await import('@/lib/supabase');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: attempts } = await supabase
            .from('attempts')
            .select('test_id')
            .eq('user_id', user.id);
          if (attempts) {
            setOpenedTestIds(new Set(attempts.map((a: { test_id: string }) => a.test_id)));
          }
        }

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

  const miniTests = filteredTests.filter(t => isMiniTest(t.type));

  const fullTests = (() => {
    const base = filteredTests.filter(t => isFullTest(t.type));
    const byYear = fulltestYear === 'all'
      ? base
      : base.filter(t => extractYear(t.title) === fulltestYear);
    return byYear.sort((a, b) => {
      const aOpened = openedTestIds.has(a.id) ? 1 : 0;
      const bOpened = openedTestIds.has(b.id) ? 1 : 0;
      if (aOpened !== bOpened) return bOpened - aOpened;
      return a.title.localeCompare(b.title);
    });
  })();

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
          {(filter === 'all' || filter === 'full') && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">Full Test ({fullTests.length})</h3>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-primary" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <select
                    value={fulltestYear}
                    onChange={e => {
                      setFulltestYear(e.target.value);
                      setFulltestPage(1);
                    }}
                    className="appearance-none pl-9 pr-9 py-2 bg-linear-to-r from-primary/5 to-blue-50 border-2 border-primary/30 rounded-xl text-sm font-semibold text-primary focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/20 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <option value="all">Tất cả</option>
                    {FULLTEST_YEARS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-primary" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              {fullTests.length > 0 ? (
                <>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {fullTests
                      .slice((fulltestPage - 1) * FULLTEST_PAGE_SIZE, fulltestPage * FULLTEST_PAGE_SIZE)
                      .map(test => (
                        <TestCard key={test.id} test={test} isPremiumUser={isPremiumUser} isOpened={openedTestIds.has(test.id)} />
                      ))}
                  </div>
                  {fullTests.length > FULLTEST_PAGE_SIZE && (
                    <div className="flex items-center justify-center gap-1.5 mt-6">
                      <button
                        disabled={fulltestPage === 1}
                        onClick={() => setFulltestPage(p => p - 1)}
                        className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-50 hover:border-blue-300 hover:text-primary transition"
                      >
                        ‹
                      </button>
                      {Array.from({ length: Math.ceil(fullTests.length / FULLTEST_PAGE_SIZE) }, (_, i) => i + 1)
                        .filter(p => {
                          const total = Math.ceil(fullTests.length / FULLTEST_PAGE_SIZE);
                          return p === 1 || p === total || Math.abs(p - fulltestPage) <= 1;
                        })
                        .map((p, idx, arr) => (
                          <span key={p} className="flex items-center">
                            {idx > 0 && arr[idx - 1] !== p - 1 && (
                              <span className="px-1 text-slate-400 text-sm">…</span>
                            )}
                            <button
                              onClick={() => setFulltestPage(p)}
                              className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                                fulltestPage === p
                                  ? 'bg-primary text-white shadow-sm'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-primary'
                              }`}
                            >
                              {p}
                            </button>
                          </span>
                        ))}
                      <button
                        disabled={fulltestPage >= Math.ceil(fullTests.length / FULLTEST_PAGE_SIZE)}
                        onClick={() => setFulltestPage(p => p + 1)}
                        className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-50 hover:border-blue-300 hover:text-primary transition"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
                  <p className="text-slate-400 text-sm">Không có đề nào{fulltestYear !== 'all' ? ` cho năm ${fulltestYear}` : ''}</p>
                </div>
              )}
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
  isOpened,
}: {
  test: TestModel;
  variant?: 'full' | 'mini';
  isPremiumUser: boolean;
  isOpened?: boolean;
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
        <div className="flex gap-1.5">
          {isOpened && !isMini && (
            <span className="px-2 py-0.5 bg-teal-50 text-teal-600 text-xs font-semibold rounded-full">Đã làm</span>
          )}
          {test.is_premium && !isPremiumUser && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">Premium</span>
          )}
        </div>
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
