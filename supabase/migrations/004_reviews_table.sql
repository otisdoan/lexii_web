-- ============================================================
-- Migration: Reviews table
-- ============================================================

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating        INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content       TEXT        NOT NULL,
  images        TEXT[]      DEFAULT '{}',
  likes_count   INTEGER     DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_user     ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating   ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created  ON reviews(created_at DESC);

-- RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Users can read all reviews, but only insert/update/delete their own
CREATE POLICY "Anyone can read reviews" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own reviews" ON reviews
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reviews" ON reviews
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own reviews" ON reviews
  FOR DELETE USING (user_id = auth.uid());

-- Admins can manage all reviews
CREATE POLICY "Admins can manage all reviews" ON reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Migration: Review likes table
-- ============================================================

CREATE TABLE IF NOT EXISTS review_likes (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id   UUID        NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT one_like_per_user UNIQUE (review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_review_likes_review ON review_likes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_user   ON review_likes(user_id);

ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read likes" ON review_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own likes" ON review_likes
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- Trigger: Update likes_count when likes change
-- ============================================================

CREATE OR REPLACE FUNCTION update_review_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reviews SET likes_count = likes_count + 1 WHERE id = NEW.review_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reviews SET likes_count = likes_count - 1 WHERE id = OLD.review_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_likes_count ON review_likes;
CREATE TRIGGER trigger_update_likes_count
  AFTER INSERT OR DELETE ON review_likes
  FOR EACH ROW EXECUTE FUNCTION update_review_likes_count();

-- ============================================================
-- Seed: Sample reviews
-- ============================================================

-- Insert sample reviews (will use first user_id found, or create placeholder)
-- In production, remove seed data and let users create reviews

-- ============================================================
-- Storage bucket for review images
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review-images',
  'review-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: anyone can view, authenticated users can upload
CREATE POLICY "Anyone can view review images" ON storage.objects
  FOR SELECT USING (bucket_id = 'review-images');

CREATE POLICY "Authenticated users can upload review images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'review-images' AND auth.role() = 'authenticated');
