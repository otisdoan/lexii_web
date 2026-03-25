import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  createUserRoadmap,
  getActiveRoadmap,
  getRoadmapTemplates,
} from "@/lib/roadmap";
import type { CreateRoadmapRequest } from "@/lib/types";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://bkkpaaacxftqlidaxnml.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJra3BhYWFjeGZ0cWxpZGF4bm1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxODQzMzQsImV4cCI6MjA4Nzc2MDMzNH0.NJ23R9N-1cn3OtpZgacoy28K_bbNZUXkE9AZ31I2HqI";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          /* read-only in Route Handlers */
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as CreateRoadmapRequest;

    if (
      !body.target_score ||
      !body.duration_days ||
      body.current_score === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Kiểm tra nếu điểm hiện tại >= điểm mục tiêu
    if (body.current_score >= body.target_score) {
      return NextResponse.json({
        success: false,
        warning: {
          type: "score_already_achieved",
          message: `Điểm hiện tại (${body.current_score}) đã đạt hoặc vượt mục tiêu (${body.target_score}).`,
          suggestion: "Hãy chọn mục tiêu cao hơn!",
        },
      });
    }

    // Kiểm tra nếu đã có roadmap active
    const existingRoadmap = await getActiveRoadmap(user.id, supabase);
    if (existingRoadmap) {
      return NextResponse.json(
        {
          success: false,
          error: "already_has_active",
          message: "Bạn đã có một lộ trình đang hoạt động.",
          existing_roadmap: existingRoadmap,
        },
        { status: 409 },
      );
    }

    const templates = await getRoadmapTemplates(supabase);
    console.log(
      "[ROADMAP/CREATE] Templates from DB:",
      templates.map((t) => ({
        id: t.id,
        title: t.title,
        start_score: t.start_score,
        target_score: t.target_score,
        is_active: t.is_active,
      })),
    );

    const result = await createUserRoadmap(
      user.id,
      body.current_score,
      body.target_score,
      body.duration_days,
      supabase,
    );

    return NextResponse.json({
      success: true,
      roadmap: result.roadmap,
      warning: result.warning,
      milestones: result.milestones,
      today_schedule: result.today_schedule,
    });
  } catch (err) {
    console.error("[ROADMAP/CREATE] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi server" },
      { status: 500 },
    );
  }
}
