'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  Camera,
  X,
  Send,
  Loader2,
  User,
  ChevronDown,
  ThumbsUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Review {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  rating: number;
  content: string;
  images: string[];
  created_at: string;
  likes_count: number;
  is_liked?: boolean;
}

type TabType = 'write' | 'browse';
type StarFilter = 'all' | 1 | 2 | 3 | 4 | 5;

const MAX_IMAGES = 5;
const MAX_CHARS = 500;

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 30) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function ReviewCard({ review, onLike, onImageClick }: { review: Review; onLike: (id: string) => void; onImageClick?: (url: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const LONG_CONTENT = 200;

  const isLong = review.content.length > LONG_CONTENT;
  const displayContent = !expanded && isLong ? review.content.slice(0, LONG_CONTENT) + '...' : review.content;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 transition-all hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0 overflow-hidden">
          {review.user_avatar ? (
            <img src={review.user_avatar} alt={review.user_name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-teal-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="font-semibold text-slate-800 text-sm">{review.user_name}</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={s <= review.rating ? 'w-3.5 h-3.5 text-amber-500 fill-amber-500' : 'w-3.5 h-3.5 text-slate-200'}
                />
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{timeAgo(review.created_at)}</p>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-sm text-slate-600 leading-relaxed">{displayContent}</p>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-teal-600 font-medium mt-1 hover:underline"
          >
            {expanded ? 'Thu gọn' : 'Xem thêm'}
          </button>
        )}
      </div>

      {review.images.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {review.images.map((img, i) => (
            <button
              key={i}
              onClick={() => onImageClick?.(img)}
              className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-4">
        <button
          onClick={() => onLike(review.id)}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            review.is_liked ? 'text-teal-600' : 'text-slate-400 hover:text-teal-600'
          }`}
        >
          <ThumbsUp className={`w-3.5 h-3.5 ${review.is_liked ? 'fill-teal-600' : ''}`} />
          {review.likes_count > 0 && <span>{review.likes_count}</span>}
        </button>
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabType>('browse');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [starFilter, setStarFilter] = useState<StarFilter>('all');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'likes'>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const REVIEWS_PER_PAGE = 10;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u) {
        setUserId(u.id);
        setUserName(
          (u.user_metadata?.full_name as string) ||
          (u.user_metadata?.name as string) ||
          u.email?.split('@')[0] ||
          'Người dùng'
        );
      }
    });
  }, []);

  // Fetch reviews from database
  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select(`
            *,
            profiles:user_id (id, full_name, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .range(0, REVIEWS_PER_PAGE - 1);

        if (error) throw error;

        // Fetch user like status for each review
        const { data: { user } } = await supabase.auth.getUser();
        let userLikes: Set<string> = new Set();
        
        if (user) {
          const { data: likes } = await supabase
            .from('review_likes')
            .select('review_id')
            .eq('user_id', user.id);
          
          if (likes) {
            userLikes = new Set(likes.map(l => l.review_id));
          }
        }

        const mappedReviews: Review[] = (data || []).map((r) => ({
          id: r.id,
          user_id: r.user_id,
          user_name: r.profiles?.full_name || 'Người dùng',
          user_avatar: r.profiles?.avatar_url || '',
          rating: r.rating,
          content: r.content,
          images: r.images || [],
          created_at: r.created_at,
          likes_count: r.likes_count || 0,
          is_liked: userLikes.has(r.id),
        }));

        setReviews(mappedReviews);
        setHasMore((data || []).length === REVIEWS_PER_PAGE);
      } catch (err) {
        console.error('Error fetching reviews:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  const loadMoreReviews = async () => {
    setLoadingMore(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles:user_id (id, full_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .range(reviews.length, reviews.length + REVIEWS_PER_PAGE - 1);

      if (error) throw error;

      // Fetch user like status for each review
      const { data: { user } } = await supabase.auth.getUser();
      let userLikes: Set<string> = new Set();
      
      if (user) {
        const { data: likes } = await supabase
          .from('review_likes')
          .select('review_id')
          .eq('user_id', user.id);
        
        if (likes) {
          userLikes = new Set(likes.map(l => l.review_id));
        }
      }

      const mappedReviews: Review[] = (data || []).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        user_name: r.profiles?.full_name || 'Người dùng',
        user_avatar: r.profiles?.avatar_url || '',
        rating: r.rating,
        content: r.content,
        images: r.images || [],
        created_at: r.created_at,
        likes_count: r.likes_count || 0,
        is_liked: userLikes.has(r.id),
      }));

      setReviews(prev => [...prev, ...mappedReviews]);
      setHasMore((data || []).length === REVIEWS_PER_PAGE);
    } catch (err) {
      console.error('Error loading more reviews:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const filteredReviews = reviews
    .filter((r) => starFilter === 'all' || r.rating === starFilter)
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return b.likes_count - a.likes_count;
    });

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0.0';
  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct: reviews.length > 0 ? Math.round((reviews.filter((r) => r.rating === star).length / reviews.length) * 100) : 0,
  }));

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_IMAGES - images.length;
    const toAdd = files.slice(0, remaining);
    setImages((prev) => [...prev, ...toAdd]);
    const newPreviews = toAdd.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (rating === 0 || !userId) return;
    setSubmitting(true);

    try {
      // Upload images to Supabase Storage if any
      const uploadedUrls: string[] = [];
      
      if (images.length > 0) {
        for (const file of images) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('review-images')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw uploadError;
          }

          const { data: urlData } = supabase.storage
            .from('review-images')
            .getPublicUrl(fileName);
          
          uploadedUrls.push(urlData.publicUrl);
        }
      }

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          user_id: userId,
          rating,
          content: content.trim() || 'Đánh giá khách hàng',
          images: uploadedUrls,
        })
        .select(`
          *,
          profiles:user_id (id, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      const newReview: Review = {
        id: data.id,
        user_id: data.user_id,
        user_name: data.profiles?.full_name || userName || 'Người dùng',
        user_avatar: data.profiles?.avatar_url || '',
        rating: data.rating,
        content: data.content,
        images: data.images || [],
        created_at: data.created_at,
        likes_count: 0,
        is_liked: false,
      };

      setReviews((prev) => [newReview, ...prev]);
      setSubmitted(true);

      setTimeout(() => {
        setSubmitted(false);
        setRating(0);
        setContent('');
        setImages([]);
        setImagePreviews([]);
        setTab('browse');
      }, 2500);
    } catch (err) {
      console.error('Error submitting review:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const review = reviews.find(r => r.id === id);
    if (!review) return;

    if (review.is_liked) {
      // Remove like
      await supabase
        .from('review_likes')
        .delete()
        .eq('review_id', id)
        .eq('user_id', user.id);
      
      setReviews(prev => prev.map(r =>
        r.id === id ? { ...r, is_liked: false, likes_count: r.likes_count - 1 } : r
      ));
    } else {
      // Add like
      await supabase
        .from('review_likes')
        .insert({ review_id: id, user_id: user.id });
      
      setReviews(prev => prev.map(r =>
        r.id === id ? { ...r, is_liked: true, likes_count: r.likes_count + 1 } : r
      ));
    }
  };

  const isValid = rating > 0 && content.trim().length >= 10;

  return (
    <div className="pb-20 lg:pb-8 min-h-screen">
      {/* Header */}
      <div className=" rounded-md bg-linear-to-r from-teal-600 to-teal-500 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Đánh giá ứng dụng</h1>
            <p className="text-teal-100 text-xs mt-0.5">Chia sẻ trải nghiệm của bạn với Lexii</p>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="pt-4">
        <div className="bg-white rounded-2xl p-1 shadow-sm flex">
          <button
            onClick={() => setTab('browse')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === 'browse'
                ? 'bg-linear-to-r from-teal-600 to-teal-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Xem đánh giá
          </button>
          <button
            onClick={() => {
              if (!userId) {
                alert('Vui lòng đăng nhập để viết đánh giá');
                return;
              }
              setTab('write');
            }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === 'write'
                ? 'bg-linear-to-r from-teal-600 to-teal-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Viết đánh giá
          </button>
        </div>
      </div>

      {loading ? (
        <div className="px-4 pt-8 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm mt-3">Đang tải đánh giá...</p>
        </div>
      ) : tab === 'browse' ? (
        <div className="pt-4 space-y-4">
          {/* Stats overview */}
          <div className="bg-linear-to-br from-teal-600 to-teal-500 rounded-2xl p-5 shadow-lg shadow-teal-200">
            <div className="flex items-center gap-4">
              <div className="text-center shrink-0">
                <p className="text-5xl font-extrabold text-white leading-none">{avgRating}</p>
                <div className="flex items-center gap-0.5 mt-1 justify-center">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={s <= Math.round(Number(avgRating)) ? 'w-3.5 h-3.5 text-amber-500 fill-amber-500' : 'w-3.5 h-3.5 text-amber-200'}
                    />
                  ))}
                </div>
                <p className="text-teal-100 text-xs mt-1">{reviews.length} đánh giá</p>
              </div>
              <div className="w-px h-14 bg-teal-400/30 shrink-0" />
              <div className="flex-1 space-y-1.5">
                {ratingCounts.map(({ star, count, pct }) => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs text-teal-100 w-4">{star}</span>
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    <div className="flex-1 h-1.5 bg-teal-400/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-teal-100 w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 bg-white hover:bg-slate-50 transition-colors"
              >
                {sortBy === 'newest' ? 'Mới nhất' : sortBy === 'oldest' ? 'Cũ nhất' : 'Nhiều lượt thích'}
                <ChevronDown className="w-4 h-4" />
              </button>
              {showSortMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-xl border border-slate-100 shadow-lg z-20 py-1 min-w-[140px]">
                    {(['newest', 'oldest', 'likes'] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => { setSortBy(opt); setShowSortMenu(false); }}
                        className={`w-full px-4 py-2.5 text-sm text-left hover:bg-slate-50 transition-colors ${
                          sortBy === opt ? 'text-teal-600 font-semibold' : 'text-slate-600'
                        }`}
                      >
                        {opt === 'newest' ? 'Mới nhất' : opt === 'oldest' ? 'Cũ nhất' : 'Nhiều lượt thích'}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Star filters */}
            {(['all', 5, 4, 3, 2, 1] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStarFilter(f)}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                  starFilter === f
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300 hover:text-teal-600'
                }`}
              >
                {f === 'all' ? 'Tất cả' : (
                  <>
                    <span>{f}</span>
                    <Star className={`w-3.5 h-3.5 ${f === starFilter ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Reviews list */}
          {filteredReviews.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">Chưa có đánh giá nào</p>
              <p className="text-slate-400 text-sm mt-1">Hãy là người đầu tiên đánh giá!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReviews.map((review) => (
                <ReviewCard key={review.id} review={review} onLike={handleLike} onImageClick={setLightboxImage} />
              ))}
              {hasMore && (
                <button
                  onClick={() => void loadMoreReviews()}
                  disabled={loadingMore}
                  className="w-full py-3 rounded-xl border border-slate-200 text-sm text-slate-600 bg-white hover:bg-slate-50 hover:border-teal-300 hover:text-teal-600 transition-all flex items-center justify-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang tải...
                    </>
                  ) : (
                    'Xem thêm đánh giá'
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="pt-4 space-y-4">
          {submitted ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Star className="w-10 h-10 text-emerald-500 fill-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Cảm ơn bạn!</h3>
              <p className="text-slate-500 mt-2">Đánh giá của bạn đã được gửi thành công.</p>
            </div>
          ) : (
            <>
              {/* Rating */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-1">Đánh giá của bạn</h3>
                <p className="text-xs text-slate-400 mb-4">Bạn hài lòng với ứng dụng không?</p>
                <div
                  className="flex items-center gap-2"
                  onMouseLeave={() => setHoverRating(0)}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 transition-colors ${
                          star <= (hoverRating || rating)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-200'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm font-semibold text-slate-600">
                    {rating === 0 ? '' : rating === 1 ? 'Rất không hài lòng' : rating === 2 ? 'Không hài lòng' : rating === 3 ? 'Bình thường' : rating === 4 ? 'Hài lòng' : 'Rất hài lòng'}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-1">Nội dung đánh giá</h3>
                <p className="text-xs text-slate-400 mb-3">Chia sẻ trải nghiệm của bạn (tối thiểu 10 ký tự)</p>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
                  placeholder="Ví dụ: Ứng dụng rất hữu ích, giúp mình cải thiện điểm TOEIC rõ rệt..."
                  rows={5}
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all"
                />
                <div className="flex justify-between items-center mt-2">
                  <p className={`text-xs ${content.length < 10 ? 'text-red-400' : 'text-emerald-500'}`}>
                    {content.length < 10 ? `Cần thêm ${10 - content.length} ký tự` : 'Đủ điều kiện gửi'}
                  </p>
                  <p className="text-xs text-slate-400">{content.length}/{MAX_CHARS}</p>
                </div>
              </div>

              {/* Images */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-1">Hình ảnh đính kèm</h3>
                <p className="text-xs text-slate-400 mb-3">Tải lên tối đa {MAX_IMAGES} hình ({images.length}/{MAX_IMAGES})</p>

                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-slate-100 shadow-sm">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1.5 shrink-0 hover:border-teal-400 hover:bg-teal-50 transition-all cursor-pointer"
                    >
                      <Camera className="w-6 h-6 text-slate-400" />
                      <span className="text-xs text-slate-400 font-medium">Thêm ảnh</span>
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              {/* Submit */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <button
                  onClick={() => void handleSubmit()}
                  disabled={!isValid || submitting}
                  className={`w-full py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all ${
                    isValid && !submitting
                      ? 'bg-linear-to-r from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-200 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Đang gửi đánh giá...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Gửi đánh giá
                    </>
                  )}
                </button>
                {!isValid && (
                  <p className="text-xs text-slate-400 text-center mt-3">
                    Vui lòng chọn số sao và nhập ít nhất 10 ký tự để gửi đánh giá.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Lightbox for images */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={lightboxImage}
            alt=""
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
