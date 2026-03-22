'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Đang xác nhận...');

  useEffect(() => {
    async function handleConfirm() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          setStatus('error');
          setMessage('Xác nhận thất bại. Vui lòng thử đăng nhập lại.');
          setTimeout(() => router.push('/auth/login'), 3000);
          return;
        }

        if (!session) {
          const { data, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !data.session) {
            setStatus('error');
            setMessage('Xác nhận thất bại. Vui lòng thử đăng nhập lại.');
            setTimeout(() => router.push('/auth/login'), 3000);
            return;
          }
        }

        setStatus('success');
        setMessage('Xác nhận thành công! Đang chuyển hướng...');
        setTimeout(() => {
          router.push('/home');
          router.refresh();
        }, 1500);
      } catch {
        setStatus('error');
        setMessage('Đã xảy ra lỗi. Vui lòng thử đăng nhập lại.');
        setTimeout(() => router.push('/auth/login'), 3000);
      }
    }

    handleConfirm();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-teal-50 via-white to-slate-50">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-slate-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Xác nhận thành công!</h1>
            <p className="text-slate-500">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-4xl">❌</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Xác nhận thất bại</h1>
            <p className="text-slate-500">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-teal-50 via-white to-slate-50">
        <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}
