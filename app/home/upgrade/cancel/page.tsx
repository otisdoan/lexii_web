'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { XCircle } from 'lucide-react';

function UpgradeCancelContent() {
  const searchParams = useSearchParams();
  const orderCode = searchParams.get('orderCode');

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex items-start gap-3">
          <XCircle className="w-6 h-6 text-amber-600 shrink-0" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Ban da huy thanh toan</h1>
            <p className="mt-2 text-sm text-slate-600">
              Giao dich chua duoc thuc hien. Ban co the quay lai de chon goi va thanh toan lai bat ky luc nao.
            </p>
            {orderCode && (
              <p className="mt-1 text-xs text-slate-400">Ma don hang: {orderCode}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/home/upgrade"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Thu lai thanh toan
          </Link>
          <Link
            href="/home"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
          >
            Ve trang chu
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function UpgradeCancelPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" />}>
      <UpgradeCancelContent />
    </Suspense>
  );
}
