'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoadmapStore } from '@/lib/roadmap-store';
import {
  getRoadmapTemplateByTargetAndDuration,
  createUserRoadmap,
  getCurrentUser,
} from '@/lib/api';
import type { DurationDays } from '@/lib/types';

const DURATIONS: { value: DurationDays; label: string }[] = [
  { value: 30, label: '30 ngày' },
  { value: 60, label: '60 ngày' },
  { value: 90, label: '90 ngày' },
  { value: 180, label: '180 ngày' },
];

const GAP_THRESHOLD = 400;
const DISABLED_TOOLTIP =
  'Mục tiêu này đòi hỏi nhiều thời gian hơn để xây dựng nền tảng. Vui lòng chọn 90 hoặc 180 ngày.';

export default function RoadmapDurationPage() {
  const router = useRouter();
  const targetScore = useRoadmapStore((s) => s.targetScore);
  const placementScore = useRoadmapStore((s) => s.placementScore);
  const setDurationDays = useRoadmapStore((s) => s.setDurationDays);
  const setRoadmapCreated = useRoadmapStore((s) => s.setUserRoadmapId);
  const isDurationDisabled = useRoadmapStore((s) => s.isDurationDisabled);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gap = targetScore != null && placementScore != null ? targetScore - placementScore : null;
  const showTooltip = gap != null && gap > GAP_THRESHOLD;

  const handleSelect = async (days: DurationDays) => {
    if (targetScore == null || placementScore == null) return;
    if (isDurationDisabled(days)) return;
    setSubmitting(true);
    setError(null);
    try {
      const template = await getRoadmapTemplateByTargetAndDuration(targetScore, days);
      if (!template) {
        setDurationDays(days);
        setRoadmapCreated('');
        router.push('/home/roadmap');
        return;
      }
      const user = await getCurrentUser();
      if (user) {
        const roadmap = await createUserRoadmap(
          user.id,
          template.id,
          placementScore,
          targetScore
        );
        setDurationDays(days);
        setRoadmapCreated(roadmap.id);
      } else {
        setDurationDays(days);
        setRoadmapCreated('');
      }
      router.push('/home/roadmap');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Có lỗi xảy ra');
      setDurationDays(days);
      setRoadmapCreated('');
      router.push('/home/roadmap');
    } finally {
      setSubmitting(false);
    }
  };

  if (targetScore == null || placementScore == null) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-500 mb-4">Vui lòng hoàn thành bài kiểm tra trình độ trước.</p>
        <button
          onClick={() => router.push('/home/roadmap/setup')}
          className="text-primary font-medium hover:underline"
        >
          Bắt đầu từ đầu
        </button>
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-8 max-w-lg mx-auto">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
        <h1 className="text-xl font-bold text-slate-900 text-center mb-2">
          Bạn muốn đạt mục tiêu trong bao lâu?
        </h1>
        <p className="text-slate-500 text-sm text-center mb-6">
          Mục tiêu {targetScore}+ · Điểm hiện tại: {placementScore}
        </p>

        {showTooltip && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
            {DISABLED_TOOLTIP}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {DURATIONS.map(({ value, label }) => {
            const disabled = isDurationDisabled(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleSelect(value)}
                disabled={disabled || submitting}
                title={disabled ? DISABLED_TOOLTIP : undefined}
                className={`relative px-4 py-5 rounded-xl text-center font-semibold transition-all ${
                  disabled
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary-dark shadow-md'
                } ${submitting ? 'opacity-70 pointer-events-none' : ''}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
