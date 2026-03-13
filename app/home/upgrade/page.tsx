'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, BookOpen, Headphones, BarChart2, BookMarked, Sparkles, Check, Lock, Star } from 'lucide-react';

const PRIMARY = '#1C9C8C';
const PRIMARY_DARK = '#167D70';

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
    label: '6 tháng',
    price: '299.000đ',
    sub: '49.000đ / tháng',
    badge: null as string | null,
    discount: null as string | null,
    featured: false,
  },
  {
    id: 1,
    label: 'Trọn đời',
    price: '1.499.000đ',
    sub: null as string | null,
    badge: 'Phổ biến nhất',
    discount: 'Giảm 50%',
    featured: true,
  },
  {
    id: 2,
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

const REVIEWS = [
  { name: 'Chàng Thơ', stars: 5, text: '"App cực kỳ chất lượng, đề thi sát với thực tế. Mình đã đạt được 850+ nhờ luyện tập đều đặn trên đây. Rất đáng đồng tiền bát gạo!"' },
  { name: 'Minh Trí', stars: 5, text: '"Giải thích chi tiết từng câu hỏi, rất dễ hiểu. Chỉ sau 2 tháng tôi đã tăng thêm 150 điểm!"' },
];

export default function UpgradePage() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState(1);

  const advance = useCallback(() => setSlide(s => (s + 1) % SLIDES.length), []);

  useEffect(() => {
    const id = setInterval(advance, 4000);
    return () => clearInterval(id);
  }, [advance]);

  const { Icon, color: iconBg, title, desc } = SLIDES[slide];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F7F9' }}>
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 rounded-md" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div className="max-w-275 mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Quay lại"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <Sparkles className="w-5 h-5 shrink-0" style={{ color: PRIMARY }} />
          <h1 className="text-base font-bold text-slate-800">Nâng cấp Premium</h1>
        </div>
      </div>

      <div className="max-w-275 mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">

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
          className="w-full py-4 rounded-2xl text-white text-base font-bold tracking-wide transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${PRIMARY} 0%, #14B8A6 100%)`,
            boxShadow: `0 8px 24px rgba(28,156,140,0.28)`,
          }}
          onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = `linear-gradient(135deg, ${PRIMARY_DARK} 0%, #0EA5A9 100%)`; }}
          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = `linear-gradient(135deg, ${PRIMARY} 0%, #14B8A6 100%)`; }}
        >
          Nâng cấp gói đã chọn
        </button>

        {/* ── Footer links ── */}
        <div className="flex flex-col items-center gap-3 pb-6">
          <button className="text-sm font-medium text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors">
            Khôi phục thanh toán
          </button>
          <button
            onClick={() => router.back()}
            className="text-sm font-semibold transition-colors hover:opacity-80"
            style={{ color: PRIMARY }}
          >
            Bỏ qua và tiếp tục
          </button>
        </div>

        {/* Account status */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <p className="text-sm text-slate-600">
              Tài khoản <span className="font-bold">Phạm Thùy Trang</span> vừa nâng cấp
            </p>
          </div>
          <div className="flex justify-center gap-3">
            {['9', '9', '5', '7'].map((d, i) => (
              <div key={i} className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-xl font-black text-primary">
                {d}
              </div>
            ))}
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
            <span className="w-17.5 text-center text-sm font-bold text-slate-500">4</span>
            <span className="w-17.5 text-center text-sm font-bold text-primary">30</span>
          </div>
        </div>

        {/* User reviews */}
        <div>
          <h3 className="text-base font-bold text-slate-800 mb-3">Phản hồi của người dùng</h3>
          <div className="space-y-3">
            {REVIEWS.map((review, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                    {review.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{review.name}</p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: review.stars }).map((_, j) => (
                        <Star key={j} className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-600 italic leading-relaxed">{review.text}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
