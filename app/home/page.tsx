'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Headphones,
  BookOpen,
  Mic,
  PenTool,
  ChevronRight,
  Clock,
  Target,
  TrendingUp,
  Zap,
  BookMarked,
  Star,
  FileText,
  HelpCircle,
  Lock,
} from 'lucide-react';
import { getCurrentUserRole, getFullTests, getMiniTests } from '@/lib/api';
import type { TestModel } from '@/lib/types';

const skills = [
  {
    title: 'Listening',
    subtitle: 'Luyện nghe',
    icon: Headphones,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    href: '/home/practice/listening',
  },
  {
    title: 'Reading',
    subtitle: 'Luyện đọc',
    icon: BookOpen,
    color: 'bg-green-600',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    href: '/home/practice/reading',
  },
  {
    title: 'Speaking',
    subtitle: 'Luyện nói',
    icon: Mic,
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-600',
    href: '/home/practice/speaking',
  },
  {
    title: 'Writing',
    subtitle: 'Luyện viết',
    icon: PenTool,
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
    href: '/home/practice/writing',
  },
];

export default function HomePage() {
  const [fullTests, setFullTests] = useState<TestModel[]>([]);
  const [miniTests, setMiniTests] = useState<TestModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPremiumUser, setIsPremiumUser] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [ft, mt, role] = await Promise.all([getFullTests(), getMiniTests(), getCurrentUserRole()]);
        setFullTests(ft);
        setMiniTests(mt);
        setIsPremiumUser(role === 'premium' || role === 'admin');
      } catch {
        // Silently handle - will show empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-8 pb-20 lg:pb-8">
      {/* Promo Banner */}
      <div className="bg-linear-to-r from-primary to-teal-500 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 right-12 w-20 h-20 bg-white/10 rounded-full translate-y-6" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5" />
            <span className="text-sm font-medium text-teal-100">Mục tiêu hôm nay</span>
          </div>
          <h3 className="text-xl font-bold mb-1">Hoàn thành 20 câu hỏi</h3>
          <p className="text-sm text-teal-100 mb-4">Duy trì chuỗi ngày luyện tập!</p>
          <div className="w-full bg-white/20 rounded-full h-2.5">
            <div className="bg-white rounded-full h-2.5 w-[15%] transition-all" />
          </div>
          <p className="text-xs text-teal-200 mt-2">3/20 câu hỏi</p>
        </div>
      </div>

      {/* Skills Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Luyện tập kỹ năng</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {skills.map(skill => {
            const Icon = skill.icon;
            const isLocked = (skill.title === 'Speaking' || skill.title === 'Writing') && !isPremiumUser;
            return (
              <Link
                key={skill.title}
                href={isLocked ? '/home/upgrade' : skill.href}
                className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group"
              >
                <div className={`w-12 h-12 ${skill.bgColor} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${skill.textColor}`} />
                </div>
                <h4 className="font-semibold text-slate-800 text-sm">{skill.title}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{isLocked ? 'Premium' : skill.subtitle}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Exam Sections - Side by Side on Web */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Full Tests */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Đề thi phổ biến</h3>
            <Link href="/home/exam" className="text-primary text-sm font-medium flex items-center gap-1 hover:underline">
              Xem thêm <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 animate-pulse">
                  <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              ))
            ) : fullTests.length > 0 ? (
              fullTests.slice(0, 4).map(test => (
                <Link
                  key={test.id}
                  href={test.is_premium && !isPremiumUser
                    ? '/home/upgrade'
                    : `/home/exam/test-start?testId=${test.id}&title=${encodeURIComponent(test.title)}&duration=${test.duration}&total=${test.total_questions}&isPremium=${test.is_premium ? '1' : '0'}`}
                  className="flex items-center gap-4 bg-white rounded-xl border border-slate-100 p-4 hover:shadow-sm hover:border-primary/20 transition-all group"
                >
                  <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-teal-100 transition-colors">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm truncate">{test.title}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{test.duration} phút</span>
                      <span className="flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5" />{test.total_questions} câu</span>
                    </div>
                  </div>
                  {test.is_premium && !isPremiumUser && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full inline-flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Premium
                    </span>
                  )}
                </Link>
              ))
            ) : (
              <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
                <Target className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Chưa có đề thi nào</p>
              </div>
            )}
          </div>
        </section>  

        {/* Mini Tests */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Mini Test</h3>
            <Link href="/home/exam" className="text-primary text-sm font-medium flex items-center gap-1 hover:underline">
              Xem thêm <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 animate-pulse">
                  <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              ))
            ) : miniTests.length > 0 ? (
              miniTests.slice(0, 4).map(test => (
                <Link
                  key={test.id}
                  href={test.is_premium && !isPremiumUser
                    ? '/home/upgrade'
                    : `/home/exam/test-start?testId=${test.id}&title=${encodeURIComponent(test.title)}&duration=${test.duration}&total=${test.total_questions}&isPremium=${test.is_premium ? '1' : '0'}`}
                  className="flex items-center gap-4 bg-white rounded-xl border border-slate-100 p-4 hover:shadow-sm hover:border-primary/20 transition-all group"
                >
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                    <Star className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm truncate">{test.title}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{test.duration} phút</span>
                      <span className="flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5" />{test.total_questions} câu</span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
                <Target className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Chưa có mini test nào</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* History & Notebook */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Test History */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Lịch sử làm bài</h3>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-1">Chưa có lịch sử</p>
            <p className="text-xs text-slate-400">Hoàn thành bài thi đầu tiên để xem kết quả</p>
          </div>
        </section>

        {/* Notebook */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Sổ tay</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-sm transition-shadow cursor-pointer">
              <BookMarked className="w-8 h-8 text-primary mb-2" />
              <h4 className="font-semibold text-slate-800 text-sm">Từ vựng</h4>
              <p className="text-xs text-slate-500 mt-1">0 từ đã lưu</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-sm transition-shadow cursor-pointer">
              <HelpCircle className="w-8 h-8 text-orange-500 mb-2" />
              <h4 className="font-semibold text-slate-800 text-sm">Câu hỏi</h4>
              <p className="text-xs text-slate-500 mt-1">0 câu đã lưu</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
