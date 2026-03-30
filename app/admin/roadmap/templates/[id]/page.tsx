'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  GripVertical,
  Lock,
} from 'lucide-react';
import type { RoadmapTemplate, TemplateTask, RoadmapTaskType } from '@/lib/types';
import { supabase } from '@/lib/supabase';

const TASK_TYPES: { value: RoadmapTaskType; label: string }[] = [
  { value: 'vocabulary', label: '📚 Từ vựng' },
  { value: 'grammar', label: '📖 Ngữ pháp' },
  { value: 'listening', label: '🎧 Nghe' },
  { value: 'reading', label: '📄 Đọc' },
  { value: 'speaking', label: '🎙️ Nói' },
  { value: 'writing', label: '✍️ Viết' },
  { value: 'practice', label: '🏋️ Luyện tập' },
  { value: 'mini_test', label: '📝 Kiểm tra' },
  { value: 'review', label: '🔄 Ôn tập' },
  { value: 'full_test', label: '🎯 Thi thử Full' },
];

export default function AdminTemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<RoadmapTemplate | null>(null);
  const [tasks, setTasks] = useState<TemplateTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit template
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDuration, setEditDuration] = useState(60);

  // New task form
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    sequence_order: 1,
    task_type: 'vocabulary' as RoadmapTaskType,
    is_standalone: false,
    title: '',
    description: '',
    estimated_minutes: 15,
  });

  useEffect(() => {
    loadData();
  }, [templateId]);

  async function loadData() {
    try {
      const { data: tmpl } = await supabase
        .from('roadmap_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      if (!tmpl) { router.push('/admin/roadmap'); return; }
      setTemplate(tmpl as RoadmapTemplate);
      setEditTitle((tmpl as RoadmapTemplate).title);
      setEditDesc((tmpl as RoadmapTemplate).description || '');
      setEditDuration((tmpl as RoadmapTemplate).default_duration_days);

      const { data: taskData } = await supabase
        .from('template_tasks')
        .select('*')
        .eq('template_id', templateId)
        .order('sequence_order');
      setTasks((taskData || []) as TemplateTask[]);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveTemplate() {
    setSaving(true);
    try {
      await supabase
        .from('roadmap_templates')
        .update({
          title: editTitle,
          description: editDesc,
          default_duration_days: editDuration,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTask() {
    try {
      await supabase.from('template_tasks').insert({
        template_id: templateId,
        sequence_order: newTask.sequence_order,
        task_type: newTask.task_type,
        is_standalone: newTask.is_standalone,
        title: newTask.title,
        description: newTask.description || null,
        estimated_minutes: newTask.estimated_minutes,
      });
      setNewTask({
        sequence_order: (tasks.length > 0 ? Math.max(...tasks.map(t => t.sequence_order)) + 1 : 1),
        task_type: 'vocabulary',
        is_standalone: false,
        title: '',
        description: '',
        estimated_minutes: 15,
      });
      setShowAddTask(false);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi');
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm('Xóa task này?')) return;
    try {
      await supabase.from('template_tasks').delete().eq('id', taskId);
      await loadData();
    } catch {
      //
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  if (!template) return null;

  // Sort tasks by sequence_order
  const sortedTasks = [...tasks].sort((a, b) => a.sequence_order - b.sequence_order);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/roadmap"
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Chỉnh sửa Template</h1>
          <p className="text-sm text-slate-500">{template.start_score} → {template.target_score} điểm</p>
        </div>
      </div>

      {/* Template Info */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-slate-600 mb-1">Tên template</label>
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-teal-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Số ngày chuẩn</label>
            <input
              type="number"
              value={editDuration}
              onChange={e => setEditDuration(parseInt(e.target.value) || 30)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-teal-400 outline-none"
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-sm text-slate-600 mb-1">Mô tả</label>
          <textarea
            value={editDesc}
            onChange={e => setEditDesc(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-teal-400 outline-none resize-none"
          />
        </div>
        <button
          onClick={handleSaveTemplate}
          disabled={saving}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-xl text-sm font-semibold hover:bg-teal-600 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>

      {/* Tasks */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">
          Danh sách Tasks ({tasks.length})
        </h2>
        <button
          onClick={() => {
            setNewTask(prev => ({
              ...prev,
              sequence_order: tasks.length > 0 ? Math.max(...tasks.map(t => t.sequence_order)) + 1 : 1,
            }));
            setShowAddTask(!showAddTask);
          }}
          className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600"
        >
          <Plus className="w-4 h-4" /> Thêm task
        </button>
      </div>

      {/* Add Task Form */}
      {showAddTask && (
        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
          <h3 className="font-semibold text-slate-700 mb-3">Thêm task mới</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Thứ tự</label>
              <input
                type="number"
                min={1}
                value={newTask.sequence_order}
                onChange={e => setNewTask({ ...newTask, sequence_order: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Loại</label>
              <select
                value={newTask.task_type}
                onChange={e => setNewTask({ ...newTask, task_type: e.target.value as RoadmapTaskType })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                {TASK_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Tiêu đề</label>
              <input
                type="text"
                value={newTask.title}
                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Tên bài học"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Phút</label>
              <input
                type="number"
                value={newTask.estimated_minutes}
                onChange={e => setNewTask({ ...newTask, estimated_minutes: parseInt(e.target.value) || 15 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2">
                <input
                  type="checkbox"
                  checked={newTask.is_standalone}
                  onChange={e => setNewTask({ ...newTask, is_standalone: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-teal-500 focus:ring-teal-400"
                />
                <span className="text-sm text-slate-600">Standalone</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAddTask}
              disabled={!newTask.title}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 disabled:opacity-50"
            >
              Thêm
            </button>
            <button onClick={() => setShowAddTask(false)} className="px-3 py-2 text-slate-500 text-sm">
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Tasks list — linear by sequence_order */}
      {sortedTasks.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden divide-y divide-slate-50">
          {sortedTasks.map(task => {
            const typeInfo = TASK_TYPES.find(t => t.value === task.task_type);
            return (
              <div key={task.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                <span className="text-xs font-mono text-slate-400 w-8 text-center shrink-0">
                  #{task.sequence_order}
                </span>
                <span className="text-sm shrink-0">{typeInfo?.label?.split(' ')[0] || '📋'}</span>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <p className="text-sm text-slate-700 truncate">{task.title}</p>
                  {task.is_standalone && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-medium shrink-0">
                      <Lock className="w-2.5 h-2.5" /> Standalone
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 shrink-0">{task.estimated_minutes}p</span>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <p className="text-slate-400">Chưa có task nào. Nhấn &quot;Thêm task&quot; để bắt đầu.</p>
        </div>
      )}
    </div>
  );
}
