'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, BookOpen, Headphones, BarChart2, BookMarked, Sparkles, Check, Lock, Star, Loader2, AlertCircle, CheckCircle2, Copy, User as UserIcon } from 'lucide-react';
import { createPayosPayment, getUserProfile } from '@/lib/api';
import { supabase } from '@/lib/supabase';

const PRIMARY = '#1C9C8C';
const PRIMARY_DARK = '#167D70';

type UserTier = 'premium' | 'user';

const SLIDES = [
  {
    Icon: BookOpen,
    color: '#E6F7F5',
    title: '30 đề thi TOEIC ETS mới nhất',
    desc: '12.000 câu hỏi có đáp án và giải thích chi tiết',
  },
  {
    Icon: Headphones,
    color: '#EEF2FF',
    title: 'Luyện nghe chuẩn ETS',
    desc: '600+ audio giúp luyện nghe từ Part 1 đến Part 4',
  },
  {
    Icon: BarChart2,
    color: '#FFF7ED',
    title: 'Phân tích điểm thi thông minh',
    desc: 'Hệ thống tự động phân tích điểm yếu và gợi ý lộ trình học',
  },
  {
    Icon: BookMarked,
    color: '#F5F3FF',
    title: 'Học từ vựng theo chủ đề',
    desc: '3000+ từ vựng TOEIC với flashcard và quiz',
  },
] as const;

const PLANS = [
  {
    id: 0,
    planId: 'premium_6_months' as const,
    planName: 'Goi Premium 6 thang',
    amount: 299000,
    label: '6 tháng',
    price: '299.000đ',
    sub: '49.000đ / tháng',
    badge: null as string | null,
    discount: null as string | null,
    featured: false,
  },
  {
    id: 1,
    planId: 'premium_lifetime' as const,
    planName: 'Goi Premium Tron doi',
    amount: 1499000,
    label: 'Trọn đời',
    price: '1.499.000đ',
    sub: null as string | null,
    badge: 'Phổ biến nhất',
    discount: 'Giảm 50%',
    featured: true,
  },
  {
    id: 2,
    planId: 'premium_1_year' as const,
    planName: 'Goi Premium 1 nam',
    amount: 599000,
    label: '1 năm',
    price: '599.000đ',
    sub: '49.000đ / tháng',
    badge: null as string | null,
    discount: null as string | null,
    featured: false,
  },
];

const FEATURES = [
  { feature: 'Luyện tập part 1,2,5', free: true, premium: true },
  { feature: 'Học lý thuyết', free: true, premium: true },
  { feature: 'Luyện tập FULL 7 dạng bài', free: false, premium: true },
  { feature: 'Sử dụng ngoại tuyến', free: false, premium: true },
  { feature: 'Loại bỏ quảng cáo', free: false, premium: true },
];

interface ReviewItem {
  id: string;
  user_name: string;
  user_avatar?: string;
  rating: number;
  content: string;
}

type ReviewDBRow = {
  id: string;
  profiles: { full_name?: string; avatar_url?: string } | null;
  rating: number;
  content: string;
};

function UpgradePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [slide, setSlide] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState(1);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [userTier, setUserTier] = useState<UserTier>('user');
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [qrContent, setQrContent] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const advance = useCallback(() => setSlide(s => (s + 1) % SLIDES.length), []);

  // Fetch top 5-star reviews
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('id, profiles:user_id(full_name, avatar_url), rating, content')
          .eq('rating', 5)
          .order('likes_count', { ascending: false })
          .limit(10);

        if (error) throw error;

        const mapped: ReviewItem[] = (data as ReviewDBRow[] || []).map((r: ReviewDBRow) => ({
          id: r.id,
          user_name: r.profiles?.full_name || 'Người dùng',
          user_avatar: r.profiles?.avatar_url || '',
          rating: r.rating,
          content: r.content,
        }));

        setReviews(mapped);
      } catch (err) {
        console.error('Error fetching reviews:', err);
      }
    };

    fetchReviews();
  }, []);

  const loadPremiumStatus = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUserTier('user');
      setPremiumExpiresAt(null);
      return;
    }

    try {
      const profile = await getUserProfile(user.id);
      const role = profile.role === 'premium' ? 'premium' : 'user';
      setUserTier(role);
      setPremiumExpiresAt(profile.premium_expires_at ?? null);
    } catch {
      setUserTier('user');
      setPremiumExpiresAt(null);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(advance, 4000);
    return () => clearInterval(id);
  }, [advance]);

  useEffect(() => {
    void loadPremiumStatus();
  }, [loadPremiumStatus]);

  useEffect(() => {
    const status = searchParams.get('status');
    const orderCodeRaw = searchParams.get('orderCode');

    if (!status || !orderCodeRaw) return;

    const orderCode = Number(orderCodeRaw);
    if (!Number.isFinite(orderCode) || orderCode <= 0) {
      setFeedback({ type: 'error', message: 'Mã đơn hàng không hợp lệ. Vui lòng thử lại.' });
      router.replace('/home/upgrade');
      return;
    }

    if (status === 'cancel') {
      router.replace(`/home/upgrade/cancel?orderCode=${orderCode}`);
      return;
    }

    if (status === 'success') {
      router.replace(`/home/upgrade/success?orderCode=${orderCode}`);
      return;
    }

    if (status !== 'success') {
      router.replace('/home/upgrade');
      return;
    }
  }, [loadPremiumStatus, router, searchParams]);

  const handleUpgrade = async () => {
    try {
      setFeedback(null);
      setQrContent(null);
      setIsCreatingPayment(true);

      const selected = PLANS.find(plan => plan.id === selectedPlan) ?? PLANS[1];
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      const session = await createPayosPayment({
        planId: selected.planId,
        planName: selected.planName,
        amount: selected.amount,
        description: 'Lexii Premium',
        userId: user.id,
        returnUrl: `${window.location.origin}/home/upgrade/success`,
        cancelUrl: `${window.location.origin}/home/upgrade/cancel`,
      });

      if (session.checkoutUrl) {
        window.location.href = session.checkoutUrl;
        return;
      }

      if (session.qrCode || session.vietQrData) {
        setQrContent(session.qrCode || session.vietQrData || null);
        setFeedback({ type: 'info', message: 'Vui lòng quét mã QR để hoàn tất thanh toán.' });
        return;
      }

      setFeedback({ type: 'error', message: 'Không nhận được liên kết thanh toán từ hệ thống.' });
    } catch (error: unknown) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Không thể khởi tạo thanh toán. Vui lòng thử lại.',
      });
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/home');
  };

  const copyQrContent = async () => {
    if (!qrContent) return;
    try {
      await navigator.clipboard.writeText(qrContent);
      setFeedback({ type: 'success', message: 'Đã sao chép nội dung QR. Dán vào app ngân hàng để thanh toán.' });
    } catch {
      setFeedback({ type: 'error', message: 'Không thể sao chép nội dung QR.' });
    }
  };

  const { Icon, color: iconBg, title, desc } = SLIDES[slide];

  const premiumExpiryLabel = premiumExpiresAt
    ? new Date(premiumExpiresAt).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F7F9' }}>
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 rounded-md" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div className="max-w-275 mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Quay lại"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <Sparkles className="w-5 h-5 shrink-0" style={{ color: PRIMARY }} />
          <h1 className="text-base font-bold text-slate-800">Nâng cấp Premium</h1>
        </div>
      </div>

      <div className="max-w-275 mx-auto sm:px-6 py-8 flex flex-col gap-8">

        {/* ── Carousel ── */}
        <div
          className="w-full bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}
        >
          <div
            key={slide}
            className="carousel-slide flex flex-col items-center justify-center text-center px-6 sm:px-16 pt-10 pb-6 min-h-50"
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 shrink-0"
              style={{ backgroundColor: iconBg }}
            >
              <Icon className="w-10 h-10" style={{ color: PRIMARY }} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2 leading-snug">{title}</h2>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">{desc}</p>
          </div>

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-2 py-5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                aria-label={`Slide ${i + 1}`}
                className="rounded-full transition-all duration-300 focus:outline-none"
                style={{
                  width: slide === i ? 22 : 8,
                  height: 8,
                  backgroundColor: slide === i ? PRIMARY : '#D1D5DB',
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Social Proof ── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2.5 bg-white rounded-full px-5 py-2.5" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <span className="text-lg leading-none">⭐</span>
            <span className="text-sm font-semibold text-slate-700">4.8/5 từ hơn 3.200 học viên</span>
          </div>
          <div className="flex items-center gap-2.5 bg-white rounded-full px-5 py-2.5" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <span className="text-lg leading-none">🔥</span>
            <span className="text-sm font-semibold text-slate-700">12.000+ người đang học trên Lexii</span>
          </div>
        </div>

        {/* ── Pricing ── */}
        <div>
          <h2 className="text-xl font-bold text-slate-800 text-center mb-7">Chọn gói phù hợp với bạn</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-center">
            {PLANS.map(plan => {
              const isSelected = selectedPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative flex flex-col bg-white text-left cursor-pointer transition-all duration-200 focus:outline-none ${
                    plan.featured ? 'order-first sm:order-0' : ''
                  }`}
                  style={{
                    borderRadius: 16,
                    border: `2px solid ${isSelected || plan.featured ? PRIMARY : '#E5E7EB'}`,
                    boxShadow: plan.featured
                      ? `0 6px 28px rgba(28,156,140,0.16)`
                      : '0 2px 8px rgba(0,0,0,0.05)',
                    transform: isSelected ? 'translateY(-4px)' : 'none',
                    padding: plan.featured ? '32px 24px 28px' : '24px 20px',
                  }}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <span
                      className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 text-white text-[11px] font-bold rounded-full whitespace-nowrap tracking-wide"
                      style={{ backgroundColor: PRIMARY }}
                    >
                      {plan.badge}
                    </span>
                  )}

                  {/* Selected check */}
                  {isSelected && (
                    <div
                      className="absolute top-4 right-4 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: PRIMARY }}
                    >
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  )}

                  <span className="text-sm font-semibold text-slate-400 mb-3 block">{plan.label}</span>

                  <span
                    className="font-black tracking-tight block"
                    style={{
                      fontSize: plan.featured ? '2rem' : '1.5rem',
                      color: PRIMARY,
                      lineHeight: 1.1,
                    }}
                  >
                    {plan.price}
                  </span>

                  {plan.discount && (
                    <span
                      className="mt-2 inline-block text-xs font-bold px-2.5 py-0.5 rounded-full"
                      style={{ backgroundColor: '#FFF3E0', color: '#C84B11' }}
                    >
                      {plan.discount}
                    </span>
                  )}

                  {plan.sub && (
                    <span className="mt-1.5 text-xs text-slate-400 block">{plan.sub}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── CTA ── */}
        <button
          onClick={handleUpgrade}
          disabled={isCreatingPayment}
          className="w-full py-4 rounded-2xl text-white text-base font-bold tracking-wide transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${PRIMARY} 0%, #14B8A6 100%)`,
            boxShadow: `0 8px 24px rgba(28,156,140,0.28)`,
          }}
          onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = `linear-gradient(135deg, ${PRIMARY_DARK} 0%, #0EA5A9 100%)`; }}
          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = `linear-gradient(135deg, ${PRIMARY} 0%, #14B8A6 100%)`; }}
        >
          {isCreatingPayment ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang xử lý thanh toán...
            </span>
          ) : 'Nâng cấp gói đã chọn'}
        </button>

        {feedback && (
          <div className={`rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-green-100 text-green-700'
              : feedback.type === 'error'
                ? 'bg-red-100 text-red-700'
                : 'bg-teal-50 text-teal-700'
          }`}>
            {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {feedback.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
            {feedback.type === 'info' && <Sparkles className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {qrContent && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
            <p className="text-sm font-semibold text-slate-800">Nội dung mã QR thanh toán</p>
            <p className="text-xs text-slate-500">Nếu trang thanh toán không tự mở, bạn có thể sao chép nội dung dưới đây để thanh toán trong app ngân hàng.</p>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 max-h-44 overflow-y-auto">
              <p className="text-xs text-slate-700 break-all">{qrContent}</p>
            </div>
            <button
              onClick={copyQrContent}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              <Copy className="w-4 h-4" />
              Sao chép nội dung QR
            </button>
          </div>
        )}

        {/* Account status */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div>
              <p className="text-sm text-slate-700 font-semibold">
                Trạng thái hiện tại: {userTier === 'premium' ? 'Premium' : 'Miễn phí'}
              </p>
              <p className="text-xs text-slate-500">
                {userTier === 'premium'
                  ? premiumExpiryLabel
                    ? `Gói hiện tại có hiệu lực đến ${premiumExpiryLabel}`
                    : 'Tài khoản của bạn đang có gói trọn đời.'
                  : 'Nâng cấp để mở toàn bộ nội dung học nâng cao.'}
              </p>
            </div>
          </div>
          <div className="flex justify-center gap-2">
            {userTier === 'premium' ? (
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                Premium đang hoạt động
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                Tài khoản miễn phí
              </span>
            )}
          </div>
        </div>

        {/* Feature comparison */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 flex items-center">
            <span className="flex-2 text-[11px] font-bold text-slate-500 tracking-wide">Tính năng</span>
            <span className="w-17.5 text-center text-[11px] font-bold text-slate-500">Miễn phí</span>
            <span className="w-17.5 text-center text-[11px] font-bold text-primary">Premium</span>
          </div>
          {FEATURES.map((f, i) => (
            <div key={i}>
              <hr className="border-slate-100" />
              <div className="px-4 py-3 flex items-center">
                <span className="flex-2 text-sm font-medium text-slate-600">{f.feature}</span>
                <span className="w-17.5 flex justify-center">
                  {f.free ? <Check className="w-5 h-5 text-green-600" /> : <Lock className="w-5 h-5 text-slate-300" />}
                </span>
                <span className="w-17.5 flex justify-center">
                  <Check className="w-5 h-5 text-primary" />
                </span>
              </div>
            </div>
          ))}
          <hr className="border-slate-100" />
          <div className="px-4 py-3 flex items-center">
            <span className="flex-2 text-sm font-medium text-slate-600">Mở khóa đề thi thử</span>
            <span className="w-17.5 text-center text-sm font-bold text-slate-500">3</span>
            <span className="w-17.5 text-center text-sm font-bold text-primary">80+</span>
          </div>
        </div>

        {/* User reviews */}
        <div>
          <h3 className="text-base font-bold text-slate-800 mb-3">Phản hồi của người dùng</h3>
          {reviews.length === 0 ? (
            <div className="bg-white rounded-xl p-6 shadow-sm text-center">
              <p className="text-sm text-slate-500">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {(showAllReviews ? reviews : reviews.slice(0, 5)).map((review) => (
                  <div key={review.id} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-2.5">
                      {review.user_avatar ? (
                        <img src={review.user_avatar} alt={review.user_name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-slate-800">{review.user_name}</p>
                        <div className="flex gap-0.5">
                          {Array.from({ length: review.rating }).map((_, j) => (
                            <Star key={j} className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 italic leading-relaxed">&ldquo;{review.content}&rdquo;</p>
                  </div>
                ))}
              </div>
              {reviews.length > 0 && (
                <button
                  onClick={() => {
                    if (showAllReviews && reviews.length > 5) {
                      setShowAllReviews(false);
                    } else {
                      router.push('/home/settings/reviews');
                    }
                  }}
                  className="mt-4 w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                  style={{
                    backgroundColor: PRIMARY,
                    color: '#fff',
                    boxShadow: `0 4px 12px rgba(28,156,140,0.2)`,
                  }}
                >
                  {showAllReviews && reviews.length > 5 ? 'Thu gọn' : `Xem thêm đánh giá (${reviews.length})`}
                </button>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: '#F5F7F9' }} />}>
      <UpgradePageContent />
    </Suspense>
  );
}
