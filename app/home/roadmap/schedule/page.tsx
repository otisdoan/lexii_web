"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Loader2,
} from "lucide-react";
import type { UserDailySchedule, UserTask } from "@/lib/types";
import { getUserAllSchedules } from "@/lib/roadmap";
import { supabase } from "@/lib/supabase";

const TASK_TYPE_ICONS: Record<string, { emoji: string; bg: string }> = {
  vocabulary: { emoji: "📚", bg: "bg-blue-50" },
  grammar: { emoji: "📖", bg: "bg-green-50" },
  listening: { emoji: "🎧", bg: "bg-sky-50" },
  reading: { emoji: "📄", bg: "bg-amber-50" },
  speaking: { emoji: "🎙️", bg: "bg-orange-50" },
  writing: { emoji: "✍️", bg: "bg-purple-50" },
  mini_test: { emoji: "📝", bg: "bg-red-50" },
  review: { emoji: "🔄", bg: "bg-teal-50" },
};

const TASK_TYPE_LABELS: Record<string, string> = {
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp",
  listening: "Nghe",
  reading: "Đọc",
  speaking: "Nói",
  writing: "Viết",
  mini_test: "Kiểm tra",
  review: "Ôn tập",
};

export default function ScheduleAllPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<UserDailySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDays, setTotalDays] = useState(0);

  useEffect(() => {
    loadSchedules();
  }, []);

  async function loadSchedules() {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: roadmap } = await supabase
        .from("user_roadmaps")
        .select("id, duration_days")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (!roadmap) {
        router.push("/home/roadmap");
        return;
      }

      setTotalDays(roadmap.duration_days);
      const allSchedules = await getUserAllSchedules(roadmap.id);
      setSchedules(allSchedules);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  if (schedules.length === 0 && totalDays === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Chưa có lịch học để hiển thị</p>
        <Link
          href="/home/roadmap"
          className="text-teal-600 text-sm mt-2 inline-block hover:underline"
        >
          ← Quay lại lộ trình
        </Link>
      </div>
    );
  }

  const scheduleByDay = new Map<number, UserDailySchedule>();
  for (const schedule of schedules) {
    scheduleByDay.set(schedule.actual_day_number, schedule);
  }
  const dayNumbers = Array.from({ length: totalDays }, (_, index) => index + 1);

  return (
    <div className="max-w-3xl mx-auto pb-20 lg:pb-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/home/roadmap"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ChevronLeft className="w-4 h-4" /> Lộ trình
        </Link>
        <span className="text-sm font-medium text-slate-600">
          {totalDays} ngày
        </span>
      </div>

      {dayNumbers.map((dayNumber) => {
        const schedule = scheduleByDay.get(dayNumber);
        const completedCount =
          schedule?.tasks?.filter((t) => t.is_completed).length ?? 0;
        const totalTasks = schedule?.tasks?.length ?? 0;

        return (
          <section
            key={`day-${dayNumber}`}
            className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Ngày {dayNumber}
                </h3>
                {schedule?.study_date && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(schedule.study_date).toLocaleDateString("vi-VN", {
                      weekday: "long",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 flex items-center gap-1 justify-end">
                  <Clock className="w-3.5 h-3.5" /> ~
                  {schedule?.total_estimated_minutes ?? 0} phút
                </div>
                <p className="text-sm font-semibold text-teal-600 mt-1">
                  {completedCount}/{totalTasks} ✓
                </p>
                {schedule && (
                  <Link
                    href={`/home/roadmap/schedule/${schedule.actual_day_number}`}
                    className="text-xs text-teal-600 hover:underline"
                  >
                    Xem ngày chi tiết
                  </Link>
                )}
              </div>
            </div>

            {schedule?.tasks && schedule.tasks.length > 0 ? (
              <div className="space-y-2">
                {schedule.tasks.map((task: UserTask, index: number) => {
                  const typeInfo =
                    TASK_TYPE_ICONS[task.task_type] || TASK_TYPE_ICONS.review;
                  const typeLabel =
                    TASK_TYPE_LABELS[task.task_type] || task.task_type;

                  return (
                    <div
                      key={task.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                        task.is_completed
                          ? "bg-green-50 border-green-100"
                          : "bg-white border-slate-100"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${typeInfo.bg}`}
                      >
                        <span className="text-lg">{typeInfo.emoji}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-medium">
                            {typeLabel}
                          </span>
                          <span className="text-xs text-slate-400">
                            {task.estimated_minutes} phút
                          </span>
                        </div>
                        <p
                          className={`text-sm font-medium mt-1 ${
                            task.is_completed
                              ? "text-slate-400 line-through"
                              : "text-slate-700"
                          }`}
                        >
                          {index + 1}. {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </div>
                      {task.is_completed && (
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-1" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400">
                <p className="text-sm">Không có nhiệm vụ nào cho ngày này</p>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
