import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://bkkpaaacxftqlidaxnml.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJra3BhYWFjeGZ0cWxpZGF4bm1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxODQzMzQsImV4cCI6MjA4Nzc2MDMzNH0.NJ23R9N-1cn3OtpZgacoy28K_bbNZUXkE9AZ31I2HqI";

type LinePoint = { date: string; value: number };

export async function GET() {
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

    const { data: attempts, error: attemptsError } = await supabase
      .from("attempts")
      .select("score, submitted_at")
      .eq("user_id", user.id)
      .not("score", "is", null)
      .order("submitted_at", { ascending: true })
      .limit(30);
    if (attemptsError) throw attemptsError;

    const attemptSeries: LinePoint[] = (attempts || [])
      .filter((row) => row.submitted_at)
      .map((row) => ({
        date: String(row.submitted_at).slice(0, 10),
        value: Number(row.score) || 0,
      }));

    const { data: practiceRows, error: practiceError } = await supabase
      .from("listening_answer_history")
      .select("is_correct, answered_at")
      .eq("user_id", user.id)
      .order("answered_at", { ascending: true })
      .limit(300);
    if (practiceError) throw practiceError;

    const practiceByDate = new Map<
      string,
      { total: number; correct: number }
    >();
    for (const row of practiceRows || []) {
      const date = row.answered_at ? String(row.answered_at).slice(0, 10) : "";
      if (!date) continue;
      const stat = practiceByDate.get(date) || { total: 0, correct: 0 };
      stat.total += 1;
      if (row.is_correct) stat.correct += 1;
      practiceByDate.set(date, stat);
    }

    const practiceSeries = Array.from(practiceByDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, stat]) => ({
        date,
        value:
          stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
      }));

    return NextResponse.json({
      attempts: attemptSeries,
      practice: practiceSeries,
    });
  } catch (err) {
    console.error("[ROADMAP/ASSESS-HISTORY] Error:", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
