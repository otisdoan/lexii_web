'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight, Clock3, FileCheck2, RefreshCw } from 'lucide-react';
import { getUserAttemptHistory } from '@/lib/api';
import type { AttemptHistoryItem } from '@/lib/types';

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TestHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<AttemptHistoryItem[]>([]);

  const loadHistory = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const rows = await getUserAttemptHistory(100);
      setItems(rows);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory(false);
  }, [loadHistory]);

  useEffect(() => {
    function handleRefreshOnFocus() {
      void loadHistory(true);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void loadHistory(true);
      }
    }

    window.addEventListener('focus', handleRefreshOnFocus);
    window.addEventListener('pageshow', handleRefreshOnFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleRefreshOnFocus);
      window.removeEventListener('pageshow', handleRefreshOnFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadHistory]);

  return (
    <div className="pb-20 lg:pb-8">
      <div className="bg-primary px-4 py-4 rounded-md flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-lg font-semibold text-white flex-1 text-center pr-10">Lịch sử bài làm</h1>
        <button
          onClick={() => void loadHistory(true)}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
          aria-label="Làm mới lịch sử"
          title="Làm mới"
        >
          <RefreshCw className={`w-5 h-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="py-4 space-y-3">
        {loading && (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
            <div className="h-8 w-8 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-slate-500 mt-3">Đang tải lịch sử...</p>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
            <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">Chưa có bài làm nào</p>
            <p className="text-sm text-slate-500 mt-1">Khi bạn nộp đề thi, lịch sử sẽ xuất hiện ở đây.</p>
          </div>
        )}

        {!loading && items.map((item) => (
          <button
            key={item.id}
            onClick={() => router.push(`/home/settings/test-history/${item.id}`)}
            className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-slate-200 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                <FileCheck2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{item.testTitle}</p>
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                  <Clock3 className="w-3.5 h-3.5" />
                  <span>{formatDateTime(item.submittedAt)}</span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <span className="text-slate-600">Điểm: <b>{item.score}</b></span>
                  <span className="text-slate-600">Đã làm: <b>{item.answeredCount}</b></span>
                  <span className="text-emerald-600">Đúng: <b>{item.correctCount}</b></span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
