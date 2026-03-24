import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://bkkpaaacxftqlidaxnml.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJra3BhYWFjeGZ0cWxpZGF4bm1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxODQzMzQsImV4cCI6MjA4Nzc2MDMzNH0.NJ23R9N-1cn3OtpZgacoy28K_bbNZUXkE9AZ31I2HqI";

type TestRow = {
  id: string;
  title: string;
  duration: number;
  total_questions: number;
  is_premium: boolean;
  type?: string | null;
};

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

    const { data: attempts } = await supabase
      .from("attempts")
      .select("test_id")
      .eq("user_id", user.id);
    const attemptedIds = new Set(
      (attempts || []).map((row) => row.test_id as string).filter(Boolean),
    );

    const { data: activeRoadmap } = await supabase
      .from("user_roadmaps")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (activeRoadmap?.id) {
      const { data: scheduledTasks } = await supabase
        .from("user_tasks")
        .select("reference_id, user_daily_schedules!inner(roadmap_id)")
        .eq("task_type", "full_test")
        .eq("user_daily_schedules.roadmap_id", activeRoadmap.id);
      for (const row of scheduledTasks || []) {
        if (row.reference_id) {
          attemptedIds.add(String(row.reference_id));
        }
      }
    }

    const { data: tests, error: testsError } = await supabase
      .from("tests")
      .select("id,title,duration,total_questions,is_premium,type")
      .or("type.eq.full_test,type.eq.fulltest,type.ilike.full%")
      .eq("total_questions", 200)
      .order("created_at", { ascending: false })
      .limit(200);
    if (testsError) throw testsError;

    const candidates = (tests || []).filter(
      (test) => !attemptedIds.has(test.id),
    );
    const fallbackCandidates = (tests || []) as TestRow[];

    const candidateIds = (
      candidates.length ? candidates : fallbackCandidates
    ).map((test) => test.id);
    if (!candidateIds.length) {
      return NextResponse.json(
        { error: "No placement test available" },
        { status: 404 },
      );
    }

    const { data: parts, error: partsError } = await supabase
      .from("test_parts")
      .select("test_id,part_number")
      .in("test_id", candidateIds);
    if (partsError) throw partsError;

    const partsByTest = new Map<string, Set<number>>();
    for (const row of parts || []) {
      const testId = String(row.test_id);
      const partNumber = Number(row.part_number);
      if (!partsByTest.has(testId)) {
        partsByTest.set(testId, new Set());
      }
      if (partNumber) {
        partsByTest.get(testId)?.add(partNumber);
      }
    }

    const eligibleTests = (
      candidates.length ? candidates : fallbackCandidates
    ).filter((test) => (partsByTest.get(test.id)?.size || 0) >= 7);

    if (!eligibleTests.length) {
      return NextResponse.json(
        { error: "No full test with 7 parts" },
        { status: 404 },
      );
    }

    const picked =
      eligibleTests[Math.floor(Math.random() * eligibleTests.length)];

    return NextResponse.json({
      test: {
        id: picked.id,
        title: picked.title,
        duration: picked.duration,
        total_questions: picked.total_questions,
        is_premium: picked.is_premium,
      },
    });
  } catch (err) {
    console.error("[ROADMAP/PLACEMENT-TEST] Error:", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
