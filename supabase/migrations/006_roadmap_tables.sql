-- ============================================================
-- Migration: Add Roadmap feature tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- ==========================================
-- CỤM 1: MASTER DATA (Admin tạo template)
-- ==========================================

-- 1. Bảng Template Lộ trình chuẩn
CREATE TABLE IF NOT EXISTS public.roadmap_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    title VARCHAR NOT NULL,
    start_score INTEGER NOT NULL,
    target_score INTEGER NOT NULL,
    default_duration_days INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT roadmap_templates_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_roadmap_templates_score
ON roadmap_templates(start_score, target_score);

-- 2. Bảng Task chuẩn cho từng ngày trong Template
CREATE TABLE IF NOT EXISTS public.template_tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL,
    standard_day_number INTEGER NOT NULL,
    task_type VARCHAR NOT NULL CHECK (task_type IN (
        'vocabulary', 'grammar', 'listening', 'reading',
        'speaking', 'writing', 'mini_test', 'review'
    )),
    reference_id UUID,
    title VARCHAR NOT NULL,
    description TEXT,
    estimated_minutes INTEGER DEFAULT 15,
    order_index INTEGER DEFAULT 0,
    CONSTRAINT template_tasks_pkey PRIMARY KEY (id),
    CONSTRAINT template_tasks_template_id_fkey
        FOREIGN KEY (template_id)
        REFERENCES public.roadmap_templates(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_template_tasks_lookup
ON template_tasks(template_id, standard_day_number);

-- ==========================================
-- CỤM 2: USER DATA (Hệ thống tự sinh)
-- ==========================================

-- 3. Bảng Lộ trình cá nhân User
CREATE TABLE IF NOT EXISTS public.user_roadmaps (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    template_id UUID NOT NULL,
    current_score INTEGER NOT NULL,
    target_score INTEGER NOT NULL,
    duration_days INTEGER NOT NULL,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    status VARCHAR DEFAULT 'active' CHECK (status IN (
        'active', 'completed', 'abandoned', 'paused'
    )),
    progress_percent NUMERIC(5,2) DEFAULT 0,
    paused_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT user_roadmaps_pkey PRIMARY KEY (id),
    CONSTRAINT user_roadmaps_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id),
    CONSTRAINT user_roadmaps_template_id_fkey
        FOREIGN KEY (template_id) REFERENCES public.roadmap_templates(id)
);

