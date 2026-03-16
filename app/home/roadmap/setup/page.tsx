'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoadmapStore } from '@/lib/roadmap-store';
import type { TargetScore, SelfAssessedLevel } from '@/lib/types';

const TARGETS: { value: TargetScore; label: string }[] = [
  { value: 500, label: '500+' },
  { value: 700, label: '700+' },
  { value: 900, label: '900+' },
];

const LEVELS: { value: SelfAssessedLevel; label: string }[] = [
  { value: 'zero', label: 'Mất gốc (0-250)' },
  { value: 'basic', label: 'Cơ bản (255-450)' },
  { value: 'intermediate', label: 'Trung cấp (455-700)' },
  { value: 'unknown', label: 'Chưa rõ trình độ' },
];

export default function RoadmapSetupPage() {
  const router = useRouter();
  const setSetup = useRoadmapStore((s) => s.setSetup);
  const [targetScore, setTargetScore] = useState<TargetScore | null>(null);
  const [selfAssessedLevel, setSelfAssessedLevel] = useState<SelfAssessedLevel>('unknown');

  const handleStart = () => {
    if (targetScore == null) return;
    setSetup(targetScore, selfAssessedLevel);
    router.push('/home/roadmap/test');
  };

  return (
    <div className="pb-20 lg:pb-8 max-w-lg mx-auto">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 text-center mb-2">
          Hãy cùng Lexii chinh phục TOEIC nhé!
        </h1>
        <p className="text-slate-500 text-sm text-center mb-6">
          Chọn mục tiêu và trình độ hiện tại để bắt đầu
        </p>

        {/* Target */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Chọn mục tiêu</label>
          <div className="flex flex-wrap gap-2">
            {TARGETS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTargetScore(value)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  targetScore === value
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Level */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Trình độ hiện tại</label>
          <select
            value={selfAssessedLevel}
            onChange={(e) => setSelfAssessedLevel(e.target.value as SelfAssessedLevel)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          >
            {LEVELS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Test info */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-slate-600">
            Để bắt đầu, vui lòng làm bài kiểm tra trình độ.
          </p>
          <p className="text-sm font-medium text-slate-700 mt-1">
            Thời gian: 15 phút · Số câu: 15
          </p>
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={targetScore == null}
          className="w-full py-3.5 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
        >
          Bắt đầu ngay
        </button>
      </div>
    </div>
  );
}
