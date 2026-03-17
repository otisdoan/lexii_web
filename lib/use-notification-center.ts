'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  getMyNotifications,
  getMyUnreadNotificationCount,
  markAllMyNotificationsAsRead,
  markMyNotificationAsRead,
} from '@/lib/api';
import type { NotificationItem } from '@/lib/types';

export function formatNotificationTime(isoTime: string): string {
  const date = new Date(isoTime);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function useNotificationCenter(recentLimit = 10) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) return;

    const [latest, unread] = await Promise.all([
      getMyNotifications(recentLimit, 0),
      getMyUnreadNotificationCount(),
    ]);

    setNotifications(latest);
    setUnreadCount(unread);
    setLoading(false);
  }, [recentLimit, userId]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted) return;
      setUserId(user?.id || null);
      if (!user) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    queueMicrotask(() => {
      void reload();
    });

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${userId}`,
        },
        () => {
          void reload();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reload, userId]);

  const hasUnread = unreadCount > 0;

  const markAllRead = useCallback(async () => {
    await markAllMyNotificationsAsRead();
    await reload();
  }, [reload]);

  const markRead = useCallback(async (notificationId: string) => {
    await markMyNotificationAsRead(notificationId);
    await reload();
  }, [reload]);

  const sortedNotifications = useMemo(() => notifications, [notifications]);

  return {
    notifications: sortedNotifications,
    unreadCount,
    hasUnread,
    loading,
    reload,
    markAllRead,
    markRead,
  };
}
