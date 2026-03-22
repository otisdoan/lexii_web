'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowLeft, CheckCircle } from 'lucide-react';
import { signUp, signInWithGoogle } from '@/lib/api';

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, fullName);
      setSuccess(true);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Đã có lỗi xảy ra';

      // Handle rate limit error
      if (errorMsg.toLowerCase().includes('rate limit') ||
          errorMsg.toLowerCase().includes('quá nhanh') ||
          errorMsg.toLowerCase().includes('too many requests')) {
        setError('Bạn đã đăng ký quá nhiều lần. Vui lòng đợi vài phút rồi thử lại.');
      } else if (errorMsg.toLowerCase().includes('already registered') ||
                 errorMsg.toLowerCase().includes('already exists')) {
        setError('Email này đã được đăng ký. Vui lòng đăng nhập hoặc sử dụng email khác.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Không thể đăng nhập với Google. Vui lòng thử lại.');
    }
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-teal-50 via-white to-slate-50">
        <div className="w-full max-w-md mx-auto px-6 py-12">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4 shadow-md border border-slate-200">
              <Image src="/lexii.jpg" alt="Lexii logo" width={64} height={64} className="w-full h-full object-cover" priority />
            </div>

            {/* Success icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-2">Đăng ký thành công!</h1>
            <p className="text-slate-500 text-sm mb-6">
              Chúng tôi đã gửi email xác nhận đến <span className="font-semibold text-slate-700">{email}</span>
            </p>

            {/* Instructions */}
            <div className="bg-teal-50 rounded-2xl p-5 mb-6 text-left">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Mail className="w-5 h-5 text-teal-600" />
                Hướng dẫn
              </h3>
              <ol className="text-sm text-slate-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-500 text-white text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Kiểm tra hộp thư <span className="font-medium">{email}</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-500 text-white text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Bấm vào link <span className="font-medium">&quot;Confirm signup&quot;</span> trong email</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-500 text-white text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span> Quay lại trang này và <span className="font-medium">Đăng nhập</span></span>
                </li>
              </ol>
            </div>

            {/* Resend email button */}
            <p className="text-sm text-slate-500 mb-4">
              Không nhận được email?
              <button
                onClick={async () => {
                  try {
                    await signUp(email, password, fullName);
                  } catch {
                    //
                  }
                }}
                className="text-primary font-semibold ml-1 hover:underline"
              >
                Gửi lại
              </button>
            </p>

            {/* Back to login */}
            <button
              onClick={() => router.push('/auth/login')}
              className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay về đăng nhập
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-teal-50 via-white to-slate-50">
      <div className="w-full max-w-md mx-auto px-6 py-12">
  
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4 shadow-md border border-slate-200">
            <Image src="/lexii.jpg" alt="Lexii logo" width={64} height={64} className="w-full h-full object-cover" priority />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Tạo tài khoản mới</h1>
          <p className="text-slate-500 text-sm">Bắt đầu hành trình TOEIC cùng Lexii</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignUp} className="space-y-4">
          {error && (
            <div className="bg-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Full Name */}
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Họ và tên"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
          </div>

          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
          </div>

          {/* Phone */}
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="tel"
              placeholder="Số điện thoại"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Mật khẩu"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Xác nhận mật khẩu"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white rounded-full font-semibold text-lg transition-colors disabled:opacity-60"
          >
            {loading ? 'Đang tạo...' : 'Đăng ký'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-slate-400 text-sm">hoặc</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full py-3.5 border-2 border-slate-200 rounded-2xl font-semibold text-slate-600 flex items-center justify-center gap-3 hover:border-slate-300 hover:bg-slate-50 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Đăng nhập với Google
        </button>

        {/* Login link */}
        <p className="text-center text-sm text-slate-500 mt-6">
          Đã có tài khoản?{' '}
          <button onClick={() => router.push('/auth/login')} className="text-primary font-semibold hover:underline">
            Đăng nhập
          </button>
        </p>
      </div>
    </div>
  );
}
