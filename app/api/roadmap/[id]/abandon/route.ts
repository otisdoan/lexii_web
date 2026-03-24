import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { abandonRoadmap, resumeRoadmap } from "@/lib/roadmap";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://bkkpaaacxftqlidaxnml.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJra3BhYWFjeGZ0cWxpZGF4bm1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxODQzMzQsImV4cCI6MjA4Nzc2MDMzNH0.NJ23R9N-1cn3OtpZgacoy28K_bbNZUXkE9AZ31I2HqI";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const body = (await req.json()) as {
      action: "abandoned" | "paused" | "resume";
    };

    if (!id) {
      return NextResponse.json(
        { error: "Missing roadmap id" },
        { status: 400 },
      );
    }

    if (
      !body.action ||
      !["abandoned", "paused", "resume"].includes(body.action)
    ) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (body.action === "resume") {
      await resumeRoadmap(id, supabase, user.id);
    } else {
      await abandonRoadmap(id, body.action, supabase, user.id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[ROADMAP/ABANDON] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi server" },
      { status: 500 },
    );
  }
}
