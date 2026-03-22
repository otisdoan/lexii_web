'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CreditCard, CheckCircle, Clock, XCircle, AlertCircle, Crown } from 'lucide-react';
import { getUserTransactions } from '@/lib/api';
import type { SubscriptionTransactionItem } from '@/lib/types';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<SubscriptionTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserTransactions()
      .then(setTransactions)
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatMoney = (amount: number, currency = 'VND') => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusInfo = (status: string) => {
    const value = status.toLowerCase();
    if (value === 'paid') {
      return { icon: <CheckCircle className="w-4 h-4 text-emerald-500" />, label: 'Thành công', className: 'bg-emerald-50 text-emerald-700' };
    }
    if (value === 'pending') {
      return { icon: <Clock className="w-4 h-4 text-amber-500" />, label: 'Đang xử lý', className: 'bg-amber-50 text-amber-700' };
    }
    if (value === 'cancelled') {
      return { icon: <XCircle className="w-4 h-4 text-orange-500" />, label: 'Đã hủy', className: 'bg-orange-50 text-orange-700' };
    }
    if (value === 'failed') {
      return { icon: <XCircle className="w-4 h-4 text-red-500" />, label: 'Thất bại', className: 'bg-red-50 text-red-700' };
    }
    return { icon: <Clock className="w-4 h-4 text-slate-500" />, label: status, className: 'bg-slate-100 text-slate-600' };
  };

  const getProviderLabel = (provider: string) => {
    const providers: Record<string, string> = {
      payos: 'PayOS',
      vnpay: 'VNPay',
      momo: 'MoMo',
      zalopay: 'ZaloPay',
      stripe: 'Stripe',
      bank_transfer: 'Chuyển khoản',
    };
    return providers[provider.toLowerCase()] || provider;
  };

  const getPlanDuration = (planId: string) => {
    if (planId.includes('lifetime')) return 'Trọn đời';
    if (planId.includes('6')) return '6 tháng';
    if (planId.includes('1_year')) return '1 năm';
    if (planId.includes('1month')) return '1 tháng';
    return '';
  };

  const totalSpent = transactions
    .filter(t => t.status.toLowerCase() === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="pb-20 lg:pb-8">
      {/* Header */}
      <div className="rounded-md bg-primary px-4 py-4 flex items-center gap-3">
        <Link href="/home/settings" className="text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold text-white flex-1">Lịch sử giao dịch</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Summary card */}
        {transactions.length > 0 && (
          <div className="bg-linear-to-r from-primary to-teal-500 rounded-2xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-teal-100">Tổng chi tiêu</p>
                <p className="text-2xl font-bold">{formatMoney(totalSpent)}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>
          </div>
        )}

        {/* Help text */}
        <div className="bg-blue-50 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            Nếu có vấn đề về giao dịch, vui lòng liên hệ admin qua mục <Link href="/home/support" className="font-medium underline">Liên hệ</Link> để được hỗ trợ.
          </p>
        </div>

        {/* Transaction list */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-500 mt-2">Đang tải...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CreditCard className="w-8 h-8 text-slate-400" />
            </div>
            <p className="font-medium text-slate-700">Chưa có giao dịch nào</p>
            <p className="text-sm text-slate-500 mt-1">Các giao dịch của bạn sẽ hiển thị ở đây</p>
            <Link href="/home/upgrade" className="inline-block mt-4 px-4 py-2 bg-primary text-white text-sm font-medium rounded-full hover:bg-primary/90 transition-colors">
              Nâng cấp gói Premium
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const statusInfo = getStatusInfo(tx.status);
              return (
                <div key={tx.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
                        <Crown className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{tx.planName}</p>
                        <p className="text-xs text-slate-500">{getPlanDuration(tx.planId)}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.className}`}>
                      {statusInfo.icon}
                      {statusInfo.label}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs">Số tiền</p>
                      <p className="font-semibold text-slate-700">{formatMoney(tx.amount, tx.currency)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Phương thức</p>
                      <p className="font-medium text-slate-700">{getProviderLabel(tx.provider)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Mã đơn hàng</p>
                      <p className="font-medium text-slate-700 font-mono text-xs">#{tx.orderCode}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Ngày tạo</p>
                      <p className="font-medium text-slate-700 text-xs">{formatDate(tx.createdAt)}</p>
                    </div>
                    {tx.paidAt && (
                      <div>
                        <p className="text-slate-500 text-xs">Ngày thanh toán</p>
                        <p className="font-medium text-slate-700 text-xs">{formatDate(tx.paidAt)}</p>
                      </div>
                    )}
                    {tx.isLifetime ? (
                      <div>
                        <p className="text-slate-500 text-xs">Hết hạn</p>
                        <p className="font-medium text-emerald-600">Trọn đời</p>
                      </div>
                    ) : tx.grantedUntil ? (
                      <div>
                        <p className="text-slate-500 text-xs">Hết hạn</p>
                        <p className="font-medium text-slate-700 text-xs">{formatDate(tx.grantedUntil)}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
