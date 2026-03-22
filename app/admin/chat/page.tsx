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
  Search,
  Phone,
  MoreVertical,
  AlertCircle,
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

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role?: string | null;
}

interface Conversation {
  id: string;
  user_id: string;
  admin_id: string | null;
  created_at: string;
  last_message_at: string;
  last_message_preview: string | null;
  last_message_sender: string | null;
  unread_admin_count: number;
  unread_user_count: number;
  is_resolved: boolean;
  profile: Profile;
}

// ─── MARK ADMIN READ ─────────────────────────────────────────────────────────
async function markAdminRead(convId: string, adminId: string) {
  await supabase.rpc('mark_admin_read', { conv_id: convId, reader_id: adminId });
}

// ─── CHECK IF USER IS ADMIN ─────────────────────────────────────────────────
async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  return (data?.role as string) === 'admin';
}

// ─── LOAD CONVERSATIONS (with fallback for no role column) ───────────────────
async function loadConversationsAdmin(): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('*, profile:profiles!user_id(id, full_name, avatar_url, role)')
    .order('last_message_at', { ascending: false });

  if (error) {
    console.error('[AdminChat] loadConversations error:', error);
  }

  return (data as Conversation[]) || [];
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AdminChatPage() {
  const router = useRouter();

  const [adminId, setAdminId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const channelAllRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const channelConvRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ─── LOAD conversations từ DB ──────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    const data = await loadConversationsAdmin();
    setConversations(data);
    setLoading(false);
  }, []);

  // ─── LOAD messages cho một conversation ─────────────────────────────────────
  const loadMessages = useCallback(async (conv: Conversation, currentAdminId: string) => {
    setLoadingMessages(true);
    const { data: msgs, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true });

    if (error) console.error('[AdminChat] loadMessages error:', error);

    setMessages(msgs || []);
    setLoadingMessages(false);

    if (currentAdminId) {
      await markAdminRead(conv.id, currentAdminId);
    }

    setConversations(prev => prev.map(c =>
      c.id === conv.id ? { ...c, unread_admin_count: 0 } : c
    ));
  }, []);

  // ─── EFFECT 1: Get admin auth ────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return; }
      setAdminId(user.id);

      // Check role column
      const admin = await checkIsAdmin(user.id);
      setIsAdmin(admin);

      // Always try to load conversations regardless of admin status
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*, profile:profiles!user_id(id, full_name, avatar_url, role)')
        .order('last_message_at', { ascending: false });

      console.log('[AdminChat] Conversations query result:', { count: data?.length, error });

      if (error) {
        console.error('[AdminChat] Error loading conversations:', error);
        setError(error.message);
      }

      if (data && data.length > 0) {
        setError(null);
      }

      setConversations((data as Conversation[]) || []);
      setLoading(false);
    });
  }, [router]);

  // ─── EFFECT 2: Realtime - conversation list ─────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('admin-conv-list')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (adminId) {
            await loadConversations();
            // Show badge in sidebar when there's a new user message
            if (newMsg.sender_role === 'user') {
              setHasNewMessage(true);
              await markAdminRead(newMsg.conversation_id, adminId);
            }
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_conversations' },
        () => {
          if (adminId) loadConversations();
        },
      )
      .subscribe();

    channelAllRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelAllRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminId, loadConversations]);

  // ─── EFFECT 3: Realtime - selected conversation ─────────────────────────────
  useEffect(() => {
    if (!selectedConv) return;

    const channel = supabase
      .channel(`admin-conv-${selectedConv.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${selectedConv.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (adminId && newMsg.sender_role === 'user') {
            await markAdminRead(selectedConv.id, adminId);
            setConversations(prev => prev.map(c =>
              c.id === selectedConv.id ? { ...c, unread_admin_count: 0 } : c
            ));
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
        },
      )
      .subscribe();

    channelConvRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelConvRef.current = null;
    };
  }, [selectedConv, adminId]);

  // ─── Scroll to bottom ────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Select conversation ────────────────────────────────────────────────────
  const handleSelectConv = async (conv: Conversation) => {
    if (!adminId) return;
    setSelectedConv(conv);
    setMessages([]);
    setSearch('');
    setHasNewMessage(false); // Reset new message badge
    await loadMessages(conv, adminId);
  };

  // ─── Send message ───────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!input.trim() || !selectedConv || !adminId || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);

    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: selectedConv.id,
      sender_id: adminId,
      sender_role: 'admin',
      content,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: selectedConv.id,
        sender_id: adminId,
        sender_role: 'admin',
        content,
      })
      .select()
      .single();

    if (error) {
      console.error('[AdminChat] sendMessage error:', error);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setInput(content);
    } else {
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data : m));
      if (adminId) await loadConversations();
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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  // ─── Formatters ─────────────────────────────────────────────────────────────
  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Hôm qua';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatRelativeTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins}p`;
    const diffH = Math.floor(diffMins / 60);
    if (diffH < 24) return `${diffH}gi`;
    return `${Math.floor(diffH / 24)}ngày`;
  };

  const filteredConversations = conversations.filter(c => {
    if (!search.trim()) return true;
    const name = c.profile?.full_name || c.user_id;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const groupedMessages = messages.reduce<Array<{ date: string; msgs: ChatMessage[] }>>((groups, msg) => {
    const key = formatDate(msg.created_at);
    const last = groups[groups.length - 1];
    if (last && last.date === key) last.msgs.push(msg);
    else groups.push({ date: key, msgs: [msg] });
    return groups;
  }, []);

  const getInitials = (name: string | null | undefined, fallbackId?: string) => {
    if (!name) {
      return fallbackId ? fallbackId.slice(0, 2).toUpperCase() : 'U';
    }
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const totalUnread = conversations.reduce((s, c) => s + c.unread_admin_count, 0);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-80px)] rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
      {/* ── LEFT: Conversation List ───────────────────────────────────── */}
      <div className={`${selectedConv ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-80 xl:w-96 border-r border-slate-100 bg-slate-50`}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${hasNewMessage ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-br from-primary to-teal-500'}`}>
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <h2 className="font-bold text-slate-800 text-base">Phản hồi & Hỗ trợ</h2>
              {(totalUnread > 0 || hasNewMessage) && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {totalUnread > 0 ? (totalUnread > 9 ? '9+' : totalUnread) : '!'}
                </span>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm người dùng..."
              className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white border border-transparent focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          )}

          {!loading && error && (
            <div className="mx-3 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-red-600 font-medium">Lỗi: {error}</p>
                  <p className="text-[10px] text-red-400 mt-1">
                    Kiểm tra bảng profiles trong Supabase Dashboard
                  </p>
                </div>
              </div>
            </div>
          )}

          {!loading && filteredConversations.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <MessageCircle className="w-12 h-12 text-slate-200 mb-4" />
              <p className="text-sm text-slate-500 font-medium">
                {search ? 'Không tìm thấy người dùng' : 'Chưa có cuộc trò chuyện nào'}
              </p>
              {!search && (
                <p className="text-xs text-slate-400 mt-1">Người dùng sẽ xuất hiện khi gửi tin nhắn</p>
              )}
            </div>
          )}

          {filteredConversations.map(conv => {
            const name = conv.profile?.full_name || conv.user_id.slice(0, 8) + '...';
            const isActive = selectedConv?.id === conv.id;
            const hasUnread = conv.unread_admin_count > 0;

            return (
              <button
                key={conv.id}
                onClick={() => handleSelectConv(conv)}
                className={`w-full px-4 py-3.5 flex items-start gap-3 hover:bg-slate-100/80 transition-colors text-left border-b border-slate-50 ${isActive ? 'bg-primary/5' : ''}`}
              >
                <div className="relative shrink-0">
                  {conv.profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={conv.profile.avatar_url}
                      alt={name}
                      className={`w-11 h-11 rounded-full object-cover ${hasUnread ? 'ring-2 ring-primary' : 'ring-2 ring-slate-200'}`}
                    />
                  ) : (
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold ${hasUnread ? 'bg-primary text-white ring-2 ring-primary' : 'bg-slate-200 text-slate-600 ring-2 ring-slate-100'}`}>
                      {getInitials(conv.profile?.full_name, conv.user_id)}
                    </div>
                  )}
                  {hasUnread && (
                    <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 rounded-full border-2 border-slate-50 flex items-center justify-center">
                      <span className="text-[8px] text-white font-bold">
                        {conv.unread_admin_count > 9 ? '9+' : conv.unread_admin_count}
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className={`text-sm truncate ${hasUnread ? 'font-bold text-slate-800' : 'font-semibold text-slate-700'}`}>{name}</p>
                    <span className="text-[10px] text-slate-400 shrink-0">{formatRelativeTime(conv.last_message_at)}</span>
                  </div>
                  <p className={`text-xs truncate leading-snug ${hasUnread ? 'text-primary font-medium' : 'text-slate-500'}`}>
                    {conv.last_message_sender === 'admin' ? '✓ ' : ''}{conv.last_message_preview || 'Chưa có tin nhắn'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: Chat Panel ──────────────────────────────────────────── */}
      <div className={`${selectedConv ? 'flex' : 'hidden lg:flex'} flex-col flex-1 min-w-0`}>
        {!selectedConv ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-5">
              <MessageCircle className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">Chọn một cuộc trò chuyện</h3>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
              Chọn cuộc trò chuyện từ danh sách bên trái để bắt đầu trả lời người dùng
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-3 bg-white shrink-0">
              <button
                onClick={() => setSelectedConv(null)}
                className="lg:hidden p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-slate-500"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {selectedConv.profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedConv.profile.avatar_url}
                  alt="avatar"
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  {getInitials(selectedConv.profile?.full_name, selectedConv.user_id)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-800 text-sm truncate">
                    {selectedConv.profile?.full_name || selectedConv.user_id.slice(0, 8) + '...'}
                  </p>
                  {hasNewMessage && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                      <span className="w-1.5 h-1.5 bg-white rounded-full" />
                      Mới
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate">ID: {selectedConv.user_id.slice(0, 8)}...</p>
              </div>

              <div className="flex items-center gap-1">
                <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                  <Phone className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages - scrollable */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 space-y-1 bg-slate-50/50 min-h-0 relative">
              {loadingMessages && (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              )}

              {!loadingMessages && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle className="w-12 h-12 text-slate-200 mb-4" />
                  <p className="text-sm text-slate-500 font-medium">Chưa có tin nhắn nào</p>
                  <p className="text-xs text-slate-400 mt-1">Gửi tin nhắn đầu tiên để bắt đầu cuộc trò chuyện</p>
                </div>
              )}

              {groupedMessages.map(group => (
                <div key={group.date}>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full font-medium shadow-sm">{group.date}</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  <div className="space-y-2.5">
                    {group.msgs.map(msg => {
                      const isMe = msg.sender_role === 'admin';
                      const isSystem = msg.sender_role === 'system';
                      const isOptimistic = msg.id.startsWith('temp-');

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center">
                            <span className="text-xs text-slate-500 bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200">{msg.content}</span>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isOptimistic ? 'opacity-60' : ''}`}
                        >
                          <div className={`max-w-[75%] ${isMe ? 'order-2' : 'order-1'}`}>
                            {!isMe && (
                              <div className="flex items-center gap-2 mb-1.5 ml-1">
                                {selectedConv.profile?.avatar_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={selectedConv.profile.avatar_url} alt="avatar" className="w-5 h-5 rounded-full object-cover shrink-0" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                    <span className="text-[8px] font-bold text-primary">
                                      {getInitials(selectedConv.profile?.full_name, selectedConv.user_id)}
                                    </span>
                                  </div>
                                )}
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {selectedConv.profile?.full_name || 'Người dùng'}
                                </span>
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
                            <div className={`flex items-center gap-1 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'} ${!isMe ? 'ml-6' : ''}`}>
                              <span className="text-[10px] text-slate-400">{formatTime(msg.created_at)}</span>
                              {isMe && (msg.is_read ? <CheckCheck className="w-3.5 h-3.5 text-primary" /> : <Check className="w-3.5 h-3.5 text-slate-400" />)}
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
            <div className="bg-white border-t border-slate-100 px-4 py-3 shrink-0 shadow-[0_-2px_8px_rgba(0,0,0,0.03)]">
              <div className="flex items-end gap-2 bg-slate-50 rounded-2xl border border-slate-200 px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Trả lời người dùng..."
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                  style={{ minHeight: '36px', maxHeight: '120px' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
                    input.trim()
                      ? 'bg-gradient-to-br from-primary to-teal-600 text-white shadow-lg shadow-primary/30 hover:shadow-xl active:scale-95'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
