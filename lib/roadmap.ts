import { supabase } from "./supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  RoadmapTemplate,
  TemplateTask,
  UserRoadmap,
  UserDailySchedule,
  UserTask,
  RoadmapProgress,
  RoadmapMilestone,
} from "./types";
import {
  findMatchingTemplates,
  generateUserSchedule,
  generateMilestones,
  checkFeasibility,
} from "./roadmap-algorithm";

function getClient(client?: SupabaseClient) {
  return client ?? supabase;
}

// ========== Template Queries ==========

export async function getRoadmapTemplates(
  client?: SupabaseClient,
): Promise<RoadmapTemplate[]> {
  const sb = getClient(client);
  const { data, error } = await sb
    .from("roadmap_templates")
    .select("*")
    .eq("is_active", true)
    .order("start_score", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getTemplateById(
  id: string,
  client?: SupabaseClient,
): Promise<RoadmapTemplate | null> {
  const sb = getClient(client);
  const { data, error } = await sb
    .from("roadmap_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as RoadmapTemplate | null;
}

export async function getTemplateTasks(
  templateId: string,
  client?: SupabaseClient,
): Promise<TemplateTask[]> {
  const sb = getClient(client);
  const { data, error } = await sb
    .from("template_tasks")
    .select("*")
    .eq("template_id", templateId)
    .order("sequence_order");
  if (error) throw error;
  return data || [];
}

export async function getAllTemplateTasks(
  templateIds: string[],
  client?: SupabaseClient,
): Promise<TemplateTask[]> {
  const sb = getClient(client);
  if (!templateIds.length) return [];
  const { data, error } = await sb
    .from("template_tasks")
    .select("*")
    .in("template_id", templateIds)
    .order("sequence_order");
  if (error) throw error;
  return data || [];
}

// ========== User Roadmap Queries ==========

export async function getActiveRoadmap(
  userId: string,
  client?: SupabaseClient,
): Promise<UserRoadmap | null> {
  const sb = getClient(client);
  const { data, error } = await sb
    .from("user_roadmaps")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data as UserRoadmap | null;
}

export async function getUserRoadmapById(
  roadmapId: string,
  client?: SupabaseClient,
): Promise<UserRoadmap | null> {
  const sb = getClient(client);
  const { data, error } = await sb
    .from("user_roadmaps")
    .select("*")
    .eq("id", roadmapId)
    .maybeSingle();
  if (error) throw error;
  return data as UserRoadmap | null;
}

// ========== Daily Schedule & Tasks ==========

export async function getUserDailySchedule(
  roadmapId: string,
  dayNumber: number,
  client?: SupabaseClient,
): Promise<UserDailySchedule | null> {
  const sb = getClient(client);
  const { data: schedule, error } = await sb
    .from("user_daily_schedules")
    .select("*")
    .eq("roadmap_id", roadmapId)
    .eq("actual_day_number", dayNumber)
    .maybeSingle();
  if (error) throw error;
  if (!schedule) return null;

  const { data: tasks, error: tasksError } = await sb
    .from("user_tasks")
    .select("*")
    .eq("daily_schedule_id", schedule.id)
    .order("order_index");
  if (tasksError) throw tasksError;

  return {
    ...schedule,
    tasks: (tasks || []) as UserTask[],
  } as UserDailySchedule;
}

export async function getUserAllSchedules(
  roadmapId: string,
  client?: SupabaseClient,
): Promise<UserDailySchedule[]> {
  const sb = getClient(client);
  const { data: schedules, error } = await sb
    .from("user_daily_schedules")
    .select("*")
    .eq("roadmap_id", roadmapId)
    .order("actual_day_number", { ascending: true });
  if (error) throw error;
  if (!schedules || schedules.length === 0) return [];

  const scheduleIds = schedules.map((schedule) => schedule.id);
  const { data: tasks, error: tasksError } = await sb
    .from("user_tasks")
    .select("*")
    .in("daily_schedule_id", scheduleIds)
    .order("daily_schedule_id", { ascending: true })
    .order("order_index", { ascending: true });
  if (tasksError) throw tasksError;

  const tasksByScheduleId = new Map<string, UserTask[]>();
  for (const task of tasks || []) {
    const list = tasksByScheduleId.get(task.daily_schedule_id) || [];
    list.push(task as UserTask);
    tasksByScheduleId.set(task.daily_schedule_id, list);
  }

  return schedules.map((schedule) => ({
    ...schedule,
    tasks: tasksByScheduleId.get(schedule.id) || [],
  })) as UserDailySchedule[];
}

export async function getTodaySchedule(
  roadmapId: string,
  client?: SupabaseClient,
): Promise<UserDailySchedule | null> {
  const sb = getClient(client);
  // Rolling schedule: lấy ngày chưa hoàn thành đầu tiên
  const { data: schedule, error } = await sb
    .from("user_daily_schedules")
    .select("*")
    .eq("roadmap_id", roadmapId)
    .eq("is_completed", false)
    .order("actual_day_number", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!schedule) return null;

  const { data: tasks, error: tasksError } = await sb
    .from("user_tasks")
    .select("*")
    .eq("daily_schedule_id", schedule.id)
    .order("order_index");
  if (tasksError) throw tasksError;

  return {
    ...schedule,
    tasks: (tasks || []) as UserTask[],
  } as UserDailySchedule;
}

// ========== Create Roadmap ==========

export async function createUserRoadmap(
  userId: string,
  currentScore: number,
  targetScore: number,
  durationDays: number,
  client?: SupabaseClient,
) {
  const sb = getClient(client);
  // 1. Lấy tất cả templates
  const allTemplates = await getRoadmapTemplates(sb);
  const matchedTemplates = findMatchingTemplates(
    allTemplates,
    currentScore,
    targetScore,
  );

  if (matchedTemplates.length === 0) {
    throw new Error("Không tìm thấy lộ trình phù hợp cho khoảng điểm này.");
  }

  // 2. Lấy tất cả tasks từ matched templates
  const templateIds = matchedTemplates.map((t) => t.id);
  const allTasks = await getAllTemplateTasks(templateIds, sb);

  // Re-number tasks: gán sequence_order liên tục qua multiple templates
  let seqOffset = 0;
  const renumberedTasks: TemplateTask[] = [];
  for (const template of matchedTemplates) {
    const templateTasks = allTasks
      .filter((t) => t.template_id === template.id)
      .sort((a, b) => a.sequence_order - b.sequence_order);
    for (const task of templateTasks) {
      renumberedTasks.push({
        ...task,
        sequence_order: task.sequence_order + seqOffset,
      });
    }
    if (templateTasks.length > 0) {
      seqOffset += templateTasks[templateTasks.length - 1].sequence_order;
    }
  }

  console.log("[ROADMAP/CREATE] Merged template tasks:", {
    templateIds,
    allTasksCount: allTasks.length,
    renumberedCount: renumberedTasks.length,
  });

  const totalStandardDays = matchedTemplates.reduce(
    (sum, t) => sum + t.default_duration_days,
    0,
  );

  // 3. Dynamic allocation algorithm
  const startDate = new Date();
  const schedules = generateUserSchedule(
    renumberedTasks,
    totalStandardDays,
    durationDays,
    startDate,
  );

  // 4. Feasibility check
  const warning = checkFeasibility(schedules, totalStandardDays);

  // 5. Generate milestones
  const milestones = generateMilestones(
    matchedTemplates,
    durationDays,
    totalStandardDays,
  );

  // 6. Insert user_roadmaps (sử dụng template đầu tiên làm reference)
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationDays - 1);

  const { data: roadmap, error: roadmapError } = await sb
    .from("user_roadmaps")
    .insert({
      user_id: userId,
      template_id: matchedTemplates[0].id,
      current_score: currentScore,
      target_score: targetScore,
      duration_days: durationDays,
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      status: "active",
      progress_percent: 0,
    })
    .select()
    .single();
  if (roadmapError) throw roadmapError;

  // 7. Insert daily schedules + tasks
  for (const dayPlan of schedules) {
    const { data: schedule, error: schedError } = await sb
      .from("user_daily_schedules")
      .insert({
        roadmap_id: roadmap.id,
        actual_day_number: dayPlan.actual_day_number,
        study_date: dayPlan.study_date,
        total_estimated_minutes: dayPlan.total_estimated_minutes,
        is_completed: false,
      })
      .select()
      .single();
    if (schedError) throw schedError;

    if (dayPlan.tasks.length > 0) {
      const taskRows = dayPlan.tasks.map((task, idx) => ({
        daily_schedule_id: schedule.id,
        template_task_id:
          task.template_id === "dynamic-padding-task" ? null : task.id,
        task_type: task.task_type,
        is_standalone: task.is_standalone || false,
        reference_id: task.reference_id,
        title: task.title,
        description: task.description,
        estimated_minutes: task.estimated_minutes || 15,
        is_completed: false,
        order_index: idx,
      }));

      const { error: tasksError } = await sb
        .from("user_tasks")
        .insert(taskRows);
      if (tasksError) throw tasksError;
    }
  }

  // 8. Lấy today schedule
  const todaySchedule = await getTodaySchedule(roadmap.id, sb);

  return {
    roadmap: roadmap as UserRoadmap,
    warning,
    milestones,
    today_schedule: todaySchedule,
  };
}

// ========== Task Completion ==========

export async function completeUserTask(
  taskId: string,
  client?: SupabaseClient,
) {
  const sb = getClient(client);
  // 1. Đánh dấu task hoàn thành
  const { data: task, error: taskError } = await sb
    .from("user_tasks")
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select()
    .single();
  if (taskError) throw taskError;

  // 2. Kiểm tra tất cả tasks trong ngày đã hoàn thành chưa
  const { data: allDayTasks, error: dayTasksError } = await sb
    .from("user_tasks")
    .select("is_completed")
    .eq("daily_schedule_id", (task as UserTask).daily_schedule_id);
  if (dayTasksError) throw dayTasksError;

  const allCompleted = (allDayTasks || []).every((t) => t.is_completed);

  if (allCompleted) {
    // Đánh dấu ngày hoàn thành
    await sb
      .from("user_daily_schedules")
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq("id", (task as UserTask).daily_schedule_id);
  }

  // 3. Cập nhật progress percent cho roadmap
  const { data: schedule } = await sb
    .from("user_daily_schedules")
    .select("roadmap_id")
    .eq("id", (task as UserTask).daily_schedule_id)
    .single();

  if (schedule) {
    const roadmapId = (schedule as { roadmap_id: string }).roadmap_id;
    await updateRoadmapProgress(roadmapId, sb);
  }

  return { task, dayCompleted: allCompleted };
}

async function updateRoadmapProgress(
  roadmapId: string,
  client?: SupabaseClient,
) {
  const sb = getClient(client);
  // Đếm tổng tasks và tasks đã hoàn thành
  const { data: allSchedules } = await sb
    .from("user_daily_schedules")
    .select("id, is_completed")
    .eq("roadmap_id", roadmapId);

  if (!allSchedules || allSchedules.length === 0) return;

  const scheduleIds = allSchedules.map((s) => (s as { id: string }).id);
  const { count: totalTasks } = await sb
    .from("user_tasks")
    .select("*", { count: "exact", head: true })
    .in("daily_schedule_id", scheduleIds);

  const { count: completedTasks } = await sb
    .from("user_tasks")
    .select("*", { count: "exact", head: true })
    .in("daily_schedule_id", scheduleIds)
    .eq("is_completed", true);

  const progressPercent =
    totalTasks && totalTasks > 0
      ? Math.round(((completedTasks || 0) / totalTasks) * 10000) / 100
      : 0;

  const completedDays = allSchedules.filter(
    (s) => (s as { is_completed: boolean }).is_completed,
  ).length;
  const totalDays = allSchedules.length;

  // Kiểm tra xem roadmap đã hoàn thành chưa
  const isCompleted = completedDays === totalDays;

  await sb
    .from("user_roadmaps")
    .update({
      progress_percent: progressPercent,
      status: isCompleted ? "completed" : "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", roadmapId);
}

// ========== Roadmap Actions ==========

export async function abandonRoadmap(
  roadmapId: string,
  action: "abandoned" | "paused",
  client?: SupabaseClient,
  userId?: string,
) {
  const sb = getClient(client);
  const updates: Record<string, unknown> = {
    status: action,
    updated_at: new Date().toISOString(),
  };

  if (action === "paused") {
    updates.paused_at = new Date().toISOString();
  }

  const query = sb.from("user_roadmaps").update(updates).eq("id", roadmapId);
  if (userId) query.eq("user_id", userId);

  const { error } = await query;
  if (error) throw error;
}

export async function resumeRoadmap(
  roadmapId: string,
  client?: SupabaseClient,
  userId?: string,
) {
  const sb = getClient(client);
  const query = sb.from("user_roadmaps").select("*").eq("id", roadmapId);
  if (userId) query.eq("user_id", userId);

  const { data: roadmap, error: fetchError } = await query.single();
  if (fetchError) throw fetchError;

  const rm = roadmap as UserRoadmap;

  // Tịnh tiến end_date nếu đã pause
  if (rm.paused_at) {
    const pausedDate = new Date(rm.paused_at);
    const now = new Date();
    const pausedDays = Math.ceil(
      (now.getTime() - pausedDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    let newEndDate: string | undefined;
    if (rm.end_date) {
      const endDate = new Date(rm.end_date);
      endDate.setDate(endDate.getDate() + pausedDays);
      newEndDate = endDate.toISOString().split("T")[0];
    }

    const { error } = await sb
      .from("user_roadmaps")
      .update({
        status: "active",
        paused_at: null,
        end_date: newEndDate || rm.end_date,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roadmapId);
    if (error) throw error;
  } else {
    const { error } = await sb
      .from("user_roadmaps")
      .update({
        status: "active",
        paused_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roadmapId);
    if (error) throw error;
  }
}

// ========== Progress ==========

export async function getRoadmapProgress(
  roadmapId: string,
  client?: SupabaseClient,
): Promise<RoadmapProgress> {
  const sb = getClient(client);
  const roadmap = await getUserRoadmapById(roadmapId, sb);
  if (!roadmap) throw new Error("Roadmap not found");

  const { data: allSchedules } = await sb
    .from("user_daily_schedules")
    .select("id, is_completed, actual_day_number")
    .eq("roadmap_id", roadmapId)
    .order("actual_day_number");

  const scheduleIds = (allSchedules || []).map((s) => (s as { id: string }).id);

  const { count: totalTasks } = await sb
    .from("user_tasks")
    .select("*", { count: "exact", head: true })
    .in("daily_schedule_id", scheduleIds);

  const { count: completedTasks } = await sb
    .from("user_tasks")
    .select("*", { count: "exact", head: true })
    .in("daily_schedule_id", scheduleIds)
    .eq("is_completed", true);

  const completedDays = (allSchedules || []).filter(
    (s) => (s as { is_completed: boolean }).is_completed,
  ).length;

  const totalDays = (allSchedules || []).length;

  // Current day = first uncompleted day (rolling schedule)
  const firstUncompleted = (allSchedules || []).find(
    (s) => !(s as { is_completed: boolean }).is_completed,
  );
  const currentDay = firstUncompleted
    ? (firstUncompleted as { actual_day_number: number }).actual_day_number
    : totalDays;

  // Streak: đếm số ngày hoàn thành liên tiếp gần nhất
  let streak = 0;
  const sortedSchedules = [...(allSchedules || [])].reverse();
  for (const s of sortedSchedules) {
    if ((s as { is_completed: boolean }).is_completed) {
      streak++;
    } else {
      break;
    }
  }

  // Milestones
  const allTemplates = await getRoadmapTemplates(sb);
  const matchedTemplates = findMatchingTemplates(
    allTemplates,
    roadmap.current_score,
    roadmap.target_score,
  );
  const milestonesBase = generateMilestones(
    matchedTemplates,
    totalDays,
    matchedTemplates.reduce((sum, t) => sum + t.default_duration_days, 0),
  );

  const milestones: RoadmapMilestone[] = milestonesBase.map((m) => ({
    ...m,
    is_reached: completedDays >= m.day,
  }));

  return {
    roadmap_id: roadmapId,
    total_days: totalDays,
    completed_days: completedDays,
    total_tasks: totalTasks || 0,
    completed_tasks: completedTasks || 0,
    current_day: currentDay,
    progress_percent: roadmap.progress_percent,
    streak_days: streak,
    milestones,
  };
}

// ========== Admin Template Management ==========

export async function createTemplate(data: {
  title: string;
  start_score: number;
  target_score: number;
  default_duration_days: number;
  description?: string;
}): Promise<RoadmapTemplate> {
  const { data: template, error } = await supabase
    .from("roadmap_templates")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return template as RoadmapTemplate;
}

export async function updateTemplate(
  id: string,
  data: Partial<RoadmapTemplate>,
): Promise<void> {
  const { error } = await supabase
    .from("roadmap_templates")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from("roadmap_templates")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function createTemplateTask(data: {
  template_id: string;
  sequence_order: number;
  task_type: string;
  is_standalone?: boolean;
  title: string;
  description?: string;
  reference_id?: string;
  estimated_minutes?: number;
}): Promise<TemplateTask> {
  const { data: task, error } = await supabase
    .from("template_tasks")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return task as TemplateTask;
}

export async function updateTemplateTask(
  id: string,
  data: Partial<TemplateTask>,
): Promise<void> {
  const { error } = await supabase
    .from("template_tasks")
    .update(data)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTemplateTask(id: string): Promise<void> {
  const { error } = await supabase.from("template_tasks").delete().eq("id", id);
  if (error) throw error;
}

// ========== Admin: Get all templates (including inactive) ==========

export async function getAllTemplates(): Promise<RoadmapTemplate[]> {
  const { data, error } = await supabase
    .from("roadmap_templates")
    .select("*")
    .order("start_score", { ascending: true });
  if (error) throw error;
  return data || [];
}
