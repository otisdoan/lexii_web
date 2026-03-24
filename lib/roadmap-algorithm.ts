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
 * 2-Step Dynamic Allocation: phân bổ TẤT CẢ tasks vào ngày học.
 * KHÔNG BAO GIỜ bỏ rơi task nào — vòng lặp chạy đến khi hết queue.
 * Pace được tính từ (normalTasks / normalDayBudget).
 */
export function generateUserSchedule(
  allTemplateTasks: TemplateTask[],
  _totalStandardDays: number,
  userDays: number,
  startDate: Date,
): ScheduleDayPlan[] {
  // Sort tasks by sequence_order
  const sorted = [...allTemplateTasks].sort(
    (a, b) => a.sequence_order - b.sequence_order,
  );

  if (sorted.length === 0) return [];

  // === Bước 1: Tính quỹ ngày cho normal tasks ===
  const standaloneCount = sorted.filter((t) => t.is_standalone).length;
  const normalCount = sorted.length - standaloneCount;
  const normalDayBudget = Math.max(1, userDays - standaloneCount);

  // Pace = số normal tasks trung bình mỗi ngày (có thể > 10 nếu lộ trình ngắn)
  const pace = normalCount > 0 ? normalCount / normalDayBudget : 1;
  const tasksPerDay = Math.max(1, Math.ceil(pace));

  // === Bước 2: Duyệt toàn bộ queue, KHÔNG dừng giữa chừng ===
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

  // Iterate through every task in the queue — no truncation
  let taskIndex = 0;
  while (taskIndex < sorted.length) {
    const task = sorted[taskIndex];

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
      if (normalTasksInCurrentDay >= tasksPerDay) {
        flushCurrentDay();
      }
    }

    taskIndex++;
  }

  // Flush any remaining tasks in the buffer
  flushCurrentDay();

  return schedules;
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
    const avgHours = Math.round(avgMinutesPerDay / 60 * 10) / 10;
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
