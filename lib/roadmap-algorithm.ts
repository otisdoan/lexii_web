import { supabase } from "./supabase";
import type {
  TemplateTask,
  AssessmentResult,
  RoadmapWarning,
  RoadmapMilestone,
  RoadmapTemplate,
} from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

function getClient(client?: SupabaseClient) {
  return client ?? supabase;
}

// ========== Score Mapping ==========

/** Quy đổi tỷ lệ đúng → điểm TOEIC ước lượng */
export function mapCorrectRateToScore(correctRate: number): number {
  if (correctRate > 0.95) return 950;
  if (correctRate > 0.85) return 900;
  if (correctRate > 0.7) return 750;
  if (correctRate > 0.55) return 600;
  if (correctRate > 0.4) return 450;
  if (correctRate > 0.25) return 300;
  return 200;
}

// ========== Assessment ==========

/** Đánh giá trình độ hiện tại của user từ dữ liệu có sẵn */
export async function assessUserLevel(
  userId: string,
  client?: SupabaseClient,
): Promise<AssessmentResult> {
  const sb = getClient(client);
  // Trường hợp 1: Có lịch sử thi thử
  const { data: attempts } = await sb
    .from("attempts")
    .select("score, submitted_at")
    .eq("user_id", userId)
    .not("score", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(10);

  if (attempts && attempts.length > 0) {
    // Lấy bài thi trong 14 ngày gần nhất
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const recentAttempts = attempts.filter(
      (a) => new Date(a.submitted_at) >= twoWeeksAgo,
    );

    const relevantAttempts =
      recentAttempts.length > 0 ? recentAttempts : [attempts[0]];

    const avgScore = Math.round(
      relevantAttempts.reduce((sum, a) => sum + (a.score as number), 0) /
        relevantAttempts.length,
    );

    const latestScore = attempts[0].score as number;

    return {
      method: "exam_history",
      current_score: avgScore,
      confidence: relevantAttempts.length >= 3 ? "high" : "medium",
      details: {
        source: "attempts",
        exam_count: relevantAttempts.length,
        avg_score: avgScore,
        latest_score: latestScore,
        date_range:
          relevantAttempts.length > 1
            ? `${new Date(relevantAttempts[relevantAttempts.length - 1].submitted_at).toLocaleDateString("vi-VN")} → ${new Date(relevantAttempts[0].submitted_at).toLocaleDateString("vi-VN")}`
            : undefined,
      },
    };
  }

  // Trường hợp 2: Có lịch sử luyện tập
  const { data: historyRows } = await sb
    .from("listening_answer_history")
    .select("is_correct")
    .eq("user_id", userId);

  if (historyRows && historyRows.length >= 5) {
    const totalAnswered = historyRows.length;
    const totalCorrect = historyRows.filter(
      (r) => r.is_correct === true,
    ).length;
    const correctRate = totalCorrect / totalAnswered;
    const estimatedScore = mapCorrectRateToScore(correctRate);

    return {
      method: "practice_estimate",
      current_score: estimatedScore,
      confidence: totalAnswered >= 20 ? "medium" : "low",
      details: {
        source: "listening_answer_history",
        correct_rate: Math.round(correctRate * 100),
      },
    };
  }

  // Trường hợp 3: Blank state
  return {
    method: "self_assessed",
    current_score: 0,
    confidence: "low",
    details: {
      source: "none",
    },
  };
}

// ========== Template Matching ==========

/**
 * Tìm tất cả templates mà user cần học qua (Range Overlap).
 * Lấy template nếu khoảng [start_score, target_score) của nó GIAO với
 * khoảng [currentScore, targetScore) của user.
 * VD: User 3→750 sẽ lấy Stage 1 (0→350), Stage 2 (350→550), Stage 3 (550→750).
 */
export function findMatchingTemplates(
  templates: RoadmapTemplate[],
  currentScore: number,
  targetScore: number,
): RoadmapTemplate[] {
  return templates
    .filter((t) => {
      // Range overlap: template phải giao với khoảng [currentScore, targetScore)
      // Tức là: template.target > currentScore  VÀ  template.start < targetScore
      return t.target_score > currentScore && t.start_score < targetScore;
    })
    .sort((a, b) => a.start_score - b.start_score);
}

// ========== Compression Algorithm ==========

export interface ScheduleDayPlan {
  actual_day_number: number;
  study_date: string;
  total_estimated_minutes: number;
  tasks: TemplateTask[];
}

/**
 * Accumulation Logic (Water in a Bottle): phân bổ tasks theo trọng số tích lũy.
 * TotalWeight / durationDays -> DailyBudget.
 * Cho phép ngày trống, ưu tiên phân bổ từ ngày 1.
 */
export function generateSmartSchedule(
  templateTasks: TemplateTask[],
  durationDays: number,
  startDate: Date,
): ScheduleDayPlan[] {
  if (durationDays <= 0) return [];

  const sorted = [...templateTasks].sort(
    (a, b) => a.sequence_order - b.sequence_order,
  );

  const schedules: ScheduleDayPlan[] = Array.from(
    { length: durationDays },
    (_, index) => {
      const studyDate = new Date(startDate);
      studyDate.setDate(studyDate.getDate() + index);
      return {
        actual_day_number: index + 1,
        study_date: studyDate.toISOString().split("T")[0],
        total_estimated_minutes: 0,
        tasks: [],
      };
    },
  );

  if (sorted.length === 0) return schedules;

  const totalWeight = sorted.reduce(
    (sum, task) => sum + (task.task_weight ?? 1),
    0,
  );
  const dailyBudget = totalWeight / durationDays;

  let dayIndex = 0;
  let wallet =
    sorted.length > 0
      ? Math.max(dailyBudget, sorted[0].task_weight ?? 1)
      : dailyBudget;

  for (const task of sorted) {
    const weight = task.task_weight ?? 1;

    while (wallet < weight && dayIndex < durationDays - 1) {
      dayIndex += 1;
      wallet += dailyBudget;
    }

    schedules[dayIndex].tasks.push(task);
    wallet = Math.max(0, wallet - weight);
  }

  // ========================================================
  // POST-PROCESSING: LẤP ĐẦY NGÀY TRỐNG (SPACED REPETITION)
  // ========================================================
  let lastLearnedTitles: string[] = [];

  for (const day of schedules) {
    // CHỈ lấy các Task gốc (Bỏ qua các task đệm đã tạo từ trước nếu có)
    const originalTasks = day.tasks.filter(
      (t) => t.template_id !== "dynamic-padding-task",
    );

    if (originalTasks.length > 0) {
      // Cập nhật bộ nhớ bằng tên bài học mới
      lastLearnedTitles = originalTasks.map((t) => t.title);
    } else {
      // Nếu ngày trống, tạo Task đệm
      const reviewTitle =
        lastLearnedTitles.length > 0
          ? `Ôn tập: ${lastLearnedTitles.join(", ")}`
          : "Ôn tập tự do (Từ vựng/Ngữ pháp)";

      const paddingTask: TemplateTask = {
        id: crypto.randomUUID(),
        template_id: "dynamic-padding-task", // Cờ đánh dấu đây là task đệm
        sequence_order: 9999,
        task_type: "review",
        is_standalone: false,
        reference_id: null,
        title: reviewTitle,
        description:
          "Ôn tập lại kiến thức gần nhất để khắc sâu vào trí nhớ (Spaced Repetition).",
        estimated_minutes: 10,
        task_weight: 0,
      };

      day.tasks.push(paddingTask);
    }
  }

  for (const day of schedules) {
    day.total_estimated_minutes = day.tasks.reduce(
      (sum, t) => sum + (t.estimated_minutes || 15),
      0,
    );
  }

  return schedules;
}

// Backward-compatible wrapper
export function generateUserSchedule(
  allTemplateTasks: TemplateTask[],
  _totalStandardDays: number,
  userDays: number,
  startDate: Date,
): ScheduleDayPlan[] {
  return generateSmartSchedule(allTemplateTasks, userDays, startDate);
}

// ========== Feasibility Check ==========

const MAX_DAILY_MINUTES = 180; // 3 giờ/ngày
const MAX_TASKS_PER_DAY = 15; // Ngưỡng cảnh báo overload
const HEAVY_DAILY_MINUTES = 240; // 4 giờ/ngày = "cực kỳ nặng"

/** Kiểm tra xem lộ trình có khả thi không */
export function checkFeasibility(
  schedules: ScheduleDayPlan[],
  _totalStandardDays: number,
): RoadmapWarning | null {
  if (schedules.length === 0) return null;

  const totalTasks = schedules.reduce((sum, s) => sum + s.tasks.length, 0);
  const totalMinutes = schedules.reduce(
    (sum, s) => sum + s.total_estimated_minutes,
    0,
  );
  const maxDay = schedules.reduce((max, s) =>
    s.total_estimated_minutes > max.total_estimated_minutes ? s : max,
  );
  const maxTaskCount = Math.max(...schedules.map((s) => s.tasks.length));
  const avgMinutesPerDay = totalMinutes / schedules.length;

  // Tính recommended_days để trung bình ~MAX_DAILY_MINUTES mỗi ngày
  const recommendedDays = Math.ceil(totalMinutes / MAX_DAILY_MINUTES);

  // Cực kỳ nặng: > 4h/ngày hoặc > 15 tasks/ngày
  if (
    maxDay.total_estimated_minutes >= HEAVY_DAILY_MINUTES ||
    maxTaskCount > MAX_TASKS_PER_DAY
  ) {
    const maxHours = Math.round(maxDay.total_estimated_minutes / 60);
    return {
      type: "unrealistic_schedule",
      message: `Lộ trình cực kỳ nặng: tối đa ${maxTaskCount} bài/ngày (~${maxHours} tiếng). Tổng ${totalTasks} bài.`,
      suggestion: `Hãy kéo dài thời gian để đạt hiệu quả tốt nhất!`,
      recommended_days: Math.max(recommendedDays, schedules.length + 14),
    };
  }

  // Nặng vừa: > 3h/ngày
  if (maxDay.total_estimated_minutes > MAX_DAILY_MINUTES) {
    const avgHours = Math.round((avgMinutesPerDay / 60) * 10) / 10;
    return {
      type: "unrealistic_schedule",
      message: `Lộ trình này yêu cầu trung bình ~${avgHours} tiếng/ngày. Tổng ${totalTasks} bài.`,
      suggestion: `Hãy chọn thời gian dài hơn để học hiệu quả hơn!`,
      recommended_days: Math.max(recommendedDays, schedules.length + 7),
    };
  }

  return null;
}

// ========== Milestones ==========

/** Tạo danh sách milestones dựa trên templates */
export function generateMilestones(
  matchedTemplates: RoadmapTemplate[],
  userDays: number,
  totalStandardDays: number,
): RoadmapMilestone[] {
  const ratio = userDays / totalStandardDays;
  let cumulativeDays = 0;

  return matchedTemplates.map((template) => {
    cumulativeDays += template.default_duration_days;
    const milestoneDay = Math.round(cumulativeDays * ratio);

    return {
      day: Math.min(milestoneDay, userDays),
      label: template.title,
      target_score: template.target_score,
      is_reached: false,
    };
  });
}

// ========== Rolling Schedule ==========

/** Tính ngày thực tế hiện tại dựa trên completed days (Rolling Schedule) */
export function getCurrentDayNumber(
  completedDays: number,
  totalDays: number,
): number {
  return Math.min(completedDays + 1, totalDays);
}
