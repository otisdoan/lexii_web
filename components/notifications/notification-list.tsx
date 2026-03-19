'use client';

import type { NotificationItem } from '@/lib/types';
import { formatNotificationTime } from '@/lib/use-notification-center';

interface NotificationListProps {
  notifications: NotificationItem[];
  onClickItem?: (notification: NotificationItem) => void;
  emptyMessage?: string;
}

export default function NotificationList({
  notifications,
  onClickItem,
  emptyMessage = 'Chưa có thông báo nào.',
}: NotificationListProps) {
  if (!notifications.length) {
    return (
      <div className="py-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {notifications.map((notification) => (
        <button
          key={notification.id}
          type="button"
          onClick={() => onClickItem?.(notification)}
          className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="pt-1.5">
              {!notification.isRead ? (
                <span className="block w-2.5 h-2.5 rounded-full bg-red-500" />
              ) : (
                <span className="block w-2.5 h-2.5 rounded-full bg-slate-200" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className={`min-w-0 flex-1 text-sm wrap-break-word ${notification.isRead ? 'text-slate-600' : 'text-slate-900 font-semibold'}`}>
                  {notification.title}
                </p>
                <span className="text-xs text-slate-400 shrink-0">
                  {formatNotificationTime(notification.createdAt)}
                </span>
              </div>
              <p className={`text-sm mt-1 wrap-break-word ${notification.isRead ? 'text-slate-500' : 'text-slate-700'}`}>
                {notification.body}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
