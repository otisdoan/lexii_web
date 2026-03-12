'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Headphones,
  BookOpen,
  Mic,
  PenTool,
  ChevronRight,
  Lock,
  BarChart3,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { getListeningParts, getReadingParts, getFullTests } from '@/lib/api';
import type { TestPartModel, TestModel } from '@/lib/types';

const skillConfig: Record<string, { title: string; icon: typeof Headphones; color: string; bgColor: string; textColor: string }> = {
  listening: { title: 'Listening', icon: Headphones, color: 'bg-blue-500', bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
  reading: { title: 'Reading', icon: BookOpen, color: 'bg-green-600', bgColor: 'bg-green-50', textColor: 'text-green-600' },
  speaking: { title: 'Speaking', icon: Mic, color: 'bg-orange-500', bgColor: 'bg-orange-50', textColor: 'text-orange-600' },
  writing: { title: 'Writing', icon: PenTool, color: 'bg-purple-500', bgColor: 'bg-purple-50', textColor: 'text-purple-600' },
};

const partDescriptions: Record<string, Record<number, { title: string; description: string }>> = {
  listening: {
    1: { title: 'Part 1: Photographs', description: 'Xem ảnh và chọn mô tả phù hợp nhất' },
    2: { title: 'Part 2: Question-Response', description: 'Nghe câu hỏi và chọn câu trả lời phù hợp' },
    3: { title: 'Part 3: Conversations', description: 'Nghe hội thoại và trả lời câu hỏi' },
    4: { title: 'Part 4: Talks', description: 'Nghe bài nói và trả lời câu hỏi' },
  },
  reading: {
    5: { title: 'Part 5: Incomplete Sentences', description: 'Chọn từ phù hợp để hoàn thành câu' },
    6: { title: 'Part 6: Text Completion', description: 'Chọn từ/câu để hoàn thành đoạn văn' },
    7: { title: 'Part 7: Reading Comprehension', description: 'Đọc bài đọc và trả lời câu hỏi' },
  },
  speaking: {
    1: { title: 'Part 1: Read Aloud', description: 'Đọc to đoạn văn bản' },
    2: { title: 'Part 2: Describe a Picture', description: 'Mô tả hình ảnh trong 45 giây' },
    3: { title: 'Part 3: Respond to Questions', description: 'Trả lời câu hỏi về chủ đề' },
    4: { title: 'Part 4: Express an Opinion', description: 'Trình bày quan điểm cá nhân' },
    5: { title: 'Part 5: Propose a Solution', description: 'Đề xuất giải pháp cho vấn đề' },
  },
  writing: {
    1: { title: 'Part 1: Write a Sentence', description: 'Viết câu mô tả hình ảnh' },
    2: { title: 'Part 2: Respond to a Request', description: 'Viết email phản hồi yêu cầu' },
    3: { title: 'Part 3: Write an Opinion Essay', description: 'Viết bài luận trình bày quan điểm' },
  },
};

export default function PracticeDetailPage({ params }: { params: Promise<{ skill: string }> }) {
  const { skill } = use(params);
  const router = useRouter();
  const config = skillConfig[skill] || skillConfig.listening;
  const Icon = config.icon;

  const [parts, setParts] = useState<TestPartModel[]>([]);
  const [tests, setTests] = useState<TestModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const allTests = await getFullTests();
        setTests(allTests);
        if (allTests.length > 0 && (skill === 'listening' || skill === 'reading')) {
          const testId = allTests[0].id;
          const ps = skill === 'listening'
            ? await getListeningParts(testId)
            : await getReadingParts(testId);
          setParts(ps);
        }
      } catch {
        //
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [skill]);

  const descriptions = partDescriptions[skill] || {};

  const handlePartClick = (part: TestPartModel) => {
    if (skill === 'writing') {
      router.push(`/home/practice/writing-question?partNumber=${part.part_number}&title=${encodeURIComponent(descriptions[part.part_number]?.title || `Part ${part.part_number}`)}`);
    } else if (skill === 'reading') {
      router.push(`/home/practice/reading-question?testId=${tests[0]?.id || ''}&partId=${part.id}&title=${encodeURIComponent(descriptions[part.part_number]?.title || `Part ${part.part_number}`)}`);
    } else {
      // Listening - go to exam question page  
      router.push(`/home/exam/question?testId=${tests[0]?.id || ''}&title=${encodeURIComponent(descriptions[part.part_number]?.title || `Part ${part.part_number}`)}&partId=${part.id}&practice=true`);
    }
  };

  return (
    <div className="pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${config.bgColor} rounded-xl flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${config.textColor}`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{config.title}</h2>
            <p className="text-sm text-slate-500">Luyện tập từng phần</p>
          </div>
        </div>
      </div>

      {/* Stats card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-slate-800">Tiến độ chung</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">0</p>
            <p className="text-xs text-slate-500">Đã làm</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">0</p>
            <p className="text-xs text-slate-500">Đúng</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-400">0%</p>
            <p className="text-xs text-slate-500">Tỷ lệ</p>
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
          <div className="bg-primary rounded-full h-2 w-0" />
        </div>
      </div>

      {/* Practice wrong answers card */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-5 mb-6 text-white">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-8 h-8" />
          <div className="flex-1">
            <h4 className="font-semibold">Luyện tập câu sai</h4>
            <p className="text-sm text-orange-100">Ôn lại các câu đã trả lời sai</p>
          </div>
          <ChevronRight className="w-5 h-5" />
        </div>
      </div>

      {/* Parts list */}
      <h3 className="text-lg font-bold text-slate-800 mb-4">Danh sách Part</h3>
      <div className="space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-100 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))
        ) : (
          <>
            {/* DB-backed parts */}
            {parts.map(part => {
              const desc = descriptions[part.part_number];
              return (
                <button
                  key={part.id}
                  onClick={() => handlePartClick(part)}
                  className="w-full flex items-center gap-4 bg-white rounded-xl border border-slate-100 p-4 hover:shadow-sm hover:border-primary/20 transition-all text-left group"
                >
                  <div className={`w-12 h-12 ${config.bgColor} rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon className={`w-6 h-6 ${config.textColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm">{desc?.title || `Part ${part.part_number}`}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{desc?.description || ''}</p>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                      <div className="bg-primary rounded-full h-1.5 w-0" />
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                </button>
              );
            })}

            {/* Static parts for speaking/writing */}
            {(skill === 'speaking' || (skill === 'writing' && parts.length === 0)) && (
              Object.entries(descriptions).map(([num, desc]) => (
                <div
                  key={num}
                  className="flex items-center gap-4 bg-white rounded-xl border border-slate-100 p-4 opacity-70"
                >
                  <div className={`w-12 h-12 ${config.bgColor} rounded-xl flex items-center justify-center shrink-0`}>
                    <Icon className={`w-6 h-6 ${config.textColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm">{desc.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{desc.description}</p>
                  </div>
                  {skill === 'speaking' ? (
                    <span className="text-xs text-slate-400 flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> Sắp ra mắt</span>
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                </div>
              ))
            )}

            {parts.length === 0 && skill !== 'speaking' && skill !== 'writing' && (
              <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
                <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Chưa có dữ liệu luyện tập</p>
                <p className="text-xs text-slate-400">Thêm đề thi vào hệ thống để bắt đầu</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
