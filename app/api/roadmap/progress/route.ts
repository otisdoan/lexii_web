import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getActiveRoadmap, getRoadmapProgress } from "@/lib/roadmap";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://bkkpaaacxftqlidaxnml.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJra3BhYWFjeGZ0cWxpZGF4bm1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxODQzMzQsImV4cCI6MjA4Nzc2MDMzNH0.NJ23R9N-1cn3OtpZgacoy28K_bbNZUXkE9AZ31I2HqI";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          /* read-only */
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let roadmap = await getActiveRoadmap(user.id, supabase);
    if (!roadmap) {
      const { data: pausedRoadmap, error } = await supabase
        .from("user_roadmaps")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "paused")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!pausedRoadmap) {
        return NextResponse.json(
          { error: "No active roadmap" },
          { status: 404 },
        );
      }
      roadmap = pausedRoadmap;
    }

    const progress = await getRoadmapProgress(roadmap.id, supabase);
    return NextResponse.json(progress);
  } catch (err) {
    console.error("[ROADMAP/PROGRESS] Error:", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
