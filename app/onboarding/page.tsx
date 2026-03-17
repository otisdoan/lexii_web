'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAppStore } from '@/lib/store';
import { BookOpen, Bell, Sparkles, ChevronRight } from 'lucide-react';

const steps = [
  {
    icon: <BookOpen className="w-16 h-16 text-primary" />,
    title: 'Chào mừng đến với Lexii',
    subtitle: 'Ứng dụng luyện thi TOEIC thông minh',
    description: 'Luyện thi TOEIC hiệu quả với hệ thống bài thi thử, luyện nghe, đọc, viết và nói.',
  },
  {
    icon: <Bell className="w-16 h-16 text-primary" />,
    title: 'Nhắc nhở hàng ngày',
    subtitle: 'Không bỏ lỡ ngày luyện tập nào',
    description: 'Thiết lập lời nhắc để duy trì thói quen học tập đều đặn mỗi ngày.',
  },
  {
    icon: <Sparkles className="w-16 h-16 text-primary" />,
    title: 'Sẵn sàng bắt đầu!',
    subtitle: 'Hãy bắt đầu hành trình TOEIC của bạn',
    description: 'Đăng ký ngay để truy cập toàn bộ nội dung luyện thi.',
  },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();
  const setOnboardingCompleted = useAppStore(s => s.setOnboardingCompleted);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    setOnboardingCompleted(true);
    router.push('/home');
  };

  const handleSignUp = () => {
    setOnboardingCompleted(true);
    router.push('/auth/signup');
  };

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-teal-50 via-white to-teal-50">
      <div className="w-full max-w-lg mx-auto px-6">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-10 text-center">
          {/* Logo */}
          <div className="mb-6">
            <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto shadow-md border border-slate-200">
              <Image src="/lexii.jpg" alt="Lexii logo" width={80} height={80} className="w-full h-full object-cover" priority />
            </div>
          </div>

          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 rounded-full bg-teal-50 flex items-center justify-center">
              {step.icon}
            </div>
          </div>

          {/* Content */}
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{step.title}</h1>
          <p className="text-primary font-medium mb-3">{step.subtitle}</p>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">{step.description}</p>

          {/* Dots */}
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentStep ? 'w-8 bg-primary' : 'w-2 bg-slate-200'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          {isLast ? (
            <div className="space-y-3">
              <button
                onClick={handleSignUp}
                className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white rounded-full font-semibold text-lg transition-colors"
              >
                Đăng ký ngay
              </button>
              <button
                onClick={handleSkip}
                className="w-full py-3.5 border-2 border-slate-200 text-slate-500 rounded-2xl font-semibold transition-colors hover:border-slate-300"
              >
                Bỏ qua
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <button
                onClick={handleSkip}
                className="text-slate-400 hover:text-slate-600 font-medium transition-colors"
              >
                Bỏ qua
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-2 py-3 px-8 bg-primary hover:bg-primary-dark text-white rounded-full font-semibold transition-colors"
              >
                Tiếp tục
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Trademark */}
        <p className="text-center text-xs text-slate-400 mt-6">
          TOEIC® is a registered trademark of ETS. This product is not endorsed or approved by ETS.
        </p>
      </div>
    </div>
  );
}
