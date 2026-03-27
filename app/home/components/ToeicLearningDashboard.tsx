'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { EChartsOption } from 'echarts';
import type { AttemptHistoryItem, PracticeHistoryItem } from '@/lib/types';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

type SpeakingSkills = {
  pronunciation: number;
  fluency: number;
  grammar: number;
  vocabulary: number;
  content: number;
};

const SKILL_KEY_MAP: Record<keyof SpeakingSkills, string[]> = {
  pronunciation: ['pronunciation', 'delivery', 'intonation'],
  fluency: ['fluency'],
  grammar: ['grammar', 'language_use'],
  vocabulary: ['vocabulary'],
  content: [
    'content',
    'task_response',
    'task response',
    'relevance',
    'completeness',
    'content_coverage',
    'direct_answer',
    'supporting_details',
    'information_accuracy',
    'opinion_clarity',
    'reasons_examples',
  ],
};

function normalizeScoreToFive(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value <= 5) return value;
  if (value <= 10) return value / 2;
  if (value <= 100) return value / 20;
  if (value <= 200) return value / 40;
  return 5;
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function formatFullDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildSpeakingSkills(rows: PracticeHistoryItem[]): SpeakingSkills {
  const totals: Record<keyof SpeakingSkills, number> = {
    pronunciation: 0,
    fluency: 0,
    grammar: 0,
    vocabulary: 0,
    content: 0,
  };
  const counts: Record<keyof SpeakingSkills, number> = {
    pronunciation: 0,
    fluency: 0,
    grammar: 0,
    vocabulary: 0,
    content: 0,
  };

  for (const row of rows) {
    const taskScores = row.ai_task_scores || {};

    for (const targetKey of Object.keys(SKILL_KEY_MAP) as Array<keyof SpeakingSkills>) {
      const aliases = SKILL_KEY_MAP[targetKey];
      for (const alias of aliases) {
        const raw = taskScores[alias];
        if (typeof raw !== 'number') continue;
        totals[targetKey] += normalizeScoreToFive(raw);
        counts[targetKey] += 1;
      }
    }
  }

  return {
    pronunciation: counts.pronunciation ? Number((totals.pronunciation / counts.pronunciation).toFixed(2)) : 0,
    fluency: counts.fluency ? Number((totals.fluency / counts.fluency).toFixed(2)) : 0,
    grammar: counts.grammar ? Number((totals.grammar / counts.grammar).toFixed(2)) : 0,
    vocabulary: counts.vocabulary ? Number((totals.vocabulary / counts.vocabulary).toFixed(2)) : 0,
    content: counts.content ? Number((totals.content / counts.content).toFixed(2)) : 0,
  };
}

type ToeicLearningDashboardProps = {
  examHistory: AttemptHistoryItem[];
  speakingHistory: PracticeHistoryItem[];
  activityTimestamps: string[];
};

