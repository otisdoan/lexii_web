'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { confirmPayosPayment } from '@/lib/api';
import { supabase } from '@/lib/supabase';

type VerifyState = 'checking' | 'paid' | 'pending' | 'cancelled' | 'failed' | 'error';

function UpgradeSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderCode = useMemo(() => Number(searchParams.get('orderCode') ?? 0), [searchParams]);

  const [state, setState] = useState<VerifyState>('checking');
  const [message, setMessage] = useState('Dang xac nhan thanh toan...');

  useEffect(() => {
    let isCancelled = false;
    let redirectTimer: ReturnType<typeof setTimeout> | null = null;

    const run = async () => {
      if (!Number.isFinite(orderCode) || orderCode <= 0) {
        setState('error');
        setMessage('Ma don hang khong hop le.');
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        let lastStatus: VerifyState = 'pending';

        for (let attempt = 0; attempt < 5; attempt += 1) {
          const result = await confirmPayosPayment(orderCode, user?.id);

          if (result.status === 'paid') {
            if (isCancelled) return;
            setState('paid');
            setMessage('Thanh toan thanh cong. Dang chuyen ve trang chu...');
            redirectTimer = setTimeout(() => {
              router.replace('/home');
            }, 1500);
            return;
          }

          if (result.status === 'cancelled') {
            if (isCancelled) return;
            setState('cancelled');
            setMessage('Giao dich da bi huy.');
            return;
          }

          if (result.status === 'failed') {
            if (isCancelled) return;
            setState('failed');
            setMessage(result.message || 'Xac nhan thanh toan that bai.');
            return;
          }

          lastStatus = 'pending';
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        if (isCancelled) return;

        if (lastStatus === 'pending') {
          setState('pending');
          setMessage('He thong dang doi xac nhan tu cong thanh toan. Vui long thu lai sau it phut.');
        }
      } catch (error: unknown) {
        if (isCancelled) return;
        setState('error');
        setMessage(error instanceof Error ? error.message : 'Khong the xac nhan thanh toan.');
      }
    };

    void run();

    return () => {
      isCancelled = true;
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [orderCode, router]);

  const isSuccess = state === 'paid';
  const isChecking = state === 'checking';

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex items-start gap-3">
          {isChecking ? (
            <Loader2 className="w-6 h-6 text-primary animate-spin shrink-0" />
          ) : isSuccess ? (
            <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
          ) : (
            <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
          )}

          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isChecking ? 'Dang xu ly thanh toan' : isSuccess ? 'Thanh toan thanh cong' : 'Trang thai thanh toan'}
            </h1>
            <p className="mt-2 text-sm text-slate-600">{message}</p>
            {orderCode > 0 && (
              <p className="mt-1 text-xs text-slate-400">Ma don hang: {orderCode}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/home"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Ve trang chu
          </Link>
          <Link
            href="/home/upgrade"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
          >
            Quay lai nang cap
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function UpgradeSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" />}>
      <UpgradeSuccessContent />
    </Suspense>
  );
}
