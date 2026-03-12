'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  GraduationCap,
  BookMarked,
  Map,
  Crown,
  Settings,
  Bell,
  Flame,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface UserInfo {
  name: string;
  avatar?: string;
}

const navItems = [
  { href: '/home', label: 'Luyện tập', icon: BookOpen },
  { href: '/home/exam', label: 'Thi', icon: GraduationCap },
  { href: '/home/theory', label: 'Lý thuyết', icon: BookMarked },
  { href: '/home/roadmap', label: 'Lộ trình', icon: Map },
  { href: '/home/upgrade', label: 'Nâng cấp', icon: Crown },
  { href: '/home/settings', label: 'Cài đặt', icon: Settings },
];

export default function HomeLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserInfo({
          name: (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || user.email?.split('@')[0] || 'U',
          avatar: user.user_metadata?.avatar_url as string | undefined,
        });
      }
    });
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-100 fixed h-full z-30">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
            <span className="text-white font-bold text-lg">L</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Lexii</h1>
            <p className="text-xs text-slate-400">TOEIC® Learning</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
              (item.href !== '/home' && pathname.startsWith(item.href));
            const isPracticeActive = item.href === '/home' && pathname === '/home';

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive || isPracticeActive
                    ? 'bg-teal-50 text-primary'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-slate-100">
          <div className="bg-gradient-to-r from-primary to-teal-500 rounded-2xl p-4 text-white">
            <p className="font-semibold text-sm mb-1">Nâng cấp Premium</p>
            <p className="text-xs text-teal-100 mb-3">Truy cập toàn bộ nội dung</p>
            <Link
              href="/home/upgrade"
              className="block text-center py-2 bg-white text-primary rounded-lg text-sm font-semibold hover:bg-teal-50 transition-colors"
            >
              Nâng cấp ngay
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        {/* Top header - web specific */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100">
          <div className="flex items-center justify-between px-6 py-3 max-w-6xl mx-auto">
            {/* Mobile logo */}
            <div className="flex items-center gap-3 lg:hidden">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                <span className="text-white font-bold text-sm">L</span>
              </div>
              <span className="font-bold text-slate-900">Lexii</span>
            </div>

            {/* Greeting - desktop */}
            <div className="hidden lg:block">
              <h2 className="text-lg font-bold text-slate-800">
                Xin chào{userInfo?.name ? `, ${userInfo.name}` : ''}! 👋
              </h2>
              <p className="text-sm text-slate-500">Hôm nay bạn muốn học gì?</p>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 rounded-full">
                <Flame className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-600">0</span>
              </div>
              <button className="relative p-2 rounded-full hover:bg-slate-100 transition-colors">
                <Bell className="w-5 h-5 text-slate-500" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <Link href="/home/settings/profile" className="block">
                {userInfo?.avatar ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={userInfo.avatar}
                    alt="avatar"
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/20 hover:ring-primary/50 transition-all"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center text-white font-semibold text-sm hover:opacity-90 transition-opacity">
                    {userInfo?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </main>
      </div>

      {/* Bottom nav - mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-30 safe-area-bottom">
        <div className="flex items-center justify-around py-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
              (item.href !== '/home' && pathname.startsWith(item.href));
            const isPracticeActive = item.href === '/home' && pathname === '/home';

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                  isActive || isPracticeActive ? 'text-primary' : 'text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
