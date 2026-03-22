'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  BookOpen,
  ScrollText,
  Receipt,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  BellRing,
  Menu,
  X,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import NotificationBell from '@/components/notifications/notification-bell';
import AdminChatPopup from '@/components/chat/admin-chat-popup';

const NAV_PAGE_SIZE = 10;

interface AdminUser {
  name: string;
  email: string;
  avatar?: string;
}

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Người dùng', icon: Users },
  { href: '/admin/tests', label: 'Đề thi', icon: FileText },
  { href: '/admin/vocabulary', label: 'Từ vựng', icon: BookOpen },
  { href: '/admin/grammar', label: 'Ngữ pháp', icon: ScrollText },
  { href: '/admin/transactions', label: 'Giao dịch', icon: Receipt },
  { href: '/admin/notifications', label: 'Thông báo', icon: BellRing },
  { href: '/admin/chat', label: 'Phản hồi', icon: MessageSquare },
  { href: '/admin/settings', label: 'Cài đặt', icon: Settings },
];

interface SidebarProps {
  pathname: string;
  user: AdminUser | null;
  onClose: () => void;
  onSignOut: () => void;
}

function SidebarContent({ pathname, user, onClose, onSignOut }: SidebarProps) {
  const isActive = (item: typeof navItems[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const [navPage, setNavPage] = useState(0);
  const [totalUnread, setTotalUnread] = useState(0);
  const totalNavPages = Math.ceil(navItems.length / NAV_PAGE_SIZE);
  const visibleItems = navItems.slice(navPage * NAV_PAGE_SIZE, (navPage + 1) * NAV_PAGE_SIZE);

  // Fetch and listen for unread messages
  useEffect(() => {
    const fetchUnread = async () => {
      // Get total unread (messages where is_read = false and sender_role = user)
      const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_role', 'user')
        .eq('is_read', false);

      setTotalUnread(count || 0);
    };

    fetchUnread();

    // Realtime subscription
    const channel = supabase
      .channel('admin-sidebar-unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => {
        fetchUnread();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/20 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/lexii.jpg?v=2"
              alt="Lexii logo"
              className="w-full h-full object-cover"
              onError={(event) => {
                event.currentTarget.src = '/next.svg';
              }}
            />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">Lexii</h1>
            <p className="text-teal-200 text-xs mt-0.5 font-medium">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 flex flex-col overflow-y-auto">
        <div className="space-y-1 flex-1">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item);
            const isChat = item.href === '/admin/chat';
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group relative ${
                  active
                    ? 'bg-white text-primary shadow-lg shadow-black/10'
                    : 'text-teal-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-primary' : 'text-teal-200 group-hover:text-white'}`} />
                  {isChat && totalUnread > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                      {totalUnread > 9 ? '9+' : totalUnread}
                    </span>
                  )}
                </div>
                {item.label}
                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-primary/50" />}
              </Link>
            );
          })}
        </div>

        {/* Nav pagination */}
        {totalNavPages > 1 && (
          <div className="flex items-center justify-between px-2 pt-3 mt-2 border-t border-white/10">
            <span className="text-xs text-teal-300">
              {navPage + 1} / {totalNavPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setNavPage(p => Math.max(0, p - 1))}
                disabled={navPage === 0}
                className="p-1 rounded-lg text-teal-200 hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setNavPage(p => Math.min(totalNavPages - 1, p + 1))}
                disabled={navPage >= totalNavPages - 1}
                className="p-1 rounded-lg text-teal-200 hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* User & Sign Out */}
      <div className="px-3 py-4 border-t border-white/10 space-y-2">
        {user && (
          <div className="flex items-center gap-3 px-4 py-3">
            {user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover ring-2 ring-white/30" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {user.name[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">{user.name}</p>
              <p className="text-teal-300 text-xs truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-teal-200 hover:bg-white/10 hover:text-white transition-all"
        >
          <LogOut className="w-4 h-4" />
          Đăng xuất
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return; }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single();
      if (!profile || profile.role !== 'admin') { router.push('/home'); return; }
      setUser({
        name: (profile.full_name as string) || (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'Admin',
        email: user.email || '',
        avatar: user.user_metadata?.avatar_url as string | undefined,
      });
    });
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const activeLabel = navItems.find(i =>
    i.exact ? pathname === i.href : pathname.startsWith(i.href)
  )?.label ?? 'Admin';

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-linear-to-b from-primary-dark to-teal-900 fixed h-full z-30 shadow-2xl shadow-teal-900/40">
        <SidebarContent pathname={pathname} user={user} onClose={() => {}} onSignOut={handleSignOut} />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-72 bg-linear-to-b from-primary-dark to-teal-900 shadow-2xl z-50">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent pathname={pathname} user={user} onClose={() => setSidebarOpen(false)} onSignOut={handleSignOut} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-base font-bold text-slate-800 leading-none">{activeLabel}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Lexii Admin Panel</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell notificationsPageHref="/admin/notifications" />
              {user?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt="avatar" className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/20 ml-4" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-linear-to-br from-primary to-teal-400 flex items-center justify-center text-white font-bold text-sm">
                  {user?.name?.[0]?.toUpperCase() || 'A'}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 sm:px-6 py-6">
          {children}
        </main>
      </div>

      {/* Chat popup */}
      <AdminChatPopup />
    </div>
  );
}
