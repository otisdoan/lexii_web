'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Send,
  CheckCheck,
  Check,
  Loader2,
  MessageCircle,
  Smile,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: 'user' | 'admin' | 'system';
  content: string;
  is_read: boolean;
  created_at: string;
}

interface UserProfile {
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export default function SupportPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadOrCreateConversation = useCallback(async (uid: string, profile: UserProfile) => {
    setUserProfile(profile);

    // Try to find existing conversation
    const { data: existing } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('user_id', uid)
      .maybeSingle();

    let convId = existing?.id;

    if (!convId) {
      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('chat_conversations')
        .insert({ user_id: uid })
        .select('id')
        .single();

      if (error || !newConv) {
        console.error('Failed to create conversation:', error);
        setLoading(false);
        return;
      }
      convId = newConv.id;
    }

    setConversationId(convId);

    // Load messages
    const { data: msgs } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    setMessages(msgs || []);
    setLoading(false);

    // Mark admin messages as read for user
    if (convId) {
      await supabase.rpc('mark_user_read', { conv_id: convId, reader_id: uid });
    }

    // Realtime subscription
    if (channelRef.current) {
      await channelRef.current.unsubscribe();
    }

    const channel = supabase.channel(`chat-user-${convId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${convId}`,
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // If new message is from admin, mark as read
          if (newMsg.sender_role === 'admin') {
            await supabase.rpc('mark_user_read', { conv_id: convId, reader_id: uid });
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
        },
      )
      .subscribe();

    channelRef.current = channel;
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return; }
      const profile: UserProfile = {
        full_name: (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || user.email?.split('@')[0] || 'User',
        avatar_url: (user.user_metadata?.avatar_url as string | undefined) || null,
        email: user.email || null,
      };
      // Try to get avatar from profiles table
      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('id', user.id)
        .maybeSingle();
      if (dbProfile) {
        profile.avatar_url = (dbProfile.avatar_url as string) || profile.avatar_url;
        profile.full_name = (dbProfile.full_name as string) || profile.full_name;
      }
      setUserId(user.id);
      await loadOrCreateConversation(user.id, profile);
    });

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [router, loadOrCreateConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !conversationId || !userId || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);

    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: userId,
      sender_role: 'user',
      content,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        sender_role: 'user',
        content,
      })
      .select()
      .single();

    if (error || !data) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setInput(content);
    } else {
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data : m));
    }

    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Hôm qua';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const groupedMessages = messages.reduce<Array<{ date: string; msgs: ChatMessage[] }>>((groups, msg) => {
    const dateKey = formatDate(msg.created_at);
    const last = groups[groups.length - 1];
    if (last && last.date === dateKey) {
      last.msgs.push(msg);
    } else {
      groups.push({ date: dateKey, msgs: [msg] });
    }
    return groups;
  }, []);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isOnline = true; // admin is always "online" for UX

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-gradient-to-b from-slate-50 to-white rounded-2xl overflow-hidden">
      {/* Header - cố định */}
      <div className="shrink-0 bg-gradient-to-r from-primary to-teal-600 text-white px-4 py-3.5 flex items-center gap-3 shadow-lg shadow-primary/20">
        <button
          onClick={() => router.push('/home/settings')}
          className="p-1.5 rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Logo & Name */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30 bg-white shrink-0 shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lexii.jpg" alt="Lexii" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-base leading-tight">Hỗ trợ Lexii</p>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
            </div>
            <p className="text-xs text-teal-100">Phản hồi & Hỗ trợ</p>
          </div>
        </div>

        {/* User Avatar */}
        <div className="shrink-0">
          {userProfile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userProfile.avatar_url}
              alt="avatar"
              className="w-9 h-9 rounded-full object-cover ring-2 ring-white/30"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold ring-2 ring-white/30">
              {getInitials(userProfile?.full_name)}
            </div>
          )}
        </div>
      </div>

      {/* Messages - scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-4 space-y-1 min-h-0">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-slate-400">Đang kết nối...</p>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5 shadow-inner">
              <MessageCircle className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-bold text-slate-700 text-lg mb-2">Kết nối với đội ngũ hỗ trợ</h3>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
              Gửi tin nhắn để được đội ngũ Lexii hỗ trợ nhanh chóng. Chúng tôi sẵn sàng giúp bạn 24/7.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              Đội ngũ hỗ trợ đang trực tuyến
            </div>
          </div>
        )}

        {groupedMessages.map(group => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full font-medium shadow-sm">
                {group.date}
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="space-y-2.5">
              {group.msgs.map(msg => {
                const isMe = msg.sender_role === 'user';
                const isSystem = msg.sender_role === 'system';
                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <span className="text-xs text-slate-500 bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200">
                        {msg.content}
                      </span>
                    </div>
                  );
                }
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${msg.id.startsWith('temp-') ? 'opacity-60' : ''}`}
                  >
                    <div className={`max-w-[80%] ${isMe ? 'order-2' : 'order-1'}`}>
                      {/* Avatar for admin messages */}
                      {!isMe && (
                        <div className="flex items-end gap-2 mb-1">
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-sm">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/lexii.jpg" alt="Lexii" className="w-full h-full object-cover rounded-full" />
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">Lexii</span>
                        </div>
                      )}

                      <div
                        className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          isMe
                            ? 'bg-gradient-to-br from-primary to-teal-600 text-white rounded-br-md'
                            : 'bg-white text-slate-700 border border-slate-100 rounded-bl-md'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>

                      <div className={`flex items-center gap-1 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'} ${!isMe ? 'ml-8' : ''}`}>
                        <span className="text-[10px] text-slate-400">{formatTime(msg.created_at)}</span>
                        {isMe && (
                          msg.is_read ? (
                            <CheckCheck className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-slate-400" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-100 px-3 py-3 shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
        <div className="flex items-end gap-2 bg-slate-50 rounded-2xl border border-slate-200 px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn hỗ trợ..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none max-h-32"
            style={{ minHeight: '36px', maxHeight: '128px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
              input.trim()
                ? 'bg-gradient-to-br from-primary to-teal-600 text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:scale-105 active:scale-95'
                : 'bg-slate-200 text-slate-400'
            }`}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-[10px] text-slate-400">Enter gửi · Shift+Enter xuống dòng</p>
          <p className="text-[10px] text-primary font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Trực tuyến
          </p>
        </div>
      </div>
    </div>
  );
}
