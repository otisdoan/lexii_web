'use client';

import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import NotificationList from '@/components/notifications/notification-list';
import { getMyNotifications, markAllMyNotificationsAsRead, markMyNotificationAsRead } from '@/lib/api';
import { useNotificationCenter } from '@/lib/use-notification-center';
import { supabase } from '@/lib/supabase';
import type { NotificationItem } from '@/lib/types';

const PAGE_SIZE = 20;

export default function HomeNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { reload } = useNotificationCenter(10);

  const loadPage = async (nextOffset: number, append = false) => {
    const page = await getMyNotifications(PAGE_SIZE, nextOffset);
    setItems((prev) => (append ? [...prev, ...page] : page));
    setOffset(nextOffset + page.length);
    setHasMore(page.length === PAGE_SIZE);
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await loadPage(0, false);
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    let activeChannel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      activeChannel = supabase
        .channel(`notifications-page-home-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_user_id=eq.${user.id}`,
          },
          () => {
            void loadPage(0, false);
          },
        )
        .subscribe();
    });

    return () => {
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-primary flex items-center justify-center">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Tất cả thông báo</h1>
              <p className="text-sm text-slate-500">Cập nhật mới nhất về bài thi và giao dịch của bạn.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await markAllMyNotificationsAsRead();
              await Promise.all([loadPage(0, false), reload()]);
            }}
            className="text-sm font-semibold text-primary hover:text-primary-dark"
          >
            Đánh dấu tất cả đã đọc
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">Đang tải thông báo...</div>
        ) : (
          <NotificationList
            notifications={items}
            onClickItem={async (notification) => {
              if (notification.isRead) return;
              await markMyNotificationAsRead(notification.id);
              setItems((prev) => prev.map((item) => item.id === notification.id ? { ...item, isRead: true } : item));
              await reload();
            }}
          />
        )}

        {!loading && hasMore && (
          <div className="px-4 py-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => void loadPage(offset, true)}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Xem thêm
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
