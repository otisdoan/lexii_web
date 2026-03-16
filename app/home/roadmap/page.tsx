'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Settings2, Target } from 'lucide-react';
import { useRoadmapStore } from '@/lib/roadmap-store';
import {
  getRoadmapById,
  getRoadmapTasks,
  getUserTaskProgress,
  dropUserRoadmap,
} from '@/lib/api';
import type { RoadmapTaskModel, UserRoadmapModel, UserTaskProgressModel } from '@/lib/types';

function generatePlaceholderTasks(durationDays: number): { day: number; title: string; task_type: string }[] {
  const tasks: { day: number; title: string; task_type: string }[] = [];
  const types = [
    { type: 'theory', title: 'Học Part 1' },
    { type: 'practice', title: 'Luyện nghe' },
    { type: 'practice', title: 'Luyện đọc' },
    { type: 'test', title: 'Làm bài mini test' },
  ];
  for (let day = 1; day <= Math.min(durationDays, 14); day++) {
    const t = types[(day - 1) % types.length];
    tasks.push({ day, title: `${t.title} - Ngày ${day}`, task_type: t.type });
  }
  if (durationDays > 14) {
    tasks.push({ day: 15, title: '... Tiếp tục theo lộ trình', task_type: 'theory' });
  }
  return tasks;
}

export default function RoadmapDashboardPage() {
  const router = useRouter();
  const userRoadmapId = useRoadmapStore((s) => s.userRoadmapId);
  const targetScore = useRoadmapStore((s) => s.targetScore);
  const durationDays = useRoadmapStore((s) => s.durationDays);
  const placementScore = useRoadmapStore((s) => s.placementScore);
  const clearRoadmap = useRoadmapStore((s) => s.clearRoadmap);

  const [roadmap, setRoadmap] = useState<UserRoadmapModel | null>(null);
  const [tasks, setTasks] = useState<RoadmapTaskModel[]>([]);
  const [progress, setProgress] = useState<UserTaskProgressModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    async function load() {
      if (!userRoadmapId) {
        setLoading(false);
        return;
      }
      try {
        const ur = await getRoadmapById(userRoadmapId);
        setRoadmap(ur);
        if (ur) {
          const [taskList, progressList] = await Promise.all([
            getRoadmapTasks(ur.template_id),
            getUserTaskProgress(userRoadmapId),
          ]);
          setTasks(taskList);
          setProgress(progressList);
        } else {
          setTasks([]);
          setProgress([]);
        }
      } catch {
        setTasks([]);
        setProgress([]);
        setRoadmap(null);
      } finally {
        setLoading(false);
      }
    }
    if (userRoadmapId) {
      load();
    } else {
      setLoading(false);
    }
  }, [userRoadmapId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleReset = () => {
    if (userRoadmapId) {
      dropUserRoadmap(userRoadmapId).catch(() => {});
    }
    clearRoadmap();
    router.push('/home/roadmap/setup');
  };

  const hasSetup = targetScore != null && durationDays != null;
  const hasNoData = !hasSetup && !userRoadmapId;

  if (!mounted) {
    return null;
  }

  if (loading && userRoadmapId) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (hasNoData) {
    return (
      <div className="pb-20 lg:pb-8 max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
          <Target className="w-14 h-14 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Chưa có lộ trình</h2>
          <p className="text-slate-500 text-sm mb-6">
            Thiết lập mục tiêu và làm bài kiểm tra trình độ để tạo lộ trình học cá nhân.
          </p>
          <Link
            href="/home/roadmap/setup"
            className="inline-flex items-center gap-2 py-3 px-6 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
          >
            Thiết lập lộ trình
          </Link>
        </div>
      </div>
    );
  }

  const progressByTaskId = new Map(progress.map((p) => [p.task_id, p]));
  const tasksByDay = tasks.length
    ? tasks.reduce<Record<number, RoadmapTaskModel[]>>((acc, t) => {
        if (!acc[t.day_number]) acc[t.day_number] = [];
        acc[t.day_number].push(t);
        return acc;
      }, {})
    : null;

  const placeholderTasks = durationDays ? generatePlaceholderTasks(durationDays) : [];
  const daysToShow = tasksByDay
    ? Object.keys(tasksByDay)
        .map(Number)
        .sort((a, b) => a - b)
    : [...new Set(placeholderTasks.map((t) => t.day))].sort((a, b) => a - b);

  return (
    <div className="pb-20 lg:pb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">Lộ trình học</h2>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          aria-label="Thiết lập lại lộ trình"
        >
          <Settings2 className="w-4 h-4" />
          Thiết lập lại lộ trình
        </button>
      </div>

      {(targetScore != null || roadmap) && (
        <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-sm text-slate-600">
            Mục tiêu: <span className="font-semibold text-slate-800">{roadmap?.target_score ?? targetScore}+</span>
            {placementScore != null && (
              <> · Điểm hiện tại: <span className="font-medium">{placementScore}</span></>
            )}
            {durationDays != null && (
              <> · Thời gian: <span className="font-medium">{durationDays} ngày</span></>
            )}
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 flex items-center gap-4">
          <span className="text-xs font-medium text-slate-500 w-16">Ngày</span>
          <span className="text-xs font-medium text-slate-500 flex-1">Nhiệm vụ</span>
        </div>
        <div className="divide-y divide-slate-50 max-h-[60vh] overflow-y-auto">
          {daysToShow.length === 0 && placeholderTasks.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Chưa có nhiệm vụ. Vui lòng thiết lập lại lộ trình.
            </div>
          ) : (
            daysToShow.map((dayNum) => {
              const dayTasks = tasksByDay?.[dayNum] ?? [];
              const placeholders = placeholderTasks.filter((t) => t.day === dayNum);
              const list = dayTasks.length ? dayTasks : placeholders.map((p) => ({
                id: `ph-${dayNum}-${p.title}`,
                template_id: '',
                day_number: dayNum,
                task_type: p.task_type as 'theory' | 'practice' | 'test',
                reference_id: null,
                title: p.title,
              })) as RoadmapTaskModel[];

              return (
                <div key={dayNum} className="flex gap-4 px-4 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="w-16 shrink-0 flex items-center">
                    <span className="text-sm font-bold text-primary">Ngày {dayNum}</span>
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
                    {list.map((task) => {
                      const prog = task.id ? progressByTaskId.get(task.id) : null;
                      const isCompleted = prog?.status === 'completed';
                      return (
                        <div
                          key={task.id}
                          className={`flex items-center gap-2 text-sm ${isCompleted ? 'text-slate-500' : 'text-slate-800'}`}
                        >
                          {isCompleted ? (
                            <span className="text-green-500 font-bold">✓</span>
                          ) : (
                            <span className="w-4 h-4 rounded border border-slate-300 shrink-0" />
                          )}
                          <span className={isCompleted ? 'line-through' : ''}>{task.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
