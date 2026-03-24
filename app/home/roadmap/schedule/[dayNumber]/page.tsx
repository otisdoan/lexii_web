'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Calendar,
  Loader2,
} from 'lucide-react';
import type { UserDailySchedule, UserTask } from '@/lib/types';
import { getUserDailySchedule } from '@/lib/roadmap';
import { supabase } from '@/lib/supabase';

const TASK_TYPE_ICONS: Record<string, { emoji: string; bg: string }> = {
  vocabulary: { emoji: '📚', bg: 'bg-blue-50' },
  grammar: { emoji: '📖', bg: 'bg-green-50' },
  listening: { emoji: '🎧', bg: 'bg-sky-50' },
  reading: { emoji: '📄', bg: 'bg-amber-50' },
  speaking: { emoji: '🎙️', bg: 'bg-orange-50' },
  writing: { emoji: '✍️', bg: 'bg-purple-50' },
  mini_test: { emoji: '📝', bg: 'bg-red-50' },
  review: { emoji: '🔄', bg: 'bg-teal-50' },
};

const TASK_TYPE_LABELS: Record<string, string> = {
  vocabulary: 'Từ vựng',
  grammar: 'Ngữ pháp',
  listening: 'Nghe',
  reading: 'Đọc',
  speaking: 'Nói',
  writing: 'Viết',
  mini_test: 'Kiểm tra',
  review: 'Ôn tập',
};

export default function ScheduleDayPage() {
  const params = useParams();
  const router = useRouter();
  const dayNumber = parseInt(params.dayNumber as string);

  const [schedule, setSchedule] = useState<UserDailySchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalDays, setTotalDays] = useState(0);

  useEffect(() => {
    loadSchedule();
  }, [dayNumber]);

  async function loadSchedule() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }

      // Lấy roadmap active
      const { data: roadmap } = await supabase
        .from('user_roadmaps')
        .select('id, duration_days')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!roadmap) { router.push('/home/roadmap'); return; }

      setTotalDays(roadmap.duration_days);
      const sched = await getUserDailySchedule(roadmap.id, dayNumber);
      setSchedule(sched);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteTask(taskId: string) {
    try {
      const res = await fetch(`/api/roadmap/task/${taskId}/complete`, {
        method: 'PATCH',
      });
      if (res.ok) {
        await loadSchedule();
      }
    } catch {
      // silently handle
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Không tìm thấy dữ liệu cho ngày này</p>
        <Link href="/home/roadmap" className="text-teal-600 text-sm mt-2 inline-block hover:underline">
          ← Quay lại lộ trình
        </Link>
      </div>
    );
  }

  const completedCount = schedule.tasks?.filter(t => t.is_completed).length ?? 0;
  const totalTasks = schedule.tasks?.length ?? 0;

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/home/roadmap"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ChevronLeft className="w-4 h-4" /> Lộ trình
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => dayNumber > 1 && router.push(`/home/roadmap/schedule/${dayNumber - 1}`)}
            disabled={dayNumber <= 1}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-slate-600">Ngày {dayNumber}/{totalDays}</span>
          <button
            onClick={() => dayNumber < totalDays && router.push(`/home/roadmap/schedule/${dayNumber + 1}`)}
            disabled={dayNumber >= totalDays}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day Info Card */}
      <div className={`rounded-2xl p-5 mb-6 ${
        schedule.is_completed
          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
          : 'bg-white border border-slate-100'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-lg font-bold ${schedule.is_completed ? 'text-white' : 'text-slate-800'}`}>
              Ngày {schedule.actual_day_number}
            </h2>
            {schedule.study_date && (
              <p className={`text-sm flex items-center gap-1 mt-0.5 ${
                schedule.is_completed ? 'text-green-100' : 'text-slate-500'
              }`}>
                <Calendar className="w-3.5 h-3.5" />
                {new Date(schedule.study_date).toLocaleDateString('vi-VN', {
                  weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
                })}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className={`flex items-center gap-1 text-sm ${
              schedule.is_completed ? 'text-green-100' : 'text-slate-500'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              ~{schedule.total_estimated_minutes} phút
            </div>
            <p className={`text-lg font-bold mt-0.5 ${
              schedule.is_completed ? 'text-white' : 'text-teal-600'
            }`}>
              {completedCount}/{totalTasks} ✓
            </p>
          </div>
        </div>

        {schedule.is_completed && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/20">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Đã hoàn thành tất cả nhiệm vụ!</span>
          </div>
        )}
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {schedule.tasks && schedule.tasks.length > 0 ? (
          schedule.tasks.map((task: UserTask, index: number) => {
            const typeInfo = TASK_TYPE_ICONS[task.task_type] || TASK_TYPE_ICONS.review;
            const typeLabel = TASK_TYPE_LABELS[task.task_type] || task.task_type;

            return (
              <div
                key={task.id}
                className={`bg-white rounded-xl border p-4 transition-all ${
                  task.is_completed
                    ? 'border-green-100 bg-green-50/50'
                    : 'border-slate-100 hover:border-teal-200 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => !task.is_completed && handleCompleteTask(task.id)}
                    disabled={task.is_completed}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      task.is_completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-slate-300 hover:border-teal-400'
                    }`}
                  >
                    {task.is_completed && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeInfo.bg}`}>
                    <span className="text-xl">{typeInfo.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-medium">
                        {typeLabel}
                      </span>
                      <span className="text-xs text-slate-400">{task.estimated_minutes} phút</span>
                    </div>
                    <p className={`text-sm font-medium mt-1 ${
                      task.is_completed ? 'text-slate-400 line-through' : 'text-slate-700'
                    }`}>
                      {index + 1}. {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{task.description}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-slate-400">
            <p className="text-sm">Không có nhiệm vụ nào cho ngày này</p>
          </div>
        )}
      </div>
    </div>
  );
}
