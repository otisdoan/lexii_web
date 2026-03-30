# Lexii TOEIC® — Luyện thi TOEIC hiệu quả

<p align="center">
  <img src="public/lexii.jpg" alt="Lexii TOEIC Logo" width="120" />
</p>

> Website luyện thi TOEIC thông minh — luyện nghe, đọc, viết, nói kết hợp chấm bài AI, tra từ điển, học ngữ pháp & từ vựng.

---

## 📋 Mục lục

- [Tổng quan](#-tổng-quan)
- [Tech Stack](#-tech-stack)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Tính năng chính](#-tính-năng-chính)
- [Bắt đầu](#-bắt-đầu)
- [Biến môi trường](#-biến-môi-trường)
- [Scripts](#-scripts)
- [Triển khai](#-triển-khai)
- [Đóng góp](#-đóng-góp)
- [Giấy phép](#-giấy-phép)

---

## 🌟 Tổng quan

**Lexii TOEIC®** là nền tảng web luyện thi TOEIC toàn diện, hỗ trợ đầy đủ 4 kỹ năng: **Nghe** (Listening), **Đọc** (Reading), **Nói** (Speaking), **Viết** (Writing). Hệ thống tích hợp **AI chấm bài** tự động cho kỹ năng Nói & Viết, kèm theo phân tích lỗi ngữ pháp, từ vựng và gợi ý cải thiện.

Ngoài ra, ứng dụng còn cung cấp:
- Bài thi thử mô phỏng (Full Test / Mini Test)
- Luyện tập theo Part riêng lẻ
- Hệ thống từ vựng & ngữ pháp theo bài học
- Tra từ điển tích hợp
- Trang Admin quản lý nội dung & người dùng
- Gói Premium với thanh toán trực tuyến

---

## 🛠 Tech Stack

| Lớp              | Công nghệ                                                   |
|-------------------|--------------------------------------------------------------|
| **Framework**     | [Next.js 16](https://nextjs.org/) (App Router)              |
| **UI**            | [React 19](https://react.dev/), [TailwindCSS 4](https://tailwindcss.com/) |
| **Ngôn ngữ**     | [TypeScript 5](https://www.typescriptlang.org/)             |
| **Backend / DB**  | [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage) |
| **State**         | [Zustand 5](https://zustand-demo.pmnd.rs/)                  |
| **Icons**         | [Lucide React](https://lucide.dev/)                         |
| **Font**          | [Lexend](https://fonts.google.com/specimen/Lexend) (Google Fonts) |
| **Deploy**        | [Vercel](https://vercel.com/)                                |

---

## 📁 Cấu trúc dự án

```
lexii_web/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (Lexend font, metadata)
│   ├── page.tsx                  # Root page — redirect onboarding/home
│   ├── globals.css               # Global styles + TailwindCSS
│   ├── onboarding/               # Onboarding flow cho người dùng mới
│   ├── auth/                     # Xác thực
│   │   ├── login/                #   Đăng nhập
│   │   ├── signup/               #   Đăng ký
│   │   ├── confirm/              #   Xác nhận email
│   │   └── callback/             #   OAuth callback
│   ├── home/                     # Trang chính (sau khi đăng nhập)
│   │   ├── page.tsx              #   Dashboard
│   │   ├── layout.tsx            #   Layout sidebar + bottom nav
│   │   ├── exam/                 #   Thi thử TOEIC
│   │   │   ├── test-start/       #     Bắt đầu bài thi
│   │   │   ├── question/         #     Giao diện làm bài
│   │   │   ├── result/           #     Kết quả bài thi
│   │   │   ├── score/            #     Bảng điểm
│   │   │   └── answer-review/    #     Xem lại đáp án
│   │   ├── practice/             #   Luyện tập theo kỹ năng
│   │   │   ├── [skill]/          #     Listening / Reading theo Part
│   │   │   ├── reading-question/ #     Câu hỏi Reading
│   │   │   ├── speaking-question/#     Câu hỏi Speaking
│   │   │   ├── writing-question/ #     Câu hỏi Writing
│   │   │   ├── speaking-result/  #     Kết quả Speaking
│   │   │   ├── writing-result/   #     Kết quả Writing
│   │   │   └── result/           #     Kết quả Listening/Reading
│   │   ├── vocabulary/           #   Từ vựng theo bài học
│   │   ├── grammar/              #   Ngữ pháp theo bài học
│   │   ├── theory/               #   Lý thuyết TOEIC
│   │   ├── notifications/        #   Thông báo
│   │   ├── settings/             #   Cài đặt tài khoản
│   │   ├── support/              #   Hỗ trợ
│   │   └── upgrade/              #   Nâng cấp Premium
│   ├── admin/                    # Trang quản trị
│   │   ├── page.tsx              #   Dashboard admin
│   │   ├── layout.tsx            #   Layout sidebar admin
│   │   ├── users/                #   Quản lý người dùng
│   │   ├── tests/                #   Quản lý đề thi
│   │   ├── vocabulary/           #   Quản lý từ vựng
│   │   ├── grammar/              #   Quản lý ngữ pháp
│   │   ├── transactions/         #   Quản lý giao dịch
│   │   ├── notifications/        #   Quản lý thông báo
│   │   ├── chat/                 #   Chat hỗ trợ
│   │   └── settings/             #   Cài đặt hệ thống
│   ├── api/                      # API Routes
│   │   ├── ai/grade/             #   AI chấm bài Speaking/Writing
│   │   ├── dictionary/           #   Tra từ điển
│   │   └── transcribe/           #   Chuyển giọng nói → văn bản
│   └── components/               # Shared components cho App
│       ├── AudioPlayer.tsx       #   Trình phát audio
│       └── LoginRequiredModal.tsx #  Modal yêu cầu đăng nhập
├── components/                   # Global shared components
│   ├── WordDetailCard.tsx        #   Card chi tiết từ vựng
│   ├── chat/                     #   Chat components
│   └── notifications/            #   Notification components
├── lib/                          # Core logic & utilities
│   ├── api.ts                    #   API layer (Supabase queries)
│   ├── types.ts                  #   TypeScript type definitions
│   ├── store.ts                  #   Zustand global store
│   ├── constants.ts              #   App constants & color tokens
│   ├── supabase.ts               #   Supabase browser client
│   ├── supabase-server.ts        #   Supabase server client (middleware)
│   └── use-notification-center.ts #  Notification center hook
├── supabase/                     # Supabase config & migrations
│   └── migrations/               #   Database migration files
├── middleware.ts                  # Next.js middleware (session refresh)
├── vercel.json                   # Vercel redirect config
├── next.config.ts                # Next.js config
├── tsconfig.json                 # TypeScript config
└── package.json                  # Dependencies & scripts
```

---

## ✨ Tính năng chính

### 📝 Thi thử TOEIC
- **Full Test** & **Mini Test** mô phỏng thực tế
- Làm bài theo thời gian, nộp bài và tính điểm tự động
- Xem lại đáp án với giải thích chi tiết
- Lưu lịch sử làm bài & thống kê tiến độ

### 🎧 Luyện Listening (Part 1–4)
- Luyện tập theo từng Part riêng lẻ
- Phát audio tích hợp
- Theo dõi câu đúng/sai, ôn lại câu sai

### 📖 Luyện Reading (Part 5–7)
- Luyện đọc hiểu theo Part
- Hỗ trợ Passage với nhiều câu hỏi liên quan
- Hệ thống "Câu sai" để ôn tập lại

### 🗣 Luyện Speaking
- 5 dạng bài: Đọc đoạn văn, Mô tả hình ảnh, Trả lời câu hỏi, Trả lời dựa trên thông tin, Trình bày quan điểm
- Ghi âm trực tiếp trên trình duyệt
- Chuyển giọng nói → văn bản (Speech-to-Text API)
- **AI chấm bài**: Phát âm, Lưu loát, Ngữ pháp, Từ vựng, Điểm tổng

### ✍️ Luyện Writing
- 3 dạng bài: Viết câu dựa trên hình ảnh, Trả lời email, Viết bài luận nêu quan điểm
- **AI chấm bài**: Hoàn thành yêu cầu, Ngữ pháp, Từ vựng, Mạch lạc, Điểm tổng
- AI cung cấp bài sửa mẫu, gợi ý từ vựng nâng cao

### 📚 Từ vựng & Ngữ pháp
- Học từ vựng theo bài, phân loại theo mức điểm
- Bài ngữ pháp với công thức & ví dụ
- Tra từ điển tích hợp với phát âm

### 🔔 Thông báo
- Trung tâm thông báo real-time
- Thông báo khi hoàn thành bài thi, nhắc học...

### 👑 Premium & Thanh toán
- Gói 6 tháng / 1 năm / Trọn đời
- Tích hợp cổng thanh toán (QR Code, Payment Link)

### 🛡 Trang Admin
- Quản lý người dùng, đề thi, từ vựng, ngữ pháp
- Quản lý giao dịch & subscription
- Gửi thông báo đến người dùng
- Chat hỗ trợ trực tiếp

---

## 🚀 Bắt đầu

### Yêu cầu hệ thống

- **Node.js** >= 18
- **npm** >= 9 (hoặc yarn / pnpm)

### Cài đặt

```bash
# Clone dự án
git clone <repository-url>
cd lexii_web

# Cài đặt dependencies
npm install
```

### Chạy Development Server

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) — trang sẽ tự động redirect đến `/onboarding` (lần đầu) hoặc `/home` (đã hoàn thành onboarding).

---

## 🔐 Biến môi trường

Tạo file `.env.local` tại thư mục gốc:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# AI Service (cho chấm bài Speaking/Writing)
# Cấu hình tùy theo provider AI đang sử dụng
```

> **Lưu ý**: Dự án có sẵn fallback Supabase credentials cho môi trường development. Trong production, hãy sử dụng biến môi trường riêng.

---

## 📜 Scripts

| Lệnh             | Mô tả                          |
|-------------------|---------------------------------|
| `npm run dev`     | Chạy development server         |
| `npm run build`   | Build production                 |
| `npm run start`   | Chạy production server           |
| `npm run lint`    | Kiểm tra lỗi ESLint             |

---

## 🚢 Triển khai

Dự án được cấu hình sẵn để triển khai trên **Vercel**:

1. Push code lên GitHub
2. Kết nối repository với [Vercel](https://vercel.com/)
3. Cấu hình biến môi trường trong Vercel Dashboard
4. Deploy tự động khi push lên branch chính

File `vercel.json` đã cấu hình redirect `/` → `/onboarding`.

---

## 🤝 Đóng góp

1. Fork dự án
2. Tạo branch tính năng (`git checkout -b feature/ten-tinh-nang`)
3. Commit thay đổi (`git commit -m 'Thêm tính năng mới'`)
4. Push lên branch (`git push origin feature/ten-tinh-nang`)
5. Tạo Pull Request

---

## 📄 Giấy phép

Dự án này là sản phẩm nội bộ. Mọi quyền được bảo lưu.

---

<p align="center">
  <sub>TOEIC® là thương hiệu đã đăng ký của ETS. Sản phẩm này không được ETS chứng nhận hay phê duyệt.</sub>
</p>
