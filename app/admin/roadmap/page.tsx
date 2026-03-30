'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Edit2,
  Trash2,
  Map,
  ChevronRight,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Calendar,
} from 'lucide-react';
import type { RoadmapTemplate } from '@/lib/types';
import { supabase } from '@/lib/supabase';

export default function AdminRoadmapPage() {
  const [templates, setTemplates] = useState<RoadmapTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    start_score: 0,
    target_score: 350,
    default_duration_days: 60,
    description: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const { data, error } = await supabase
        .from('roadmap_templates')
        .select('*')
        .order('start_score', { ascending: true });
      if (error) throw error;
      setTemplates(data || []);

      // Load task counts
      const ids = (data || []).map(t => t.id);
      if (ids.length) {
        const counts: Record<string, number> = {};
        for (const id of ids) {
          const { count } = await supabase
            .from('template_tasks')
            .select('*', { count: 'exact', head: true })
            .eq('template_id', id);
          counts[id] = count || 0;
        }
        setTaskCounts(counts);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('roadmap_templates')
        .insert(formData);
      if (error) throw error;
      setShowForm(false);
      setFormData({ title: '', start_score: 0, target_score: 350, default_duration_days: 60, description: '' });
      await loadTemplates();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi tạo template');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    try {
      await supabase
        .from('roadmap_templates')
        .update({ is_active: !currentActive, updated_at: new Date().toISOString() })
        .eq('id', id);
      await loadTemplates();
    } catch {
      // silently handle
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bạn có chắc muốn xóa template này?')) return;
    try {
      await supabase.from('roadmap_templates').delete().eq('id', id);
      await loadTemplates();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi xóa template');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
            <Map className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Quản lý Lộ trình</h1>
            <p className="text-sm text-slate-500">{templates.length} template</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-semibold hover:bg-teal-600 transition-colors"
        >
          <Plus className="w-4 h-4" /> Tạo template
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="font-bold text-slate-800 mb-4">Tạo template mới</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Tên template</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Giai đoạn 1: Mất gốc → Cơ bản"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Điểm bắt đầu</label>
                <input
                  type="number"
                  value={formData.start_score}
                  onChange={e => setFormData({ ...formData, start_score: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Điểm mục tiêu</label>
                <input
                  type="number"
                  value={formData.target_score}
                  onChange={e => setFormData({ ...formData, target_score: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Số ngày chuẩn</label>
              <input
                type="number"
                value={formData.default_duration_days}
                onChange={e => setFormData({ ...formData, default_duration_days: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Mô tả</label>
              <input
                type="text"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả ngắn..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCreate}
              disabled={saving || !formData.title}
              className="px-6 py-2 bg-teal-500 text-white rounded-xl text-sm font-semibold hover:bg-teal-600 disabled:opacity-50"
            >
              {saving ? 'Đang tạo...' : 'Tạo template'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="space-y-3">
        {templates.map(template => (
          <div
            key={template.id}
            className={`bg-white rounded-2xl border p-5 transition-all ${
              template.is_active ? 'border-slate-100' : 'border-red-100 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-800">{template.title}</h3>
                  {!template.is_active && (
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">Ẩn</span>
                  )}
                </div>
                <p className="text-sm text-slate-500">{template.description}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    📊 {template.start_score} → {template.target_score} điểm
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {template.default_duration_days} ngày
                  </span>
                  <span>📋 {taskCounts[template.id] || 0} tasks</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleToggleActive(template.id, template.is_active)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                  title={template.is_active ? 'Tắt' : 'Bật'}
                >
                  {template.is_active ? <ToggleRight className="w-5 h-5 text-teal-500" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <Link
                  href={`/admin/roadmap/templates/${template.id}`}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600"
                  title="Sửa"
                >
                  <Edit2 className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"
                  title="Xóa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <Link
                  href={`/admin/roadmap/templates/${template.id}`}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <Map className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Chưa có template nào</p>
            <p className="text-sm text-slate-400 mt-1">Nhấn "Tạo template" để bắt đầu</p>
          </div>
        )}
      </div>
    </div>
  );
}
