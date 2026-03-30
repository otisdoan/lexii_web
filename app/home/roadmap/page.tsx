"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Map,
  Target,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  ChevronRight,
  Pause,
  XCircle,
  Play,
  Plus,
  Flame,
  Trophy,
} from "lucide-react";
import type {
  UserRoadmap,
  UserDailySchedule,
  UserTask,
  RoadmapProgress,
} from "@/lib/types";
import { RoadmapCertificationButton } from "@/components/roadmap/RoadmapCertificationModal";

const TASK_TYPE_ICONS: Record<
  string,
  { emoji: string; color: string; bg: string }
> = {
  vocabulary: { emoji: "📚", color: "text-blue-600", bg: "bg-blue-50" },
  grammar: { emoji: "📖", color: "text-green-600", bg: "bg-green-50" },
  listening: { emoji: "🎧", color: "text-sky-600", bg: "bg-sky-50" },
  reading: { emoji: "📄", color: "text-amber-600", bg: "bg-amber-50" },
  speaking: { emoji: "🎙️", color: "text-orange-600", bg: "bg-orange-50" },
  writing: { emoji: "✍️", color: "text-purple-600", bg: "bg-purple-50" },
  mini_test: { emoji: "📝", color: "text-red-600", bg: "bg-red-50" },
  review: { emoji: "🔄", color: "text-teal-600", bg: "bg-teal-50" },
};

