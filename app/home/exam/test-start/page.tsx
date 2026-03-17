'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ArrowLeft, Clock, HelpCircle, BookOpen, Headphones, AlertCircle, Lock } from 'lucide-react';
import { getCurrentUserRole, getTestById } from '@/lib/api';

function TestStartContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const testId = searchParams.get('testId') || '';
  const title = searchParams.get('title') || 'TOEIC Test';
  const duration = parseInt(searchParams.get('duration') || '120');
  const total = parseInt(searchParams.get('total') || '200');
  const isPremiumParam = searchParams.get('isPremium') === '1';
  const [isLocked, setIsLocked] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      try {
        const [test, role] = await Promise.all([
          testId ? getTestById(testId) : Promise.resolve(null),
          getCurrentUserRole(),
        ]);
        const premiumTest = Boolean(test?.is_premium) || isPremiumParam;
        const premiumUser = role === 'premium' || role === 'admin';
        setIsLocked(premiumTest && !premiumUser);
      } catch {
        setIsLocked(isPremiumParam);
      } finally {
        setCheckingAccess(false);
      }
    }

    void checkAccess();
  }, [isPremiumParam, testId]);

  const handleStart = () => {
    if (isLocked) {
      router.push('/home/upgrade');
      return;
    }
    router.push(`/home/exam/question?testId=${testId}&title=${encodeURIComponent(title)}`);
  };

  if (checkingAccess) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-8">
      {/* Back */}
     

      <div className="max-w-lg mx-auto">
        {/* Card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Wave header */}
          <div className="bg-gradient-to-br from-primary to-teal-500 px-8 py-10 text-white relative">
            <div className="absolute bottom-0 left-0 right-0">
              <svg viewBox="0 0 400 30" className="w-full" preserveAspectRatio="none">
                <path d="M0,30 C100,0 300,0 400,30 L400,30 L0,30 Z" fill="white" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-1">{title}</h2>
            <p className="text-teal-100 text-sm">TOEIC® Listening & Reading Test</p>
          </div>

          {/* Info */}
          <div className="px-8 py-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                <Clock className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-slate-500">Thời gian</p>
                  <p className="font-semibold text-slate-800">{duration} phút</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                <HelpCircle className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-slate-500">Số câu hỏi</p>
                  <p className="font-semibold text-slate-800">{total} câu</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                <Headphones className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-xs text-slate-500">Listening</p>
                  <p className="font-semibold text-slate-800">Part 1-4</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                <BookOpen className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-xs text-slate-500">Reading</p>
                  <p className="font-semibold text-slate-800">Part 5-7</p>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-amber-50 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">Lưu ý:</p>
                  <ul className="list-disc ml-4 space-y-0.5 text-amber-700 text-xs">
                    <li>Đảm bảo kết nối mạng ổn định</li>
                    <li>Chuẩn bị tai nghe cho phần Listening</li>
                    <li>Không thoát khỏi trang khi đang làm bài</li>
                    <li>Thời gian sẽ tự động đếm ngược</li>
                  </ul>
                </div>
              </div>
            </div>

            {isLocked && (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-start gap-2">
                  <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">Đề thi Premium</p>
                    <p className="text-xs text-amber-700">Tài khoản hiện tại cần nâng cấp để bắt đầu đề thi này.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Start button */}
          <div className="px-8 pb-8">
            <button
              onClick={handleStart}
              className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-full font-semibold text-lg transition-colors shadow-md shadow-primary/20"
            >
              {isLocked ? 'Nâng cấp để mở khóa' : 'Bắt đầu làm bài'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TestStartPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>}>
      <TestStartContent />
    </Suspense>
  );
}
