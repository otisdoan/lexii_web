'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getUserProfile, updateUserProfile, getUserStats } from '@/lib/api';

interface ProfileData {
  id: string;
  full_name: string;
  phone: string;
  avatar_url: string;
  role: string;
}

interface Stats {
  totalTests: number;
  bestScore: number;
  avgScore: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Stats>({ totalTests: 0, bestScore: 0, avgScore: 0 });
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }
      setEmail(user.email || '');
      try {
        const [p, s] = await Promise.all([
          getUserProfile(user.id),
          getUserStats(user.id),
        ]);
        setProfile(p);
        setFullName(p.full_name || user.user_metadata?.full_name || '');
        setPhone(p.phone || '');
        setAvatarUrl(p.avatar_url || user.user_metadata?.avatar_url || '');
        setStats(s);
      } catch {
        // Profile may not exist yet, fall back to auth metadata
        setFullName(user.user_metadata?.full_name || user.user_metadata?.name || '');
        setAvatarUrl(user.user_metadata?.avatar_url || '');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);
    try {
      await updateUserProfile(user.id, {
        full_name: fullName.trim(),
        phone: phone.trim(),
        avatar_url: avatarUrl.trim(),
      });
      // Also update auth metadata display name
      await supabase.auth.updateUser({ data: { full_name: fullName.trim() } });
      showToast('success', 'Lưu thành công!');
    } catch {
      showToast('error', 'Lưu thất bại, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Vui lòng chọn file ảnh hợp lệ');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'Ảnh phải nhỏ hơn 2MB');
      return;
    }

    setSaving(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `avatars/${user.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(publicUrl);
      await updateUserProfile(user.id, { avatar_url: publicUrl });
      showToast('success', 'Cập nhật ảnh thành công!');
    } catch {
      showToast('error', 'Tải ảnh thất bại, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  };

  const displayInitial = (fullName || email || 'U')[0].toUpperCase();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-8">
      {/* Header */}
      <div className="bg-primary px-4 py-4 flex items-center gap-3 rounded-md">
        <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-lg font-semibold text-white flex-1 text-center pr-10">Hồ sơ của tôi</h1>
      </div>

      <div className="px-4 py-6 space-y-5">
        {/* Avatar section */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className={profile?.role === 'premium' ? 'p-1.5 rounded-full premium-avatar-ring shadow-[0_0_0_4px_rgba(251,191,36,0.18)]' : ''}>
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={avatarUrl}
                  alt="avatar"
                  className={`w-24 h-24 rounded-full object-cover shadow-lg ${profile?.role === 'premium' ? 'border-4 border-white' : 'ring-4 ring-white'}`}
                />
              ) : (
                <div className={`w-24 h-24 rounded-full bg-linear-to-br from-primary to-teal-400 flex items-center justify-center text-3xl font-bold text-white shadow-lg ${profile?.role === 'premium' ? 'border-4 border-white' : 'ring-4 ring-white'}`}>
                  {displayInitial}
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-md border-2 border-white hover:bg-primary/90 transition-colors"
            >
              <Camera className="w-4 h-4 text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <p className="text-sm text-slate-400">Nhấn vào biểu tượng máy ảnh để thay đổi ảnh</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Bài thi đã làm', value: stats.totalTests },
            { label: 'Điểm cao nhất', value: stats.bestScore },
            { label: 'Điểm trung bình', value: stats.avgScore },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-primary">{item.value}</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-tight">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Thông tin cá nhân</p>
          </div>

          <div className="p-4 space-y-4">
            {/* Full name */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Họ và tên</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Nhập họ và tên"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-400 mt-1">Email không thể thay đổi</p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Số điện thoại</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Nhập số điện thoại"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>

            {/* Role badge */}
            {profile?.role && (
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Vai trò</label>
                {profile.role !== 'premium' ? (
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                    Miễn phí
                  </span>
                ) : (
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                    Đã kích hoạt
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 bg-primary text-white rounded-full font-bold text-[15px] hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : 'Lưu thay đổi'}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-full shadow-lg text-white text-sm font-medium z-50 transition-all ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle className="w-4 h-4" />
            : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
