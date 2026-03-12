'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Award, Check, Lock, ChevronRight, Star } from 'lucide-react';

const PLANS = [
  { title: '6 tháng', badge: '10% OFF', price: null, originalPrice: null, discount: null, priceLabel: null, highlighted: false },
  { title: 'Trọn đời', badge: 'Best Choice', price: '1.499.000 đ', originalPrice: '2.998.000 đ', discount: 'GIẢM 50%', priceLabel: null, highlighted: true },
  { title: 'Hàng năm', badge: null, price: '599.000 đ', originalPrice: null, discount: null, priceLabel: 'Chỉ 49.000 đ/tháng', highlighted: false },
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
  const [selectedPlan, setSelectedPlan] = useState(1);

  const buttonLabel = selectedPlan === 0 ? 'Nâng cấp 6 tháng' : selectedPlan === 2 ? 'Nâng cấp hàng năm' : 'Nâng cấp trọn đời';

  return (
    <div className="pb-20 lg:pb-8">
      {/* Header */}
      <div className="bg-primary px-4 py-4 flex items-center gap-3 rounded-md">
        <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-lg font-bold text-white flex-1 text-center pr-10">Nâng cấp</h1>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Feature Banner */}
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award className="w-14 h-14 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">30 đề thi cấu trúc MỚI NHẤT</h2>
          <p className="text-sm text-slate-500 mt-2">12.000 câu hỏi TOEIC đầy đủ đáp án và giải thích chi tiết</p>
          <div className="flex justify-center gap-1.5 mt-4">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="w-2 h-2 rounded-full bg-primary/30" />
            <span className="w-2 h-2 rounded-full bg-primary/30" />
          </div>
        </div>

        {/* Plan selector */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {PLANS.map((plan, i) => (
            <button
              key={i}
              onClick={() => setSelectedPlan(i)}
              className={`shrink-0 ${plan.highlighted ? 'w-52' : 'w-36'} p-4 rounded-2xl border-2 text-left transition-all relative ${
                selectedPlan === i ? 'border-primary shadow-lg shadow-primary/15' : 'border-slate-200'
              } bg-white`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full tracking-wide">
                  Best Choice
                </span>
              )}
              {plan.badge && !plan.highlighted && (
                <span className="inline-block px-2 py-0.5 bg-teal-50 text-primary text-[10px] font-bold rounded-full mb-2">{plan.badge}</span>
              )}
              <p className="text-sm font-bold text-slate-800">{plan.title}</p>
              {plan.price && (
                <p className={`${plan.highlighted ? 'text-xl' : 'text-base'} font-black text-primary mt-2`}>{plan.price}</p>
              )}
              {plan.originalPrice && (
                <p className="text-xs text-slate-400 line-through italic mt-0.5">{plan.originalPrice}</p>
              )}
              {plan.discount && (
                <p className="text-xs font-bold text-orange-500 mt-1">{plan.discount}</p>
              )}
              {plan.priceLabel && (
                <p className="text-[10px] text-slate-500 mt-1">{plan.priceLabel}</p>
              )}
            </button>
          ))}
        </div>

        {/* CTA Button */}
        <button className="w-full py-3.5 bg-primary text-white rounded-full font-bold text-[15px] hover:bg-primary-dark transition-colors">
          {buttonLabel}
        </button>

        {/* Restore & Skip */}
        <div className="text-center space-y-2">
          <button className="text-primary text-sm font-medium underline underline-offset-2">
            Khôi phục thanh toán
          </button>
          <p className="text-xs text-slate-400">
            Bạn có thể trải nghiệm một số phần miễn phí<br />mà không cần nâng cấp.
          </p>
          <button onClick={() => router.back()} className="text-orange-500 text-sm font-bold flex items-center justify-center gap-0.5 mx-auto">
            Bỏ qua và tiếp tục <ChevronRight className="w-4 h-4" />
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
          {/* Header */}
          <div className="bg-slate-50 px-4 py-3 flex items-center">
            <span className="flex-[2] text-[11px] font-bold text-slate-500 tracking-wide">Tính năng</span>
            <span className="w-[70px] text-center text-[11px] font-bold text-slate-500">Miễn phí</span>
            <span className="w-[70px] text-center text-[11px] font-bold text-primary">Premium</span>
          </div>
          {FEATURES.map((f, i) => (
            <div key={i}>
              <hr className="border-slate-100" />
              <div className="px-4 py-3 flex items-center">
                <span className="flex-[2] text-sm font-medium text-slate-600">{f.feature}</span>
                <span className="w-[70px] flex justify-center">
                  {f.free ? <Check className="w-5 h-5 text-green-600" /> : <Lock className="w-5 h-5 text-slate-300" />}
                </span>
                <span className="w-[70px] flex justify-center">
                  <Check className="w-5 h-5 text-primary" />
                </span>
              </div>
            </div>
          ))}
          {/* Exam count row */}
          <hr className="border-slate-100" />
          <div className="px-4 py-3 flex items-center">
            <span className="flex-[2] text-sm font-medium text-slate-600">Mở khóa đề thi thử</span>
            <span className="w-[70px] text-center text-sm font-bold text-slate-500">4</span>
            <span className="w-[70px] text-center text-sm font-bold text-primary">30</span>
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
