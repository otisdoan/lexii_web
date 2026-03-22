'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { MessageCircle, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PopupConv {
  id: string;
  user_id: string;
  last_message_at: string;
  last_message_preview: string | null;
  unread_admin_count: number;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  } | null;
}

export default function AdminChatPopup() {
  const [convs, setConvs] = useState<PopupConv[]>([]);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('chat_conversations')
        .select('id, user_id, last_message_at, last_message_preview, unread_admin_count, profile:profiles(full_name, avatar_url, email)')
        .eq('is_resolved', false)
        .order('last_message_at', { ascending: false })
        .limit(5);

      if (data) {
        const initialConvs = (data as unknown as PopupConv[]).filter(c => c.unread_admin_count > 0);
        setConvs(initialConvs);
        if (initialConvs.length > 0) setVisible(true);
      }
      setLoading(false);
    };

    load();

    // Realtime: lắng nghe INSERT tin nhắn từ user
    const channel = supabase
      .channel('admin-chat-popup')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: 'sender_role=eq.user',
        },
        async (payload) => {
          const newMsg = payload.new as { conversation_id: string; sender_id: string };
          // Fetch conversation + profile
          const { data: conv } = await supabase
            .from('chat_conversations')
            .select('id, user_id, last_message_at, last_message_preview, unread_admin_count, profile:profiles(full_name, avatar_url, email)')
            .eq('id', newMsg.conversation_id)
            .single();

          if (conv) {
            const fullConv = conv as unknown as PopupConv;
            setConvs(prev => {
              const exists = prev.find(c => c.id === fullConv.id);
              if (exists) {
                return prev.map(c => c.id === fullConv.id ? fullConv : c);
              }
              return [fullConv, ...prev];
            });
            setVisible(true);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_conversations',
        },
        (payload) => {
          const updated = payload.new as PopupConv;
          if (updated.unread_admin_count <= 0) {
            setConvs(prev => prev.filter(c => c.id !== updated.id));
          } else {
            setConvs(prev => {
              const exists = prev.find(c => c.id === updated.id);
              if (exists) {
                return prev.map(c => c.id === updated.id ? updated : c);
              }
              return prev;
            });
          }
          // Auto-hide if no more unread
          setConvs(prev => {
            const remaining = prev.filter(c => c.id !== updated.id || updated.unread_admin_count > 0);
            return remaining;
          });
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const dismiss = (id: string) => {
    setConvs(prev => {
      const next = prev.filter(c => c.id !== id);
      if (next.length === 0) setVisible(false);
      return next;
    });
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins}p`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}gi`;
    return `${Math.floor(diffHours / 24)}ngày`;
  };

  if (loading || !visible || convs.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[9999] flex flex-col gap-2 w-80 max-w-[calc(100vw-32px)]">
      {/* Header bar */}
      <div className="bg-gradient-to-r from-primary to-teal-600 px-4 py-2.5 rounded-t-2xl flex items-center justify-between shadow-xl shadow-primary/20">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-white" />
          <span className="text-white text-xs font-semibold">Tin nhắn mới</span>
          {convs.length > 0 && (
            <span className="bg-white text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {convs.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setVisible(false)}
          className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Conversation list */}
      <div className="bg-white rounded-b-2xl shadow-2xl border border-slate-100 overflow-hidden divide-y divide-slate-50">
        {convs.map(conv => {
          const name = conv.profile?.full_name || conv.profile?.email || 'Người dùng';
          return (
            <Link
              key={conv.id}
              href="/admin/chat"
              className="block px-4 py-3.5 hover:bg-primary/5 transition-colors group"
              onClick={() => dismiss(conv.id)}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="relative shrink-0">
                  {conv.profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={conv.profile.avatar_url}
                      alt={name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                      {getInitials(conv.profile?.full_name)}
                    </div>
                  )}
                  {conv.unread_admin_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                      <span className="text-[8px] text-white font-bold">
                        {conv.unread_admin_count > 9 ? '9+' : conv.unread_admin_count}
                      </span>
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-sm font-bold text-slate-800 truncate">{name}</p>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate leading-snug group-hover:text-primary transition-colors font-medium">
                    {conv.last_message_preview || 'Có tin nhắn mới'}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}

        {/* Footer */}
        <Link
          href="/admin/chat"
          className="block px-4 py-3 text-center text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
          onClick={() => setVisible(false)}
        >
          Xem tất cả →
        </Link>
      </div>
    </div>
  );
}
