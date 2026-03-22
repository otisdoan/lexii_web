# Hệ thống Luyện Nói và Luyện Viết TOEIC (Speaking & Writing Practice)

## Mục tiêu
Phát triển chức năng **Luyện Nói** và **Luyện Viết** trong ứng dụng TOEIC.  
Hệ thống hỗ trợ **hai chế độ chấm bài**:

1. **Chấm bài thường (mặc định)**  
   - Chỉ lưu bài làm của người dùng.
   - Không sử dụng AI.
   - Người dùng tự xem lại bài làm.

2. **Chấm bài bằng AI**  
   - AI chấm điểm.
   - AI phân tích lỗi.
   - AI sửa bài.
   - AI đề xuất từ vựng và ngữ pháp.

Người dùng có thể **tự chọn chế độ chấm bài trước khi bắt đầu luyện tập**.  
Mặc định hệ thống sẽ sử dụng **chế độ chấm bài thường**.

---

# 1. Luyện Nói (Speaking Practice)

## Các dạng luyện tập

Trong mục **Luyện Nói** có các phần sau:

- Đọc đoạn văn
- Mô tả hình ảnh
- Trả lời câu hỏi
- Trả lời dựa trên thông tin
- Trình bày quan điểm

---

## 1.1 Đọc đoạn văn

### Chức năng
- Hiển thị đoạn văn cho người dùng đọc.
- Người dùng đọc đoạn văn bằng microphone.

### Flow

1. Hiển thị đoạn văn.
2. Countdown thời gian chuẩn bị.
3. Bắt đầu ghi âm.
4. Kết thúc ghi âm.
5. Lưu audio của người dùng.

### Dữ liệu lưu

speaking_answers

- id
- user_id
- question_id
- audio_url
- transcript
- duration
- created_at

---

## 1.2 Mô tả hình ảnh

### Chức năng
- Hiển thị một hình ảnh.
- Người dùng mô tả hình ảnh bằng giọng nói.

### Flow

1. Hiển thị hình ảnh.
2. Countdown chuẩn bị.
3. Bắt đầu ghi âm.
4. Lưu audio.

---

## 1.3 Trả lời câu hỏi

### Chức năng
- Hiển thị câu hỏi.
- Người dùng trả lời bằng giọng nói.

### Flow

1. Hiển thị câu hỏi.
2. Cho thời gian chuẩn bị ngắn.
3. Bắt đầu ghi âm.
4. Lưu audio.

---

## 1.4 Trả lời dựa trên thông tin

### Chức năng
- Hiển thị bảng thông tin (lịch, sự kiện, bảng dữ liệu).
- Hiển thị câu hỏi liên quan.

### Flow

1. Hiển thị bảng thông tin.
2. Hiển thị câu hỏi.
3. Bắt đầu ghi âm câu trả lời.
4. Lưu audio.

---

## 1.5 Trình bày quan điểm

### Chức năng
- Hiển thị câu hỏi yêu cầu người dùng trình bày quan điểm.
- Người dùng trả lời bằng giọng nói.

### Flow

1. Hiển thị câu hỏi.
2. Countdown chuẩn bị.
3. Bắt đầu ghi âm.
4. Lưu audio.

---

# 2. Luyện Viết (Writing Practice)

## Các dạng luyện tập

Trong mục **Luyện Viết** có các phần sau:

- Viết câu dựa trên hình ảnh
- Trả lời email
- Viết bài luận nêu quan điểm

---

## 2.1 Viết câu dựa trên hình ảnh

### Chức năng

- Hiển thị hình ảnh.
- Hiển thị các từ khóa bắt buộc.
- Người dùng viết một câu mô tả hình ảnh sử dụng các từ khóa.

### Dữ liệu lưu

writing_answers

- id
- user_id
- question_id
- answer_text
- created_at

---

## 2.2 Trả lời email

### Chức năng

- Hiển thị email.
- Người dùng viết email phản hồi.

### UI

- Hiển thị email gốc.
- Textarea để nhập câu trả lời.

---

## 2.3 Viết bài luận nêu quan điểm

### Chức năng

- Hiển thị câu hỏi.
- Người dùng viết đoạn văn trả lời.

### UI

