// ========== Test Models ==========
export interface TestModel {
  id: string;
  title: string;
  duration: number;
  type: string;
  total_questions: number;
  is_premium: boolean;
  created_at: string;
}

export interface TestPartModel {
  id: string;
  test_id: string;
  part_number: number;
  instructions: string;
  question_count: number;
}

export interface QuestionModel {
  id: string;
  part_id: string;
  passage_id: string | null;
  question_text: string | null;
  order_index: number;
  options: OptionModel[];
  media: QuestionMediaModel[];
  passage?: PassageModel;
}

export interface OptionModel {
  id: string;
  question_id: string;
  content: string;
  is_correct: boolean;
}

export interface QuestionMediaModel {
  id: string;
  question_id: string;
  type: "audio" | "image" | "text";
  url: string;
}

export interface PassageModel {
  id: string;
  part_id: string;
  title: string;
  content: string;
}

// ========== User Models ==========
export interface UserProfile {
  id: string;
  full_name: string;
  phone: string;
  role: string;
  avatar_url: string;
  created_at: string;
}

export interface AttemptModel {
  id: string;
  user_id: string;
  test_id: string;
  started_at: string;
  submitted_at: string;
  score: number;
}

export interface AnswerModel {
  id: string;
  attempt_id: string;
  question_id: string;
  option_id: string;
  is_correct: boolean;
}

export interface AttemptHistoryItem {
  id: string;
  testId: string;
  testTitle: string;
  score: number;
  submittedAt: string;
  answeredCount: number;
  correctCount: number;
}

export interface AttemptDetail {
  id: string;
  testId: string;
  testTitle: string;
  score: number;
  submittedAt: string;
  questions: QuestionModel[];
  selectedOptionIdByQuestionId: Record<string, string>;
  correctCount: number;
}

// ========== Vocabulary & Grammar ==========
export interface VocabularyModel {
  id: string;
  lesson: number;
  word: string;
  phonetic: string;
  definition: string;
  word_class: string;
  score_level: number;
  audio_url: string;
  sort_order: number;
}

export interface GrammarModel {
  id: string;
  lesson: number;
  title: string;
  content: string;
  formula: string;
  examples: string[];
  related_topics: string[];
  sort_order: number;
}

// ========== Writing ==========
export interface WritingPromptModel {
  id: string;
  part_number: number;
  title: string;
  prompt: string;
  image_url: string;
  passage_text: string;
  passage_subject: string;
  model_answer: string;
  hint_words: string[] | string;
  order_index: number;
}

// ========== Speaking ==========
export interface SpeakingPromptModel {
  id: string;
  part_number: number;
  task_type: string;
  title: string;
  passage?: string | null;
  prompt: string;
  image_url?: string | null;
  prep_seconds: number;
  model_answer?: string | null;
  hint_words?: string[] | string;
  order_index: number;
}

// ========== Practice History ==========
export interface PracticeHistoryItem {
  id: string;
  user_id: string;
  mode: "speaking" | "writing";
  part_number: number;
  prompt_id: string;
  prompt_title: string;
  prompt_content: string;
  user_answer: string;
  ai_score: number | null;
  ai_feedback: string | null;
  ai_errors: string[] | null;
  ai_task_scores: Record<string, number> | null;
  ai_important_words: string[] | null;
  ai_suggested_answer: string | null;
  created_at: string;
}

export interface PracticeListeningReadingHistoryItem {
  id: string;
  user_id: string;
  test_id: string | null;
  section: 'listening' | 'reading';
  part_number: number;
  question_ids: string[];
  question_count: number;
  answered_count: number;
  correct_count: number;
  score: number;
  created_at: string;
}

// ========== Practice ==========
export interface PracticePartData {
  partId: string;
  testId: string;
  partNumber: number;
  partTitle: string;
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  iconName: string;
  colorHex: string;
  bgColorHex: string;
  questionType: string;
}

export interface SkillConfig {
  title: string;
  headerIcon: string;
  parts: PracticePart[];
}

export interface PracticePart {
  title: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  progress: number;
}

