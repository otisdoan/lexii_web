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
  type: 'audio' | 'image' | 'text';
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
  hint_words: string[];
  order_index: number;
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

// ========== Roadmap (Learning Path) ==========
export type TargetScore = 500 | 700 | 900;
export type SelfAssessedLevel = 'zero' | 'basic' | 'intermediate' | 'unknown';
export type DurationDays = 30 | 60 | 90 | 180;

export interface RoadmapTemplateModel {
  id: string;
  target_score: number;
  duration_days: number;
  title: string;
}

export interface RoadmapTaskModel {
  id: string;
  template_id: string;
  day_number: number;
  task_type: 'theory' | 'practice' | 'test';
  reference_id: string | null;
  title: string;
}

export interface UserRoadmapModel {
  id: string;
  user_id: string;
  template_id: string;
  initial_score: number;
  target_score: number;
  current_day: number;
  status: 'active' | 'completed' | 'dropped';
  start_date: string;
}

export interface UserTaskProgressModel {
  id: string;
  user_roadmap_id: string;
  task_id: string;
  status: 'unlocked' | 'in_progress' | 'completed';
  score_achieved: number | null;
  completed_at: string | null;
}

// ========== AI Speaking/Writing ==========
export interface AiGradeResult {
  overall: number;
  taskScores: Record<string, number>;
  errors: string[];
  feedback: string;
  importantWords: string[];
  suggestedAnswer: string;
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
