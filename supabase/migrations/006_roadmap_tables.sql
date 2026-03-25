-- ============================================================
-- Migration: Drop old tables & Add Roadmap feature tables (Dynamic Allocation)
-- Run this in Supabase SQL Editor
-- ============================================================


-- ==========================================
-- XOA BANG CU (Lam sach Database)
-- ==========================================
DROP TABLE IF EXISTS public.user_tasks CASCADE;
DROP TABLE IF EXISTS public.user_daily_schedules CASCADE;
DROP TABLE IF EXISTS public.user_roadmaps CASCADE;
DROP TABLE IF EXISTS public.template_tasks CASCADE;
DROP TABLE IF EXISTS public.roadmap_templates CASCADE;


-- ==========================================
-- CUM 1: MASTER DATA (Admin tao template)
-- ==========================================


-- 1. Bang Template Lo trinh chuan
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


-- 2. Bang Task chuan cho Template (Da chuyen sang Sequence-based)
CREATE TABLE IF NOT EXISTS public.template_tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL,
    sequence_order INTEGER NOT NULL, -- Thay cho standard_day_number
    task_type VARCHAR NOT NULL CHECK (task_type IN (
        'vocabulary', 'grammar', 'listening', 'reading',
        'speaking', 'writing', 'practice', 'mini_test', 'review', 'full_test'
    )),
    is_standalone BOOLEAN DEFAULT false, -- Danh dau task khong duoc gop (VD: Full Test)
    reference_id UUID,
    title VARCHAR NOT NULL,
    description TEXT,
    estimated_minutes INTEGER DEFAULT 15,
    CONSTRAINT template_tasks_pkey PRIMARY KEY (id),
    CONSTRAINT template_tasks_template_id_fkey
        FOREIGN KEY (template_id)
        REFERENCES public.roadmap_templates(id)
        ON DELETE CASCADE
);


-- Index phuc vu viec query luong bai hoc theo thu tu
CREATE INDEX IF NOT EXISTS idx_template_tasks_lookup
ON template_tasks(template_id, sequence_order);


-- ==========================================
-- CUM 2: USER DATA (He thong tu sinh)
-- ==========================================


-- 3. Bang Lo trinh ca nhan User
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


-- Moi user chi co 1 roadmap active
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roadmaps_active
ON user_roadmaps(user_id) WHERE status = 'active';


CREATE INDEX IF NOT EXISTS idx_user_roadmaps_user
ON user_roadmaps(user_id, status);


-- 4. Bang Ngay hoc thuc te
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


-- 5. Bang Task chi tiet User phai lam
CREATE TABLE IF NOT EXISTS public.user_tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    daily_schedule_id UUID NOT NULL,
    template_task_id UUID,
    task_type VARCHAR NOT NULL CHECK (task_type IN (
        'vocabulary', 'grammar', 'listening', 'reading',
        'speaking', 'writing', 'practice', 'mini_test', 'review', 'full_test'
    )),
    is_standalone BOOLEAN DEFAULT false,
    reference_id UUID,
    title VARCHAR NOT NULL,
    description TEXT,
    estimated_minutes INTEGER DEFAULT 15,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    order_index INTEGER DEFAULT 0, -- Thu tu task trong 1 ngay
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


-- Template la public read
ALTER TABLE roadmap_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Anyone can read active templates"
ON roadmap_templates FOR SELECT
USING (is_active = true);


CREATE POLICY "Anyone can read template tasks"
ON template_tasks FOR SELECT
USING (true);


-- Bat RLS cho cac bang user
ALTER TABLE user_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;


-- User chi xem/sua roadmap cua minh
CREATE POLICY "Users can view own roadmaps"
ON user_roadmaps FOR SELECT
USING (auth.uid() = user_id);


CREATE POLICY "Users can insert own roadmaps"
ON user_roadmaps FOR INSERT
WITH CHECK (auth.uid() = user_id);


CREATE POLICY "Users can update own roadmaps"
ON user_roadmaps FOR UPDATE
USING (auth.uid() = user_id);


-- User chi xem/sua daily schedules cua roadmap minh
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


-- User chi xem/sua tasks trong schedule cua minh
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
-- Seed: Template lo trinh mau
-- ==========================================


-- ==========================================
-- Task Weighting
-- ==========================================

-- 1. Them cot trong so (neu chua co)
ALTER TABLE public.template_tasks
ADD COLUMN IF NOT EXISTS task_weight INTEGER DEFAULT 1;

-- 2. Gan trong so dua tren loai nhiem vu

-- Nhom 1: Kien thuc nen tang (Nhe) - 1 diem
UPDATE public.template_tasks
SET task_weight = 1
WHERE task_type IN ('vocabulary', 'grammar');

-- Nhom 2: Ky nang thuc hanh (Vua) - 2 diem
UPDATE public.template_tasks
SET task_weight = 2
WHERE task_type IN ('listening', 'reading', 'practice');

-- Nhom 3: Tong on & Danh gia (Nang) - 4 diem
UPDATE public.template_tasks
SET task_weight = 4
WHERE task_type = 'review';

-- Nhom 4: Thi thu & Chot chang (Rat nang) - 6 diem
UPDATE public.template_tasks
SET task_weight = 6
WHERE task_type IN ('mini_test', 'full_test');


INSERT INTO roadmap_templates (title, start_score, target_score, default_duration_days, description) VALUES
('Giai doan 1: Mat goc -> Co ban', 0, 350, 60, 'Danh cho nguoi moi bat dau hoac mat goc tieng Anh. Tap trung xay dung nen tang tu vung co ban, ngu phap nen tang va lam quen voi format de thi TOEIC.'),
('Giai doan 2: Co ban -> So trung cap', 350, 550, 60, 'Mo rong von tu vung, nang cao ngu phap, bat dau luyen ky nang nghe-doc chuyen sau theo tung Part.'),
('Giai doan 3: So trung cap -> Trung cap', 550, 750, 60, 'Luyen ky nang nang cao, chien luoc lam bai theo Part, tang toc do lam bai. Bat dau luyen Full Test.'),
('Giai doan 4: Trung cap -> Nang cao', 750, 990, 90, 'Ky nang nang cao nhat, chien luoc xu ly cau hoi kho, luyen de sat sao de dat diem toi da.');
