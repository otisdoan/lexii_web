'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  GraduationCap,
  Sparkles,
  Crown,
  Settings,
  Flame,
  BookText,
  PenTool,
  Headphones,
  Star,
  Menu,
  X,
  Map,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import NotificationBell from '@/components/notifications/notification-bell';
import Footer from '@/components/footer/footer';

interface UserInfo {
  name: string;
  avatar?: string;
  role?: string;
  premiumExpiresAt?: string | null;
}

const navItems = [
  { href: '/home', label: 'Luyện tập', icon: BookOpen },
  { href: '/home/exam', label: 'Thi', icon: GraduationCap },
  { href: '/home/roadmap', label: 'Lộ trình', icon: Map },
  { href: '/home/vocabulary', label: 'Từ vựng', icon: BookText },
  { href: '/home/grammar', label: 'Ngữ pháp', icon: PenTool },
  { href: '/home/upgrade', label: 'Nâng cấp', icon: Sparkles },
  { href: '/home/settings/reviews', label: 'Đánh giá', icon: Star },
  { href: '/home/support', label: 'Liên hệ', icon: Headphones },
  { href: '/home/settings', label: 'Cài đặt', icon: Settings },
];

export default function HomeLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [nowTs] = useState(() => Date.now());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, avatar_url, premium_expires_at')
        .eq('id', user.id)
        .maybeSingle();

      setUserInfo({
        name: (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || user.email?.split('@')[0] || 'U',
        avatar: (profile?.avatar_url as string | undefined) || (user.user_metadata?.avatar_url as string | undefined),
        role: (profile?.role as string | undefined) || 'user',
        premiumExpiresAt: (profile?.premium_expires_at as string | null | undefined) ?? null,
      });
    });
  }, []);

  const isPremium = userInfo?.role === 'premium';
  const premiumExpiryDate = userInfo?.premiumExpiresAt ? new Date(userInfo.premiumExpiresAt) : null;
  const isLifetime = isPremium && !premiumExpiryDate;
  const remainingDays = premiumExpiryDate
    ? Math.max(0, Math.ceil((premiumExpiryDate.getTime() - nowTs) / (1000 * 60 * 60 * 24)))
    : null;
  const premiumExpiryLabel = premiumExpiryDate
    ? premiumExpiryDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  return (
    <div className="flex min-h-screen bg-background overflow-x-hidden">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-100 fixed h-full z-30">
        {/* Logo */}
        <Link href="/home" className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lexii.jpg" alt="Lexii logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Lexii</h1>
            <p className="text-xs text-slate-400">TOEIC® Learning</p>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
              (item.href !== '/home' && pathname.startsWith(item.href));
            const isPracticeActive = item.href === '/home' && (pathname === '/home' || pathname.startsWith('/home/practice'));

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
          {isPremium ? (
            <div className="bg-linear-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 text-white">
              <p className="font-semibold text-sm mb-1">Gói của bạn đang hoạt động</p>
              <p className="text-xs text-emerald-100 mb-3">
                {isLifetime
                  ? 'Gói trọn đời đang hiệu lực'
                  : remainingDays !== null
                    ? `Còn ${remainingDays} ngày (${premiumExpiryLabel})`
                    : 'Đang cập nhật thời hạn gói'}
              </p>
              <Link
                href="/home/settings/profile"
                className="block text-center py-2 bg-white text-emerald-600 rounded-lg text-sm font-semibold hover:bg-emerald-50 transition-colors"
              >
                Xem chi tiết gói
              </Link>
            </div>
          ) : (
            <div className="bg-linear-to-r from-primary to-teal-500 rounded-2xl p-4 text-white">
              <p className="font-semibold text-sm mb-1">Nâng cấp gói</p>
              <p className="text-xs text-teal-100 mb-3">Truy cập toàn bộ nội dung</p>
              <Link
                href="/home/upgrade"
                className="block text-center py-2 bg-white text-primary rounded-lg text-sm font-semibold hover:bg-teal-50 transition-colors"
              >
                Nâng cấp ngay
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-72 bg-white shadow-2xl z-50">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            {/* Logo */}
            <Link href="/home" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/lexii.jpg" alt="Lexii logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Lexii</h1>
                <p className="text-xs text-slate-400">TOEIC® Learning</p>
              </div>
            </Link>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = pathname === item.href ||
                  (item.href !== '/home' && pathname.startsWith(item.href));
                const isPracticeActive = item.href === '/home' && (pathname === '/home' || pathname.startsWith('/home/practice'));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
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
              {isPremium ? (
                <div className="bg-linear-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 text-white">
                  <p className="font-semibold text-sm mb-1">Gói của bạn đang hoạt động</p>
                  <p className="text-xs text-emerald-100 mb-3">
                    {isLifetime
                      ? 'Gói trọn đời đang hiệu lực'
                      : remainingDays !== null
                        ? `Còn ${remainingDays} ngày (${premiumExpiryLabel})`
                        : 'Đang cập nhật thời hạn gói'}
                  </p>
                  <Link
                    href="/home/settings/profile"
                    onClick={() => setSidebarOpen(false)}
                    className="block text-center py-2 bg-white text-emerald-600 rounded-lg text-sm font-semibold hover:bg-emerald-50 transition-colors"
                  >
                    Xem chi tiết gói
                  </Link>
                </div>
              ) : (
                <div className="bg-linear-to-r from-primary to-teal-500 rounded-2xl p-4 text-white">
                  <p className="font-semibold text-sm mb-1">Nâng cấp gói</p>
                  <p className="text-xs text-teal-100 mb-3">Truy cập toàn bộ nội dung</p>
                  <Link
                    href="/home/upgrade"
                    onClick={() => setSidebarOpen(false)}
                    className="block text-center py-2 bg-white text-primary rounded-lg text-sm font-semibold hover:bg-teal-50 transition-colors"
                  >
                    Nâng cấp ngay
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 min-w-0 overflow-x-hidden">
        {/* Top header - web specific */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100">
          <div className="flex items-center justify-between px-6 py-3 max-w-6xl mx-auto">
            {/* Mobile logo */}
            <Link href="/home" className="flex items-center gap-3 lg:hidden">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/lexii.jpg" alt="Lexii logo" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-slate-900">Lexii</span>
            </Link>

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
              <NotificationBell notificationsPageHref="/home/notifications" />
              <Link href="/home/settings/profile" className="block">
                <div className="relative">
                  {isPremium ? (
                    <div className="relative w-11 h-11">
                      <div className="absolute inset-0 rounded-full premium-avatar-ring shadow-[0_0_0_2px_rgba(251,191,36,0.25)]" />
                      <div className="absolute inset-0.5 rounded-full overflow-hidden ring-2 ring-white bg-white">
                        {userInfo?.avatar ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={userInfo.avatar}
                            alt="avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-linear-to-br from-primary to-teal-400 flex items-center justify-center text-white font-semibold text-sm">
                            {userInfo?.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : userInfo?.avatar ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={userInfo.avatar}
                      alt="avatar"
                      className="w-9 h-9 rounded-full object-cover transition-all ring-2 ring-primary/20 hover:ring-primary/50"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-linear-to-br from-primary to-teal-400 flex items-center justify-center text-white font-semibold text-sm hover:opacity-90 transition-opacity">
                      {userInfo?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  {isPremium && (
                    <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-amber-500 border border-white flex items-center justify-center shadow-sm">
                      <Crown className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="max-w-6xl mx-auto w-full max-w-full px-4 sm:px-6 py-6 overflow-x-hidden">
          {children}
        </main>

        {/* Footer */}
        {!pathname.match(/^\/home\/(exam|practice)(\/|$)/) && <Footer />}
      </div>
    </div>
  );
}
