'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Edit3, BookOpen, Globe, Moon, Hand, Monitor, Download, Bell,
  Users, Share2, MessageCircle, Star, ChevronRight, LogOut, LogIn, History, Receipt,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getCurrentUserPremiumSubscriptionInfo, getUserStats } from '@/lib/api';

interface SettingsItem {
  icon: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
  showChevron?: boolean;
  onClick?: () => void;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; avatar?: string } | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [stats, setStats] = useState<{ totalTests: number; bestScore: number } | null>(null);
  const [premiumInfo, setPremiumInfo] = useState<{ startedAt: string | null; expiresAt: string | null; isLifetime: boolean } | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (u) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, avatar_url')
          .eq('id', u.id)
          .maybeSingle();

        setUser({
          name: (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || u.email?.split('@')[0] || 'Người dùng',
          email: u.email || '',
          avatar: (profile?.avatar_url as string | undefined) || (u.user_metadata?.avatar_url as string | undefined),
        });
        setIsPremium(profile?.role === 'premium');
        getUserStats(u.id).then(s => setStats(s)).catch(() => {});
        getCurrentUserPremiumSubscriptionInfo()
          .then((info) => {
            if (info) {
              setPremiumInfo({
                startedAt: info.startedAt,
                expiresAt: info.expiresAt,
                isLifetime: info.isLifetime,
              });
            } else {
              setPremiumInfo(null);
            }
          })
          .catch(() => setPremiumInfo(null));
      }
    });
  }, []);

  const formatDate = (value: string | null | undefined) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const comingSoon = () => {
    // Could use a toast library; for now just use alert
  };

  const iconClass = 'w-5 h-5 text-primary';

  const group1: SettingsItem[] = [
    { icon: <Edit3 className={iconClass} />, label: 'Chỉnh sửa hồ sơ', onClick: () => router.push('/home/settings/profile') },
    { icon: <BookOpen className={iconClass} />, label: 'Hướng dẫn sử dụng hiệu quả', onClick: comingSoon },
    { icon: <Globe className={iconClass} />, label: 'Ngôn ngữ ứng dụng', trailing: <span className="text-sm text-slate-500">Tiếng Việt</span>, onClick: comingSoon },
    {
      icon: <Moon className={iconClass} />,
      label: 'Giao diện tối',
      trailing: (
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={darkMode} onChange={e => setDarkMode(e.target.checked)} className="sr-only peer" />
          <div className="w-11 h-6 bg-slate-200 peer-checked:bg-primary rounded-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
        </label>
      ),
      showChevron: false,
    },
  ];

  const group2: SettingsItem[] = [
    { icon: <History className={iconClass} />, label: 'Lịch sử bài làm đề thi', onClick: () => router.push('/home/settings/test-history') },
    { icon: <Receipt className={iconClass} />, label: 'Lịch sử giao dịch', onClick: () => router.push('/home/settings/transactions') },
    { icon: <Hand className={iconClass} />, label: 'Giao diện đáp án', onClick: comingSoon },
    { icon: <Monitor className={iconClass} />, label: 'Hiển thị', onClick: comingSoon },
    { icon: <Download className={iconClass} />, label: 'Quản lý tải xuống', onClick: comingSoon },
    { icon: <Bell className={iconClass} />, label: 'Nhắc nhở học tập', onClick: comingSoon },
  ];

  const group3: SettingsItem[] = [
    { icon: <Users className={iconClass} />, label: 'Tham gia cộng đồng Lexii TOEIC', onClick: comingSoon },
    { icon: <Share2 className={iconClass} />, label: 'Chia sẻ ứng dụng', onClick: comingSoon },
    { icon: <MessageCircle className={iconClass} />, label: 'Phản hồi & hỗ trợ', onClick: () => router.push('/home/support') },
    { icon: <Star className={iconClass} />, label: 'Đánh giá 5 sao', onClick: () => router.push('/home/settings/reviews') },
  ];

  return (
    <div className="pb-20 lg:pb-8">
      {/* Header */}
      <div className="bg-primary px-4 py-4 rounded-md">
        <h1 className="text-lg font-semibold text-white text-center">Cài đặt</h1>
      </div>

      <div className="py-4 space-y-4">
        {/* Profile section */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="mb-3 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="relative shrink-0">
                <div className={isPremium ? 'p-1 rounded-full premium-avatar-ring shadow-[0_0_0_2px_rgba(251,191,36,0.2)]' : ''}>
                  {user?.avatar ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={user.avatar}
                      alt="avatar"
                      className={`w-14 h-14 rounded-full object-cover ${isPremium ? 'border-2 border-white' : ''}`}
                    />
                  ) : (
                    <div className={`w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center text-xl font-bold text-primary ${isPremium ? 'border-2 border-white' : ''}`}>
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{user?.name || 'Người dùng'}</p>
                {user?.email && <p className="text-xs text-slate-500 truncate">{user.email}</p>}
                {isPremium && (
                  <>
                    <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Thành viên đã kích hoạt</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Bắt đầu: {formatDate(premiumInfo?.startedAt)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Hết hạn: {premiumInfo?.isLifetime ? 'Trọn đời' : formatDate(premiumInfo?.expiresAt)}
                    </p>
                  </>
                )}
                <Link href="/home/settings/profile" className="inline-block mt-1 text-xs text-primary font-medium hover:underline">
                  Chỉnh sửa hồ sơ →
                </Link>
              </div>
            </div>
            {user ? (
              <button
                onClick={() => setShowLogoutDialog(true)}
                className="w-full sm:w-auto px-4 py-2 border border-orange-300 text-orange-500 rounded-full text-sm font-semibold hover:bg-orange-50 transition-colors inline-flex items-center justify-center gap-1"
              >
                <LogOut className="w-4 h-4" /> Đăng xuất
              </button>
            ) : (
              <Link
                href="/auth/login"
                className="w-full sm:w-auto px-4 py-2 border border-primary/40 text-primary rounded-full text-sm font-semibold hover:bg-primary/10 transition-colors inline-flex items-center justify-center gap-1"
              >
                <LogIn className="w-4 h-4" /> Đăng nhập
              </Link>
            )}
          </div>
          {stats && (
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-50">
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{stats.totalTests}</p>
                <p className="text-[11px] text-slate-500">Bài thi đã làm</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{stats.bestScore}</p>
                <p className="text-[11px] text-slate-500">Điểm cao nhất</p>
              </div>
            </div>
          )}
        </div>

        {/* Group 1 */}
        <SettingsGroup items={group1} />
        {/* Group 2 */}
        <SettingsGroup items={group2} />
        {/* Group 3 */}
        <SettingsGroup items={group3} />

        {/* Version */}
        <p className="text-xs text-slate-400 text-center pt-4">Phiên bản 1.0.0</p>
      </div>

      {/* Logout dialog */}
      {user && showLogoutDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowLogoutDialog(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="font-semibold text-slate-800 text-lg mb-2">Đăng xuất</h3>
            <p className="text-sm text-slate-500 mb-5">Bạn có chắc chắn muốn đăng xuất không?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowLogoutDialog(false)} className="px-4 py-2 text-sm text-slate-500 font-medium">
                Huỷ
              </button>
              <button onClick={handleLogout} className="px-4 py-2 text-sm text-orange-500 font-semibold">
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsGroup({ items }: { items: SettingsItem[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {items.map((item, i) => (
        <div key={i}>
          <button
            onClick={item.onClick}
            className="w-full px-4 py-3.5 flex items-center gap-4 text-left hover:bg-slate-50 transition-colors"
          >
            {item.icon}
            <span className="flex-1 min-w-0 text-sm font-medium text-slate-600 wrap-break-word">{item.label}</span>
            {item.trailing && <span className="shrink-0">{item.trailing}</span>}
            {(item.showChevron !== false && !item.trailing) && (
              <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
            )}
          </button>
          {i < items.length - 1 && <hr className="ml-14 border-slate-100" />}
        </div>
      ))}
    </div>
  );
}
