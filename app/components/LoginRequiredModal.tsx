'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogIn, X } from 'lucide-react';

interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export default function LoginRequiredModal({
  isOpen,
  onClose,
  title = 'Yêu cầu đăng nhập',
  description = 'Bạn cần đăng nhập để sử dụng tính năng này. Đăng nhập ngay để trải nghiệm!',
}: LoginRequiredModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleLogin = () => {
    onClose();
    router.push('/auth/login');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Decorative top gradient */}
        <div className="h-2 bg-linear-to-r from-primary to-teal-500" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 transition-colors z-10"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>

        {/* Logo & Brand */}
        <div className="pt-8 pb-4 px-6 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md mb-3">
            <Image
              src="/lexii.jpg"
              alt="Lexii logo"
              width={64}
              height={64}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <h3 className="text-2xl font-bold bg-linear-to-r from-primary to-teal-500 bg-clip-text text-transparent">
            Lexii
          </h3>
        </div>

        {/* Content */}
        <div className="px-6 pb-8 text-center">
          {/* Title */}
          <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>

          {/* Description */}
          <p className="text-sm text-slate-500 leading-relaxed mb-7">
            {description}
          </p>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleLogin}
              className="w-full py-3.5 px-6 bg-linear-to-r from-primary to-teal-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Đăng nhập ngay
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 px-6 bg-slate-50 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-100 transition-colors"
            >
              Để sau
            </button>
          </div>
        </div>

        {/* Decorative bottom */}
        <div className="h-1 bg-linear-to-r from-primary/20 to-teal-500/20" />
      </div>
    </div>
  );
}
