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

/** Tìm tất cả templates user cần học qua */
export function findMatchingTemplates(
  templates: RoadmapTemplate[],
  currentScore: number,
  targetScore: number,
): RoadmapTemplate[] {
  return templates
    .filter((t) => t.target_score > currentScore && t.start_score < targetScore)
    .sort((a, b) => a.start_score - b.start_score);
}

// ========== Compression Algorithm ==========

export interface ScheduleDayPlan {
  actual_day_number: number;
  study_date: string;
  total_estimated_minutes: number;
  tasks: TemplateTask[];
}

/** 2-Step Dynamic Allocation: phân bổ tasks vào ngày học dựa trên sequence_order + is_standalone */
export function generateUserSchedule(
  allTemplateTasks: TemplateTask[],
  _totalStandardDays: number,
  userDays: number,
  startDate: Date,
): ScheduleDayPlan[] {
  // Sort tasks by sequence_order (should already be sorted, but ensure)
  const sorted = [...allTemplateTasks].sort(
    (a, b) => a.sequence_order - b.sequence_order,
  );

  // === Bước 1: Tính quỹ ngày cho normal tasks ===
  const standaloneCount = sorted.filter((t) => t.is_standalone).length;
  const normalCount = sorted.length - standaloneCount;
  const normalDayBudget = Math.max(1, userDays - standaloneCount);

  // Pace = số normal tasks trung bình mỗi ngày
  const pace = normalCount > 0 ? normalCount / normalDayBudget : 1;

  // === Bước 2: Duyệt và phân bổ ===
  const schedules: ScheduleDayPlan[] = [];
  let currentDayNumber = 1;
  let currentDayTasks: TemplateTask[] = [];
  let normalTasksInCurrentDay = 0;

  function flushCurrentDay() {
    if (currentDayTasks.length === 0) return;
    const studyDate = new Date(startDate);
    studyDate.setDate(studyDate.getDate() + currentDayNumber - 1);
    const totalMinutes = currentDayTasks.reduce(
      (sum, t) => sum + (t.estimated_minutes || 15),
      0,
    );
    schedules.push({
      actual_day_number: currentDayNumber,
      study_date: studyDate.toISOString().split("T")[0],
      total_estimated_minutes: totalMinutes,
      tasks: currentDayTasks,
    });
    currentDayNumber++;
    currentDayTasks = [];
    normalTasksInCurrentDay = 0;
  }

  for (const task of sorted) {
    if (task.is_standalone) {
      // Đóng ngày hiện tại nếu đang có tasks
      flushCurrentDay();
      // Tạo ngày riêng cho standalone task
      currentDayTasks = [task];
      flushCurrentDay();
    } else {
      currentDayTasks.push(task);
      normalTasksInCurrentDay++;
      // Nếu đã đủ pace cho ngày này → đóng ngày
      if (normalTasksInCurrentDay >= Math.ceil(pace)) {
        flushCurrentDay();
      }
    }
  }

  // Flush remaining tasks
  flushCurrentDay();

  return schedules;
}

// ========== Feasibility Check ==========

const MAX_DAILY_MINUTES = 180; // 3 giờ/ngày

/** Kiểm tra xem lộ trình có khả thi không */
export function checkFeasibility(
  schedules: ScheduleDayPlan[],
  totalStandardDays: number,
): RoadmapWarning | null {
  if (schedules.length === 0) return null;

  const maxDay = schedules.reduce((max, s) =>
    s.total_estimated_minutes > max.total_estimated_minutes ? s : max,
  );

  if (maxDay.total_estimated_minutes > MAX_DAILY_MINUTES) {
    const avgMinutesPerStdDay =
      schedules.reduce((sum, s) => sum + s.total_estimated_minutes, 0) /
      schedules.length;

    const recommendedDays = Math.ceil(
      (totalStandardDays * avgMinutesPerStdDay) / MAX_DAILY_MINUTES,
    );

    return {
      type: "unrealistic_schedule",
      message: `Lộ trình này yêu cầu học tối đa ${Math.round(maxDay.total_estimated_minutes / 60)} tiếng/ngày.`,
      suggestion: `Hãy chọn thời gian dài hơn để đạt hiệu quả tốt nhất!`,
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