-- Mỗi user chỉ có 1 roadmap active
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roadmaps_active
ON user_roadmaps(user_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_user_roadmaps_user
ON user_roadmaps(user_id, status);

-- 4. Bảng Ngày học thực tế
CREATE TABLE IF NOT EXISTS public.user_daily_schedules (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    roadmap_id UUID NOT NULL,
    actual_day_number INTEGER NOT NULL,
    study_date DATE,
    total_estimated_minutes INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    CONSTRAINT user_daily_schedules_pkey PRIMARY KEY (id),
    CONSTRAINT user_daily_schedules_roadmap_id_fkey
        FOREIGN KEY (roadmap_id)
        REFERENCES public.user_roadmaps(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_daily_schedules_lookup
ON user_daily_schedules(roadmap_id, actual_day_number);

CREATE INDEX IF NOT EXISTS idx_user_daily_schedules_date
ON user_daily_schedules(roadmap_id, study_date);

-- 5. Bảng Task chi tiết User phải làm
CREATE TABLE IF NOT EXISTS public.user_tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    daily_schedule_id UUID NOT NULL,
    template_task_id UUID,
    task_type VARCHAR NOT NULL CHECK (task_type IN (
        'vocabulary', 'grammar', 'listening', 'reading',
        'speaking', 'writing', 'mini_test', 'review'
    )),
    reference_id UUID,
    title VARCHAR NOT NULL,
    description TEXT,
    estimated_minutes INTEGER DEFAULT 15,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    order_index INTEGER DEFAULT 0,
    CONSTRAINT user_tasks_pkey PRIMARY KEY (id),
    CONSTRAINT user_tasks_daily_schedule_id_fkey
        FOREIGN KEY (daily_schedule_id)
        REFERENCES public.user_daily_schedules(id)
        ON DELETE CASCADE,
    CONSTRAINT user_tasks_template_task_id_fkey
        FOREIGN KEY (template_task_id)
        REFERENCES public.template_tasks(id)
);

CREATE INDEX IF NOT EXISTS idx_user_tasks_schedule
ON user_tasks(daily_schedule_id, order_index);

-- ==========================================
-- RLS Policies
-- ==========================================

-- Template là public read
ALTER TABLE roadmap_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active templates"
ON roadmap_templates FOR SELECT
USING (is_active = true);

CREATE POLICY "Anyone can read template tasks"
ON template_tasks FOR SELECT
USING (true);

-- Bật RLS cho các bảng user
ALTER TABLE user_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;

-- User chỉ xem/sửa roadmap của mình
CREATE POLICY "Users can view own roadmaps"
ON user_roadmaps FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own roadmaps"
ON user_roadmaps FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own roadmaps"
ON user_roadmaps FOR UPDATE
USING (auth.uid() = user_id);

-- User chỉ xem/sửa daily schedules của roadmap mình
CREATE POLICY "Users can view own schedules"
ON user_daily_schedules FOR SELECT
USING (
    roadmap_id IN (
        SELECT id FROM user_roadmaps WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert own schedules"
ON user_daily_schedules FOR INSERT
WITH CHECK (
    roadmap_id IN (
        SELECT id FROM user_roadmaps WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update own schedules"
ON user_daily_schedules FOR UPDATE
USING (
    roadmap_id IN (
        SELECT id FROM user_roadmaps WHERE user_id = auth.uid()
    )
);

-- User chỉ xem/sửa tasks trong schedule của mình
CREATE POLICY "Users can view own tasks"
ON user_tasks FOR SELECT
USING (
    daily_schedule_id IN (
        SELECT uds.id FROM user_daily_schedules uds
        JOIN user_roadmaps ur ON uds.roadmap_id = ur.id
        WHERE ur.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert own tasks"
ON user_tasks FOR INSERT
WITH CHECK (
    daily_schedule_id IN (
        SELECT uds.id FROM user_daily_schedules uds
        JOIN user_roadmaps ur ON uds.roadmap_id = ur.id
        WHERE ur.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update own tasks"
ON user_tasks FOR UPDATE
USING (
    daily_schedule_id IN (
        SELECT uds.id FROM user_daily_schedules uds
        JOIN user_roadmaps ur ON uds.roadmap_id = ur.id
        WHERE ur.user_id = auth.uid()
    )
);

-- ==========================================
-- Seed: Template lộ trình mẫu
-- ==========================================

INSERT INTO roadmap_templates (title, start_score, target_score, default_duration_days, description) VALUES
('Giai đoạn 1: Mất gốc → Cơ bản', 0, 350, 60, 'Dành cho người mới bắt đầu hoặc mất gốc tiếng Anh. Tập trung xây dựng nền tảng từ vựng cơ bản, ngữ pháp nền tảng và làm quen với format đề thi TOEIC.'),
('Giai đoạn 2: Cơ bản → Sơ trung cấp', 350, 550, 60, 'Mở rộng vốn từ vựng, nâng cao ngữ pháp, bắt đầu luyện kỹ năng nghe-đọc chuyên sâu theo từng Part.'),
('Giai đoạn 3: Sơ trung cấp → Trung cấp', 550, 750, 60, 'Luyện kỹ năng nâng cao, chiến lược làm bài theo Part, tăng tốc độ làm bài. Bắt đầu luyện Full Test.'),
('Giai đoạn 4: Trung cấp → Nâng cao', 750, 990, 90, 'Kỹ năng nâng cao nhất, chiến lược xử lý câu hỏi khó, luyện đề sát sao để đạt điểm tối đa.');
