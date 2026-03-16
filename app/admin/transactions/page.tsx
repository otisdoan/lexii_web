'use client';

import { useMemo, useState, useEffect } from 'react';
import { Receipt, RefreshCw, Search, CalendarClock, Crown, CheckCircle2, CircleAlert, Clock3, XCircle } from 'lucide-react';
import { getAdminSubscriptionTransactions } from '@/lib/api';
import type { SubscriptionTransactionItem } from '@/lib/types';

const PAGE_SIZE = 15;

type StatusFilter = 'all' | 'pending' | 'paid' | 'cancelled' | 'failed';

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(amount: number, currency = 'VND'): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function statusMeta(status: string): { label: string; className: string; icon: React.ReactNode } {
  const value = status.toLowerCase();
  if (value === 'paid') {
    return {
      label: 'Đã thanh toán',
      className: 'bg-emerald-100 text-emerald-700',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    };
  }
  if (value === 'cancelled') {
    return {
      label: 'Đã hủy',
      className: 'bg-amber-100 text-amber-700',
      icon: <CircleAlert className="w-3.5 h-3.5" />,
    };
  }
  if (value === 'failed') {
    return {
      label: 'Thất bại',
      className: 'bg-red-100 text-red-700',
      icon: <XCircle className="w-3.5 h-3.5" />,
    };
  }
  return {
    label: 'Đang chờ',
    className: 'bg-slate-100 text-slate-700',
    icon: <Clock3 className="w-3.5 h-3.5" />,
  };
}

export default function AdminTransactionsPage() {
  const [rows, setRows] = useState<SubscriptionTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(0);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await getAdminSubscriptionTransactions(500);
      setRows(data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTransactions();
  }, []);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status.toLowerCase() !== statusFilter) return false;
      if (!keyword) return true;

      return (
        row.userName.toLowerCase().includes(keyword) ||
        (row.userPhone || '').toLowerCase().includes(keyword) ||
        row.planName.toLowerCase().includes(keyword) ||
        String(row.orderCode).includes(keyword) ||
        row.userId.toLowerCase().includes(keyword)
      );
    });
  }, [rows, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => {
    if (page >= totalPages) {
      setPage(0);
    }
  }, [page, totalPages]);

  const paidCount = rows.filter((r) => r.status.toLowerCase() === 'paid').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Giao dịch</h1>
          <p className="text-sm text-slate-500 mt-0.5">Quản lý toàn bộ thanh toán gói Premium</p>
        </div>
        <button
          onClick={() => void loadTransactions()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors self-start"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <Receipt className="w-4 h-4" /> Tổng giao dịch
          </div>
          <p className="text-2xl font-bold text-slate-800">{rows.length.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Đã thanh toán
          </div>
          <p className="text-2xl font-bold text-emerald-700">{paidCount.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <CalendarClock className="w-4 h-4 text-primary" /> Tỷ lệ thành công
          </div>
          <p className="text-2xl font-bold text-primary">
            {rows.length > 0 ? `${Math.round((paidCount / rows.length) * 100)}%` : '0%'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Tìm theo tên, SĐT, mã đơn, gói..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'paid', 'cancelled', 'failed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(0);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                statusFilter === status
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {status === 'all'
                ? 'Tất cả'
                : status === 'pending'
                  ? 'Đang chờ'
                  : status === 'paid'
                    ? 'Đã thanh toán'
                    : status === 'cancelled'
                      ? 'Đã hủy'
                      : 'Thất bại'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-245">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Người dùng</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gói</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Thanh toán</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Premium</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 10 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-3.5 w-36 bg-slate-100 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-3.5 w-28 bg-slate-100 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-3.5 w-32 bg-slate-100 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-6 w-24 bg-slate-100 rounded-full" /></td>
                    <td className="px-4 py-3"><div className="h-3.5 w-32 bg-slate-100 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-3.5 w-36 bg-slate-100 rounded" /></td>
                  </tr>
                ))
              ) : pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">Không có giao dịch phù hợp</td>
                </tr>
              ) : (
                pagedRows.map((row) => {
                  const status = statusMeta(row.status);
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-slate-700">{row.userName}</p>
                        <p className="text-xs text-slate-400">{row.userPhone || row.userId}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                          <p className="text-slate-700 font-medium">{row.planName}</p>
                        </div>
                        <p className="text-xs text-slate-400">{row.planId}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="font-semibold text-slate-700">{formatCurrency(row.amount, row.currency)}</p>
                        <p className="text-xs text-slate-400">Mã đơn: {row.orderCode}</p>
                        <p className="text-xs text-slate-400">Nguồn: {row.provider}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}>
                          {status.icon}
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="text-xs text-slate-500">Bắt đầu: {formatDateTime(row.paidAt)}</p>
                        <p className="text-xs text-slate-500">
                          Hết hạn: {row.isLifetime ? 'Trọn đời' : formatDateTime(row.premiumExpiresAt || row.grantedUntil)}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="text-xs text-slate-500">Tạo: {formatDateTime(row.createdAt)}</p>
                        <p className="text-xs text-slate-500">Paid: {formatDateTime(row.paidAt)}</p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredRows.length)} / {filteredRows.length}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                Trước
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
