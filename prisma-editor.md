// --------------------------------------------------------------------------------------------------
// WARNING: THAM CHIẾU ĐẾN SCHEMAS NGOÀI (EXTERNAL SCHEMAS)
// Mã SQL gốc tham chiếu đến schema 'auth' (auth.users).
// Prisma Editor hoạt động tốt nhất với một schema duy nhất.
// Model 'AuthUser' dưới đây được tạo ra để giả lập bảng 'auth.users' trong schema 'public'
// giúp các quan hệ (relations) hoạt động trong môi trường editor.
// --------------------------------------------------------------------------------------------------

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL") // URL này không quan trọng trong editor này
}

// --------------------------------------------------------------------------------------------------
// Giả lập bảng auth.users của Supabase
// --------------------------------------------------------------------------------------------------
model AuthUser {
  id                  String                @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  // Thêm email để thực tế hơn, dù SQL gốc không yêu cầu
  email               String                @unique 
  attempts            Attempt[]
  listening_history   ListeningAnswerHistory[]
  notifications       Notification[]
  profiles            Profile?
  subscription_orders SubscriptionOrder[]
  user_progress       UserProgress[]
  user_roadmaps       UserRoadmap[]
  writing_submissions WritingSubmission[]
  wrong_questions     WrongQuestions[]

  @@map("users") // Ánh xạ tới bảng public.users trong DB thực tế
}

// --------------------------------------------------------------------------------------------------
// Enums (Chuyển đổi từ SQL CHECK Constraints)
// --------------------------------------------------------------------------------------------------

enum ChatSenderRole {
  user
  admin
  system
}

enum PracticeMode {
  speaking
  writing
}

enum RoadmapStatus {
  active
  completed
  dropped
}

enum TaskStatus {
  unlocked
  in_progress
  completed
}

// --------------------------------------------------------------------------------------------------
// Bảng Public (Models)
// --------------------------------------------------------------------------------------------------