- Hiển thị câu hỏi.
- Textarea nhập nội dung.
- Bộ đếm số từ.

---

# 3. Chế độ chấm bài

Trước khi bắt đầu luyện tập, người dùng có thể chọn:

- **Chấm bài thường**
- **Chấm bài bằng AI**

Mặc định: **Chấm bài thường**

---

# 4. Chấm bài thường

Hệ thống chỉ:

- Lưu audio hoặc bài viết của người dùng.
- Cho phép người dùng xem lại bài đã làm.
- Không thực hiện phân tích hoặc chấm điểm.

---

# 5. Chấm bài bằng AI

Sau khi người dùng hoàn thành bài nói hoặc bài viết, hệ thống sẽ gửi dữ liệu đến AI để phân tích.

AI sẽ trả về:

- Điểm số
- Phân tích lỗi
- Phiên bản sửa
- Gợi ý cải thiện
- Phân tích từ vựng
- Phân tích ngữ pháp

---

# 6. AI Evaluation cho Luyện Nói

## Quy trình

1. Audio được upload.
2. Hệ thống chuyển audio thành transcript.
3. Transcript được gửi tới AI.
4. AI trả về kết quả đánh giá.

---

## Kết quả AI trả về

ai_speaking_evaluations

- pronunciation_score
- fluency_score
- grammar_score
- vocabulary_score
- overall_score

---

## Phân tích lỗi

AI sẽ liệt kê:

- Lỗi phát âm
- Lỗi ngữ pháp
- Câu nói chưa tự nhiên
- Nội dung thiếu

---

## Phiên bản sửa

AI cung cấp:

- Câu nói được sửa
- Gợi ý cách diễn đạt tốt hơn

---

## Phân tích từ vựng

AI liệt kê:

- Từ vựng người dùng đã sử dụng tốt
- Từ vựng nâng cao gợi ý sử dụng

---

## Phân tích ngữ pháp

AI phân tích:

- Cấu trúc ngữ pháp đã dùng
- Lỗi ngữ pháp
- Cấu trúc nên sử dụng

---

# 7. AI Evaluation cho Luyện Viết

## Quy trình

1. Người dùng nộp bài viết.
2. Nội dung được gửi tới AI.
3. AI phân tích và trả về kết quả.

---

## Kết quả AI trả về

ai_writing_evaluations

- task_response_score
- grammar_score
- vocabulary_score
- coherence_score
- overall_score

---

## Phân tích chi tiết

### Phản hồi ngữ pháp

- Liệt kê lỗi ngữ pháp
- Câu sửa tương ứng

### Phản hồi từ vựng

- Từ vựng đơn giản
- Gợi ý từ vựng nâng cao

### Phản hồi cấu trúc

- Đánh giá bố cục
- Đánh giá logic nội dung

---

## Bài viết được sửa

AI cung cấp:

- Phiên bản bài viết đã sửa
- Gợi ý cách viết tốt hơn

---

# 8. Phân tích từ vựng

AI tự động trích xuất:

- Từ vựng quan trọng
- Cụm từ học thuật
- Collocations

---

# 9. Phân tích ngữ pháp

AI phát hiện:

- Cấu trúc ngữ pháp đã dùng
- Lỗi ngữ pháp
- Cấu trúc nâng cao gợi ý

---

# 10. Lịch sử luyện tập

Người dùng có thể xem lại:

- Audio đã nói
- Bài viết đã nộp
- Điểm AI
- Feedback
- Bài sửa

---

# 11. Database Schema

## speaking_questions

- id
- type
- content
- image_url
- extra_data

---

## writing_questions

- id
- type
- image_url
- keywords
- content

---

## speaking_answers

- id
- user_id
- question_id
- audio_url
- transcript
- created_at

---

## writing_answers

- id
- user_id
- question_id
- answer_text
- created_at

---

## ai_speaking_evaluations

- id
- answer_id
- pronunciation_score
- fluency_score
- grammar_score
- vocabulary_score
- overall_score
- feedback
- corrected_version

---

## ai_writing_evaluations

- id
- answer_id
- task_response_score
- grammar_score
- vocabulary_score
- coherence_score
- overall_score
- feedback
- corrected_version