// ========== AI Speaking/Writing ==========
export interface AiGradeResult {
  overall: number;
  taskScores: Record<string, number>;
  errors: string[];
  feedback: string;
  importantWords: string[];
  suggestedAnswer: string;
  part1ReadAloud?: {
    overallScore: number;
    pronunciation: number;
    fluency: number;
    accuracy: number;
    spokenFeedback: string;
    detailedFeedback: string;
    mistakes: Array<{
      word: string;
      issue: 'mispronunciation' | 'missing' | 'extra';
      explanation: string;
    }>;
    suggestions: string[];
  };
  partSpeaking?: {
    taskType: string;
    overallScore: number;
    criteriaScores: Record<string, number>;
    spokenFeedback: string;
    detailedFeedback: string;
    mistakes: Array<{
      type: 'content' | 'grammar' | 'vocabulary' | 'fluency' | 'pronunciation' | 'logic';
      text: string;
      issue?: string;
      suggestion?: string;
    }>;
    improvedVocabulary?: string[];
    suggestions: string[];
  };
}

// ========== Subscription / Transactions ==========
export interface SubscriptionTransactionItem {
  id: string;
  userId: string;
  userName: string;
  userPhone: string | null;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  orderCode: number;
  status: string;
  provider: string;
  isLifetime: boolean;
  paidAt: string | null;
  createdAt: string;
  grantedUntil: string | null;
  premiumExpiresAt: string | null;
}

export interface UserPremiumSubscriptionInfo {
  startedAt: string | null;
  expiresAt: string | null;
  isLifetime: boolean;
  planName: string | null;
}

export interface NotificationItem {
  id: string;
  recipientUserId: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

// ========== Roadmap Template (Admin) ==========
export interface RoadmapTemplate {
  id: string;
  title: string;
  start_score: number;
  target_score: number;
  default_duration_days: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateTask {
  id: string;
  template_id: string;
  sequence_order: number;
  task_type: RoadmapTaskType;
  is_standalone: boolean;
  task_weight?: number | null;
  reference_id: string | null;
  title: string;
  description: string | null;
  estimated_minutes: number;
}

export type RoadmapTaskType =
  | "vocabulary"
  | "grammar"
  | "listening"
  | "reading"
  | "speaking"
  | "writing"
  | "practice"
  | "mini_test"
  | "review"
  | "full_test";

// ========== User Roadmap ==========
export interface UserRoadmap {
  id: string;
  user_id: string;
  template_id: string;
  current_score: number;
  target_score: number;
  duration_days: number;
  start_date: string;
  end_date: string | null;
  status: RoadmapStatus;
  progress_percent: number;
  paused_at: string | null;
  created_at: string;
  updated_at: string;
}

export type RoadmapStatus = "active" | "completed" | "abandoned" | "paused";

export interface UserDailySchedule {
  id: string;
  roadmap_id: string;
  actual_day_number: number;
  study_date: string | null;
  total_estimated_minutes: number;
  is_completed: boolean;
  completed_at: string | null;
  tasks?: UserTask[];
}

export interface UserTask {
  id: string;
  daily_schedule_id: string;
  template_task_id: string | null;
  task_type: RoadmapTaskType;
  is_standalone: boolean;
  reference_id: string | null;
  title: string;
  description: string | null;
  estimated_minutes: number;
  is_completed: boolean;
  completed_at: string | null;
  order_index: number;
}

// ========== Assessment ==========
export type AssessmentMethod =
  | "exam_history"
  | "practice_estimate"
  | "self_assessed"
  | "placement_test";

export interface AssessmentResult {
  method: AssessmentMethod;
  current_score: number;
  confidence: "high" | "medium" | "low";
  details: {
    source: string;
    exam_count?: number;
    avg_score?: number;
    latest_score?: number;
    correct_rate?: number;
    date_range?: string;
  };
}

// ========== Roadmap Creation ==========
export interface CreateRoadmapRequest {
  target_score: number;
  duration_days: number;
  current_score: number;
  assessment_method: AssessmentMethod;
}

export interface CreateRoadmapResponse {
  success: boolean;
  roadmap: UserRoadmap;
  warning: RoadmapWarning | null;
  today_schedule: UserDailySchedule;
}

export interface RoadmapWarning {
  type: "unrealistic_schedule" | "score_already_achieved";
  message: string;
  suggestion: string;
  recommended_days?: number;
}

export interface RoadmapMilestone {
  day: number;
  label: string;
  target_score: number;
  is_reached: boolean;
}

// ========== Progress ==========
export interface RoadmapProgress {
  roadmap_id: string;
  total_days: number;
  completed_days: number;
  total_tasks: number;
  completed_tasks: number;
  current_day: number;
  progress_percent: number;
  streak_days: number;
  milestones: RoadmapMilestone[];
}