model Answer {
  id          String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  attempt_id  String         @db.Uuid
  question_id String         @db.Uuid
  option_id   String?        @db.Uuid
  is_correct  Boolean?
  
  attempt     Attempt        @relation(fields: [attempt_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  question    Question       @relation(fields: [question_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  option      QuestionOption? @relation(fields: [option_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@map("answers")
}

model Attempt {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id      String    @db.Uuid
  test_id      String    @db.Uuid
  started_at   DateTime? @default(now()) @db.Timestamptz
  submitted_at DateTime? @db.Timestamptz
  score        Int?
  
  answers      Answer[]
  user         AuthUser  @relation(fields: [user_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  test         Test      @relation(fields: [test_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@map("attempts")
}

model ChatConversation {
  id                   String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id              String        @unique @db.Uuid
  admin_id             String?       @db.Uuid
  created_at           DateTime?     @default(now()) @db.Timestamptz
  last_message_at      DateTime?     @default(now()) @db.Timestamptz
  last_message_preview String?
  last_message_sender  String?
  unread_user_count    Int?          @default(0)
  unread_admin_count   Int?          @default(0)
  is_resolved          Boolean?      @default(false)
  
  messages             ChatMessage[]
  user_profile         Profile       @relation("user_conversation", fields: [user_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  admin_profile        Profile?      @relation("admin_conversation", fields: [admin_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@map("chat_conversations")
}

model ChatMessage {
  id              String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  conversation_id String           @db.Uuid
  sender_id       String           @db.Uuid
  sender_role     ChatSenderRole // Sử dụng Enum
  content         String
  is_read         Boolean?         @default(false)
  created_at      DateTime?        @default(now()) @db.Timestamptz
  
  conversation    ChatConversation @relation(fields: [conversation_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  sender          Profile          @relation(fields: [sender_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@map("chat_messages")
}

model Grammar {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  lesson         Int      @default(1)
  title          String
  content        String   @default("")
  formula        String?
  examples       Json     @default("[]") // Chuyển đổi từ default '[]'::jsonb
  related_topics Json     @default("[]")
  sort_order     Int      @default(0)
  created_at     DateTime @default(now()) @db.Timestamptz

  @@map("grammar")
}

model ListeningAnswerHistory {
  id                 String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id            String          @db.Uuid
  question_id        String          @db.Uuid
  selected_option_id String?         @db.Uuid
  is_correct         Boolean         @default(false)
  answered_at        DateTime        @default(now()) @db.Timestamptz
  
  user               AuthUser        @relation(fields: [user_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  question           Question        @relation(fields: [question_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  selected_option    QuestionOption? @relation(fields: [selected_option_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@map("listening_answer_history")
}

model Notification {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  recipient_user_id String   @db.Uuid
  type              String
  title             String
  body              String
  metadata          Json     @default("{}")
  is_read           Boolean  @default(false)
  // Phức tạp trong SQL gốc được đơn giản hóa thành utc_now() tương đương
  created_at        DateTime @default(now()) @db.Timestamptz 
  
  recipient         AuthUser @relation(fields: [recipient_user_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@map("notifications")
}

model Passage {
  id        String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  part_id   String     @db.Uuid
  title     String?
  content   String
  
  part      TestPart   @relation(fields: [part_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  questions Question[]

  @@map("passages")
}

model PracticeHistory {
  id                 String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id            String       @db.Uuid
  mode               PracticeMode // Sử dụng Enum
  part_number        Int
  prompt_id          String
  prompt_title       String
  prompt_content     String
  user_answer        String       @default("")
  ai_score           Int?
  ai_feedback        String?
  ai_errors          String[]     @db.Text // Ánh xạ Postgres Array
  ai_task_scores     Json?
  ai_important_words String[]     @db.Text
  ai_suggested_answer String?
  created_at         DateTime?    @default(now()) @db.Timestamptz
  
  user               Profile      @relation(fields: [user_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@map("practice_history")
}

model Profile {
  id                    String             @id @db.Uuid // Không có default, lấy từ auth.users
  full_name             String?
  phone                 String?
  role                  String?            @default("user")
  avatar_url            String?
  created_at            DateTime?          @default(now()) @db.Timestamptz
  premium_expires_at    DateTime?          @db.Timestamptz
  
  user_conversation     ChatConversation?  @relation("user_conversation")
  admin_conversation    ChatConversation[] @relation("admin_conversation")
  sent_messages         ChatMessage[]
  practice_histories    PracticeHistory[]
  user                  AuthUser           @relation(fields: [id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  review_likes          ReviewLike[]
  reviews               Review[]

  @@map("profiles")
}

model QuestionMedia {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  question_id String   @db.Uuid
  // CONSTRAINT check: type IN ('audio', 'image', 'text')
  // Prisma không hỗ trợ check constraint phức tạp trên scalar.
  // Thường được xử lý ở app level hoặc dùng Enum nếu cần chặt chẽ.
  type        String
  url         String
  
  question    Question @relation(fields: [question_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@map("question_media")
}

model QuestionOption {
  id                 String                   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  question_id        String                   @db.Uuid
  content            String
  is_correct         Boolean                  @default(false)
  
  answers            Answer[]
  listening_history  ListeningAnswerHistory[]
  question           Question                 @relation(fields: [question_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  wrong_questions    WrongQuestions[]

  @@map("question_options")
}

model Question {
  id                String                   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  part_id           String                   @db.Uuid
  passage_id        String?                  @db.Uuid
  question_text     String?
  order_index       Int                      @default(0)
  
  answers           Answer[]
  listening_history ListeningAnswerHistory[]
  media             QuestionMedia[]
  options           QuestionOption[]
  part              TestPart                 @relation(fields: [part_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  passage           Passage?                 @relation(fields: [passage_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  user_progress     UserProgress[]
  wrong_questions   WrongQuestions[]

  @@map("questions")
}

model ReviewLike {
  id         String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  review_id  String    @db.Uuid
  user_id    String    @db.Uuid
  created_at DateTime? @default(now()) @db.Timestamptz
  
  review     Review    @relation(fields: [review_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  user       Profile   @relation(fields: [user_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@map("review_likes")
}

model Review {
  id           String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id      String       @db.Uuid
  // CONSTRAINT check (rating >= 1 AND rating <= 5). Xử lý ở app level.
  rating       Int
  content      String
  images       String[]     @default([]) @db.Text // text[] DEFAULT '{}'
  likes_count  Int?         @default(0)
  created_at   DateTime?    @default(now()) @db.Timestamptz
  updated_at   DateTime?    @default(now()) @db.Timestamptz
  
  review_likes ReviewLike[]
  user         Profile      @relation(fields: [user_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@map("reviews")
}

model RoadmapTask {
  id                  String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  template_id         String             @db.Uuid
  day_number          Int
  task_type           String
  reference_id        String?            @db.Uuid
  title               String
  created_at          DateTime?          @default(now()) @db.Timestamptz
  group_title         String?
  skill_type          String?
  
  template            RoadmapTemplate    @relation(fields: [template_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  user_task_progress UserTaskProgress[]

  @@map("roadmap_tasks")
}

model RoadmapTemplate {
  id             String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  target_score   Int
  duration_days  Int
  title          String
  created_at     DateTime?       @default(now()) @db.Timestamptz
  description    String?
  
  tasks          RoadmapTask[]
  user_roadmaps  UserRoadmap[]

  @@map("roadmap_templates")
}

model SpeakingPrompt {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  // part_number integer NOT NULL CHECK (part_number >= 1 AND part_number <= 5)
  part_number   Int
  task_type     String
  title         String
  passage       String?
  prompt        String
  image_url     String?
  prep_seconds  Int?      @default(10)
  model_answer  String?
  hint_words    String[]  @db.Text
  order_index   Int?      @default(0)
  created_at    DateTime? @default(now()) @db.Timestamptz

  @@map("speaking_prompts")
}

model SubscriptionOrder {
  id                     String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id                String    @db.Uuid
  plan_id                String
  plan_name              String
  // amount Int NOT NULL CHECK (amount > 0)
  amount                 Int
  currency               String    @default("VND")
  provider               String    @default("payos")
  order_code             BigInt    @unique
  payment_link_id        String?
  checkout_url           String?
  status                 String    @default("pending")
  provider_raw           Json?
  paid_at                DateTime? @db.Timestamptz
  created_at             DateTime  @default(now()) @db.Timestamptz
  updated_at             DateTime  @default(now()) @db.Timestamptz
  plan_duration_months   Int?
  is_lifetime            Boolean   @default(false)
  granted_until          DateTime? @db.Timestamptz
  
  user                   AuthUser  @relation(fields: [user_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@map("subscription_orders")
}

model TestPart {
  id           String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  test_id      String     @db.Uuid
  part_number  Int
  instructions String?
  
  passages     Passage[]
  questions    Question[]
  test         Test       @relation(fields: [test_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@map("test_parts")
}

model Test {
  id              String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  title           String
  duration        Int        @default(120)
  type            String     @default("full_test")
  created_at      DateTime?  @default(now()) @db.Timestamptz
  total_questions Int        @default(200)
  is_premium      Boolean    @default(false)
  
  attempts        Attempt[]
  parts           TestPart[]

  @@map("tests")
}

model UserProgress {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id     String    @db.Uuid
  question_id String    @db.Uuid
  accuracy    Decimal?  @default(0) @db.Decimal // numeric maps to Decimal
  last_seen   DateTime? @default(now()) @db.Timestamptz
  
  user        AuthUser  @relation(fields: [user_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  question    Question  @relation(fields: [question_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@map("user_progress")
}

model UserRoadmap {
  id             String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id        String           @db.Uuid
  template_id    String           @db.Uuid
  initial_score  Int
  target_score   Int
  current_day    Int              @default(1)
  status         RoadmapStatus    @default(active) // Sử dụng Enum
  start_date     DateTime?        @default(now()) @db.Timestamptz
  created_at     DateTime?        @default(now()) @db.Timestamptz
  
  template       RoadmapTemplate  @relation(fields: [template_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  user           AuthUser         @relation(fields: [user_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  task_progress UserTaskProgress[]

  @@map("user_roadmaps")
}

model UserTaskProgress {
  id              String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_roadmap_id String      @db.Uuid
  task_id         String      @db.Uuid
  status          TaskStatus  @default(unlocked) // Sử dụng Enum
  score_achieved  Int?
  completed_at    DateTime?   @db.Timestamptz
  created_at      DateTime?   @default(now()) @db.Timestamptz
  
  task            RoadmapTask @relation(fields: [task_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  roadmap         UserRoadmap @relation(fields: [user_roadmap_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@map("user_task_progress")
}

model Vocabulary {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  lesson      Int      @default(1)
  word        String
  phonetic    String?
  definition  String
  word_class  String?
  score_level String   @default("450+")
  audio_url   String?
  sort_order  Int      @default(0)
  created_at  DateTime @default(now()) @db.Timestamptz

  @@map("vocabulary")
}

model WritingPrompt {
  id                 String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  // part_number integer NOT NULL CHECK (part_number = ANY (ARRAY[1, 2, 3]))
  part_number        Int
  title              String?
  prompt             String
  image_url          String?
  passage_text       String?
  passage_subject    String?
  model_answer       String?
  hint_words         String?
  order_index        Int                 @default(0)
  created_at         DateTime?           @default(now()) @db.Timestamptz
  
  submissions WritingSubmission[]

  @@map("writing_prompts")
}

model WritingSubmission {
  id           String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id      String        @db.Uuid
  prompt_id    String        @db.Uuid
  part_number  Int
  content      String
  submitted_at DateTime?     @default(now()) @db.Timestamptz
  
  prompt       WritingPrompt @relation(fields: [prompt_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  user         AuthUser      @relation(fields: [user_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@map("writing_submissions")
}

model WrongQuestions {
  id                      String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id                 String          @db.Uuid
  question_id             String          @db.Uuid
  last_selected_option_id String?         @db.Uuid
  wrong_count             Int             @default(1)
  last_answered_at        DateTime        @default(now()) @db.Timestamptz
  created_at              DateTime        @default(now()) @db.Timestamptz
  updated_at              DateTime        @default(now()) @db.Timestamptz
  
  user                    AuthUser        @relation(fields: [user_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  question                Question        @relation(fields: [question_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  last_selected_option    QuestionOption? @relation(fields: [last_selected_option_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@map("wrong_questions")
}