export default function ToeicLearningDashboard({ examHistory, speakingHistory, activityTimestamps }: ToeicLearningDashboardProps) {
  const chartHistory = useMemo(() => {
    return [...examHistory]
      .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
      .slice(-8);
  }, [examHistory]);

  const currentScore = chartHistory.length > 0 ? chartHistory[chartHistory.length - 1].score : 0;
  const speakingSkills = useMemo(() => buildSpeakingSkills(speakingHistory), [speakingHistory]);
  const frequencyData = useMemo(() => {
    const dayLabels: string[] = [];
    const dayKeys: string[] = [];
    const dailyCount = new Map<string, number>();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 13; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      const label = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      dayKeys.push(key);
      dayLabels.push(label);
      dailyCount.set(key, 0);
    }

    for (const value of activityTimestamps) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) continue;
      const key = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().slice(0, 10);
      if (!dailyCount.has(key)) continue;
      dailyCount.set(key, (dailyCount.get(key) || 0) + 1);
    }

    return {
      labels: dayLabels,
      keys: dayKeys,
      values: dayKeys.map((key) => dailyCount.get(key) || 0),
    };
  }, [activityTimestamps]);

  const gaugeOption = useMemo<EChartsOption>(() => ({
    animation: true,
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}',
    },
    series: [
      {
        name: 'Điểm hiện tại',
        type: 'gauge',
        min: 0,
        max: 990,
        radius: '82%',
        center: ['50%', '52%'],
        progress: { show: true, width: 14, roundCap: true },
        axisLine: {
          lineStyle: {
            width: 14,
            color: [
              [400 / 990, '#ef4444'],
              [700 / 990, '#f59e0b'],
              [1, '#22c55e'],
            ],
          },
        },
        splitLine: { distance: 2, length: 8, lineStyle: { color: '#cbd5e1', width: 1 } },
        axisTick: { distance: 6, length: 4, lineStyle: { color: '#94a3b8', width: 1 } },
        axisLabel: {
          distance: 24,
          color: '#64748b',
          fontSize: 11,
        },
        pointer: {
          length: '65%',
          width: 5,
          itemStyle: { color: '#0f172a' },
        },
        anchor: {
          show: true,
          showAbove: true,
          size: 10,
          itemStyle: { color: '#0f172a' },
        },
        detail: {
          valueAnimation: true,
          formatter: '{value}',
          fontSize: 30,
          fontWeight: 700,
          color: '#0f172a',
          offsetCenter: [0, '104%'],
        },
        title: {
          offsetCenter: [0, '84%'],
          fontSize: 13,
          color: '#475569',
        },
        data: [{ value: currentScore, name: 'Điểm hiện tại' }],
      },
    ],
  }), [currentScore]);

  const lineOption = useMemo<EChartsOption>(() => ({
    animation: true,
    color: ['#0ea5e9'],
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0f172a',
      borderWidth: 0,
      textStyle: { color: '#f8fafc' },
      formatter: (params: unknown) => {
        const rows = Array.isArray(params) ? params : [params];
        const first = rows[0] as { data?: number; dataIndex?: number };
        const point = typeof first.dataIndex === 'number' ? chartHistory[first.dataIndex] : undefined;
        const dateLabel = point ? formatFullDateTime(point.submittedAt) : '';
        return `Ngày: ${dateLabel}<br/>Điểm: ${first.data ?? ''}`;
      },
    },
    grid: {
      top: 20,
      right: 20,
      bottom: 30,
      left: 42,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: chartHistory.map((point) => formatShortDate(point.submittedAt)),
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: { color: '#64748b' },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 990,
      axisLine: { show: false },
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: '#e2e8f0' } },
    },
    series: [
      {
        name: 'Điểm TOEIC',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 9,
        data: chartHistory.map((point) => point.score),
        lineStyle: { width: 3 },
        itemStyle: { color: '#0284c7', borderColor: '#e0f2fe', borderWidth: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(14,165,233,0.28)' },
              { offset: 1, color: 'rgba(14,165,233,0.03)' },
            ],
          },
        },
      },
    ],
  }), [chartHistory]);

  const radarOption = useMemo<EChartsOption>(() => ({
    animation: true,
    tooltip: {
      trigger: 'item',
      backgroundColor: '#0f172a',
      borderWidth: 0,
      textStyle: { color: '#f8fafc' },
    },
    radar: {
      radius: '68%',
      splitNumber: 5,
      indicator: [
        { name: 'Phát âm', max: 5 },
        { name: 'Lưu loát', max: 5 },
        { name: 'Ngữ pháp', max: 5 },
        { name: 'Từ vựng', max: 5 },
        { name: 'Nội dung', max: 5 },
      ],
      axisName: { color: '#334155', fontSize: 12, fontWeight: 600 },
      splitLine: { lineStyle: { color: '#cbd5e1' } },
      splitArea: {
        areaStyle: { color: ['#f8fafc', '#f1f5f9'] },
      },
      axisLine: { lineStyle: { color: '#cbd5e1' } },
    },
    series: [
      {
        name: 'Kỹ năng Speaking',
        type: 'radar',
        data: [
          {
            value: [
              speakingSkills.pronunciation,
              speakingSkills.fluency,
              speakingSkills.grammar,
              speakingSkills.vocabulary,
              speakingSkills.content,
            ],
            name: 'Mức hiện tại',
            areaStyle: { color: 'rgba(16,185,129,0.28)' },
            lineStyle: { color: '#059669', width: 2.5 },
            itemStyle: { color: '#047857' },
          },
        ],
      },
    ],
  }), [speakingSkills]);

  const frequencyOption = useMemo<EChartsOption>(() => ({
    animation: true,
    color: ['#2563eb'],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#0f172a',
      borderWidth: 0,
      textStyle: { color: '#f8fafc' },
      formatter: (params: unknown) => {
        const rows = Array.isArray(params) ? params : [params];
        const first = rows[0] as { data?: number; axisValue?: string; dataIndex?: number };
        const idx = typeof first.dataIndex === 'number' ? first.dataIndex : -1;
        const date = idx >= 0 ? frequencyData.keys[idx] : first.axisValue || '';
        return `Ngày: ${date}<br/>Số phiên học: ${first.data ?? 0}`;
      },
    },
    grid: {
      top: 16,
      right: 16,
      bottom: 26,
      left: 34,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: frequencyData.labels,
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: { color: '#64748b' },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLine: { show: false },
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: '#e2e8f0' } },
    },
    series: [
      {
        name: 'Số phiên học',
        type: 'bar',
        data: frequencyData.values,
        barWidth: '58%',
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#2563eb' },
              { offset: 1, color: '#38bdf8' },
            ],
          },
        },
      },
    ],
  }), [frequencyData]);

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-slate-800">Biểu đồ thống kê</h3>
        <p className="text-sm text-slate-500 mt-1">Theo dõi điểm tổng, tiến trình, kỹ năng nói và tần suất học.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-slate-800">Điểm TOEIC hiện tại</h4>
            <span className="text-xs text-slate-500">0 - 990</span>
          </div>
          <ReactECharts option={gaugeOption} style={{ height: 300, width: '100%' }} />
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-slate-800">Tiến trình các bài thi gần đây</h4>
            <span className="text-xs text-slate-500">0 - 990</span>
          </div>
          <ReactECharts option={lineOption} style={{ height: 300, width: '100%' }} />
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-slate-800">Phân tích kỹ năng Speaking</h4>
            <span className="text-xs text-slate-500">Thang điểm 0 - 5</span>
          </div>
          <ReactECharts option={radarOption} style={{ height: 300, width: '100%' }} />
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-slate-800">Tần suất học 14 ngày gần nhất</h4>
            <span className="text-xs text-slate-500">Theo số phiên học</span>
          </div>
          <ReactECharts option={frequencyOption} style={{ height: 300, width: '100%' }} />
        </div>
      </div>
    </section>
  );
}