export default function RoadmapPage() {
  const [roadmap, setRoadmap] = useState<UserRoadmap | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<UserDailySchedule | null>(
    null,
  );
  const [progress, setProgress] = useState<RoadmapProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [activeRes, progressRes] = await Promise.all([
        fetch("/api/roadmap/active"),
        fetch("/api/roadmap/progress"),
      ]);

      const activeData = await activeRes.json();
      console.debug("[ROADMAP] /active response", {
        status: activeRes.status,
        body: activeData,
      });
      if (activeData.roadmap) {
        setRoadmap(activeData.roadmap);
        setTodaySchedule(activeData.today_schedule);

        if (progressRes.ok) {
          const progressData = await progressRes.json();
          console.debug("[ROADMAP] /progress response", {
            status: progressRes.status,
            body: progressData,
          });
          setProgress(progressData);
        } else {
          console.debug("[ROADMAP] /progress failed", {
            status: progressRes.status,
            body: await progressRes.json().catch(() => null),
          });
        }
      } else {
        console.debug("[ROADMAP] No active roadmap");
      }
    } catch (err) {
      console.error("[ROADMAP] loadData error", err);
      // silently handle
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteTask(taskId: string) {
    try {
      const res = await fetch(`/api/roadmap/task/${taskId}/complete`, {
        method: "PATCH",
      });
      if (res.ok) {
        await loadData();
      }
    } catch {
      // silently handle
    }
  }

  async function handleAction(action: "paused" | "abandoned" | "resume") {
    if (!roadmap) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/roadmap/${roadmap.id}/abandon`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        if (action === "abandoned") {
          setRoadmap(null);
          setTodaySchedule(null);
          setProgress(null);
        } else {
          await loadData();
        }
      }
    } catch {
      // silently handle
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-40 bg-slate-100 rounded-2xl" />
        <div className="h-24 bg-slate-100 rounded-2xl" />
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  // Empty state - chưa có lộ trình
  if (!roadmap) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 px-4">
        <div className="w-24 h-24 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Map className="w-12 h-12 text-teal-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-3">
          Lộ trình học TOEIC cá nhân hóa
        </h1>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">
          Hệ thống sẽ phân tích trình độ của bạn và tạo kế hoạch học tập hàng
          ngày phù hợp với mục tiêu và thời gian cam kết.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/home/roadmap/create"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-2xl font-semibold text-lg hover:shadow-lg hover:shadow-teal-200 transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            Tạo lộ trình
          </Link>
          <RoadmapCertificationButton variant="prominent" />
        </div>

        <div className="grid grid-cols-3 gap-4 mt-12">
          {[
            { icon: Target, label: "Đặt mục tiêu", desc: "300+ đến 990" },
            { icon: TrendingUp, label: "Đánh giá", desc: "Tự động phân tích" },
            { icon: Calendar, label: "Lịch học", desc: "Hàng ngày chi tiết" },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-100 p-4"
            >
              <item.icon className="w-8 h-8 text-teal-500 mb-2 mx-auto" />
              <p className="font-semibold text-sm text-slate-700">
                {item.label}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Active roadmap view
  const progressPercent =
    progress?.progress_percent ?? roadmap.progress_percent ?? 0;
  const currentDay = progress?.current_day ?? 1;
  const fullScheduleLink = "/home/roadmap/schedule";

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
        <div className="absolute bottom-0 left-10 w-24 h-24 bg-white/10 rounded-full translate-y-8" />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Map className="w-5 h-5" />
                <span className="text-sm font-medium text-teal-100">
                  Lộ trình của bạn
                </span>
                {roadmap.status === "paused" && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
                    Đang tạm dừng
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold">
                {roadmap.current_score} → {roadmap.target_score} điểm
              </h2>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">
                {Math.round(progressPercent)}%
              </p>
              <p className="text-xs text-teal-100">hoàn thành</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/20 rounded-full h-3 mb-2">
            <div
              className="bg-white rounded-full h-3 transition-all duration-500"
              style={{ width: `${Math.max(progressPercent, 2)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-teal-100">
            <span>
              Ngày {currentDay}/{roadmap.duration_days}
            </span>
            <span>
              {progress?.completed_tasks ?? 0}/{progress?.total_tasks ?? 0}{" "}
              nhiệm vụ
            </span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
          <Flame className="w-6 h-6 text-orange-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-slate-800">
            {progress?.streak_days ?? 0}
          </p>
          <p className="text-xs text-slate-500">ngày liên tiếp</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
          <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-slate-800">
            {progress?.completed_days ?? 0}
          </p>
          <p className="text-xs text-slate-500">ngày hoàn thành</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
          <Calendar className="w-6 h-6 text-blue-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-slate-800">
            {roadmap.duration_days - (progress?.completed_days ?? 0)}
          </p>
          <p className="text-xs text-slate-500">ngày còn lại</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <RoadmapCertificationButton variant="prominent" />
        <Link
          href={fullScheduleLink}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-100 rounded-xl hover:bg-teal-100 hover:-translate-y-0.5 transition-all"
        >
          <Calendar className="w-4 h-4" /> Xem tất cả lộ trình
        </Link>
      </div>

      {/* Milestones */}
      {progress?.milestones && progress.milestones.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Chặng đường
          </h3>
          <div className="space-y-3">
            {progress.milestones.map((m, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  m.is_reached
                    ? "bg-green-50 border border-green-100"
                    : "bg-slate-50 border border-slate-100"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    m.is_reached
                      ? "bg-green-500 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {m.is_reached ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-bold">{i + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${m.is_reached ? "text-green-700" : "text-slate-700"}`}
                  >
                    {m.label}
                  </p>
                  <p className="text-xs text-slate-500">
                    Ngày {m.day} · Mục tiêu {m.target_score} điểm
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {roadmap.status !== "paused" && (
        <section className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-500" />
              Nhiệm vụ hôm nay
              {todaySchedule && (
                <span className="text-xs text-slate-400 font-normal">
                  (Ngày {todaySchedule.actual_day_number})
                </span>
              )}
            </h3>
            {todaySchedule && (
              <span className="text-xs text-slate-400">
                ~{todaySchedule.total_estimated_minutes} phút
              </span>
            )}
          </div>

          {todaySchedule?.tasks && todaySchedule.tasks.length > 0 ? (
            <div className="space-y-2">
              {todaySchedule.tasks.map((task: UserTask) => {
                const typeInfo =
                  TASK_TYPE_ICONS[task.task_type] || TASK_TYPE_ICONS.review;
                return (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      task.is_completed
                        ? "bg-green-50 border-green-100 opacity-75"
                        : "bg-white border-slate-100 hover:border-teal-200 hover:shadow-sm"
                    }`}
                  >
                    <button
                      onClick={() =>
                        !task.is_completed && handleCompleteTask(task.id)
                      }
                      disabled={task.is_completed}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        task.is_completed
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-slate-300 hover:border-teal-400"
                      }`}
                    >
                      {task.is_completed && (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                    </button>
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${typeInfo.bg}`}
                    >
                      <span className="text-lg">{typeInfo.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${task.is_completed ? "text-slate-400 line-through" : "text-slate-700"}`}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-slate-400 truncate">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      {task.estimated_minutes}p
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-green-600">
                Bạn đã hoàn thành tất cả nhiệm vụ!
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Quay lại vào ngày mai để tiếp tục
              </p>
            </div>
          )}

          {todaySchedule && (
            <Link
              href={`/home/roadmap/schedule/${todaySchedule.actual_day_number}`}
              className="mt-4 flex items-center justify-center gap-1 text-sm text-teal-600 font-medium hover:underline"
            >
              Xem chi tiết ngày này <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </section>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {roadmap.status === "active" && (
          <>
            <button
              onClick={() => handleAction("paused")}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-50 text-amber-700 rounded-xl font-medium text-sm hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              <Pause className="w-4 h-4" /> Tạm dừng
            </button>
            <button
              onClick={() => setShowCancelConfirm(true)}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl font-medium text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" /> Hủy lộ trình
            </button>
          </>
        )}
        {roadmap.status === "paused" && (
          <button
            onClick={() => handleAction("resume")}
            disabled={actionLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-teal-50 text-teal-700 rounded-xl font-medium text-sm hover:bg-teal-100 transition-colors disabled:opacity-50"
          >
            <Play className="w-4 h-4" /> Tiếp tục học
          </button>
        )}
      </div>

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto mb-4">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-red-600 text-center">
              Hủy lộ trình?
            </h3>
            <p className="text-sm text-slate-600 text-center mt-2">
              Toàn bộ tiến độ học tập lộ trình của bạn sẽ bị xóa bỏ và không thể
              khôi phục.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
              >
                Giữ lại học tiếp
              </button>
              <button
                onClick={async () => {
                  setShowCancelConfirm(false);
                  await handleAction("abandoned");
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700"
              >
                Hủy lộ trình
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
