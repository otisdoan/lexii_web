'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import NotificationList from '@/components/notifications/notification-list';
import { useNotificationCenter } from '@/lib/use-notification-center';

interface NotificationBellProps {
  notificationsPageHref: string;
}

export default function NotificationBell({ notificationsPageHref }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { notifications, unreadCount, markAllRead, markRead } = useNotificationCenter(10);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      const target = event.target as Node;
      if (!menuRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-500" />
        {unreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 px-1 bg-red-600 text-white text-[10px] leading-none font-extrabold rounded-full flex items-center justify-center ring-2 ring-white drop-shadow-sm ${
              unreadCount > 99 ? 'min-w-6 h-5' : 'min-w-5 h-5'
            }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          />
          <div className="fixed left-3 right-3 top-16 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 max-h-[72vh] lg:absolute lg:top-auto lg:left-auto lg:right-0 lg:mt-2 lg:w-90 lg:max-w-[92vw] lg:max-h-none">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h4 className="font-semibold text-slate-900">Thông báo</h4>
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
            >
              Đánh dấu tất cả đã đọc
            </button>
          </div>

          <div className="max-h-[calc(72vh-108px)] overflow-y-auto lg:max-h-110">
            <NotificationList
              notifications={notifications}
              onClickItem={(notification) => {
                if (!notification.isRead) {
                  void markRead(notification.id);
                }
              }}
              emptyMessage="Bạn chưa có thông báo mới."
            />
          </div>

          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
            <Link
              href={notificationsPageHref}
              onClick={() => setOpen(false)}
              className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
            >
              Xem thêm
            </Link>
          </div>
          </div>
        </>
      )}
    </div>
  );
}
