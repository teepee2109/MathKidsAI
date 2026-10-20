# MathKids API

## Chạy backend

1. Mở `MathKidsDB.sql` bằng SQL Server Management Studio và chạy toàn bộ script để tạo database `MathKids` cùng schema `mk`.
2. Kiểm tra file `.env` với instance SQL Server của máy.
3. Chạy:

```powershell
npm install
npm run dev
```

API mặc định chạy tại `http://localhost:4000`.

Mở một terminal riêng để chạy frontend:

```powershell
cd ..\frontend
npm run dev
```

Trong môi trường dev, Vite tự proxy `/api` sang backend ở port `4000`, vì vậy cần chạy cả hai process.

## Google Sign-In

Tạo OAuth Client ID loại **Web application** trong Google Cloud Console và thêm `http://localhost:5174` vào `Authorized JavaScript origins` (Vite của dự án chạy cổng 5174). Nếu demo qua domain khác, thêm chính xác origin của frontend đang mở. Cấu hình cùng Client ID ở hai file:

```env
# backend/.env
GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com

# frontend/.env
VITE_GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
```

Backend xác thực ID token với Google, kiểm tra audience, issuer và email đã xác minh. Người dùng Google mới được tạo tài khoản Student cùng hồ sơ lớp 1; email đã tồn tại sẽ đăng nhập vào tài khoản hiện có.

## Đăng ký và xác minh email OTP

Đăng ký bằng email/mật khẩu gửi mã 6 chữ số đến email trước khi tạo tài khoản. Mã hết hạn sau 10 phút, tối đa 5 lần nhập sai và giới hạn 5 lần gửi mỗi giờ (cách nhau ít nhất 60 giây). Bảng OTP được tạo tự động.

Cấu hình SMTP trong `backend/.env` (không commit thông tin thật). Với Gmail, bật xác minh 2 bước và dùng **App Password**, không dùng mật khẩu đăng nhập Gmail:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-sender@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM="MathKids <your-sender@gmail.com>"
OTP_HASH_SECRET=your-long-random-secret
```

Nếu SMTP chưa cấu hình hoặc gửi email thất bại, đăng ký sẽ báo lỗi và không tạo tài khoản. Đăng ký bằng Google vẫn dùng email đã được Google xác minh.

## API xác thực

- `GET /api/health` — kiểm tra kết nối SQL Server.
- `POST /api/auth/register/request-otp` — body `{ name, email, password, confirmPassword, role }`, gửi mã OTP.
- `POST /api/auth/register` — cùng thông tin đăng ký, bổ sung `otp` để xác minh và tạo tài khoản.
- `POST /api/auth/password-reset/request-otp` — body `{ email }`, gửi mã OTP đổi mật khẩu nếu email có tài khoản.
- `POST /api/auth/password-reset/confirm` — body `{ email, otp, newPassword, confirmPassword }`, xác minh OTP và đổi mật khẩu.
- `POST /api/auth/login` — body `{ email, password }`.
- `POST /api/auth/google` — body `{ credential }` từ Google Identity Services.
- `GET /api/auth/me` — cần header `Authorization: Bearer <token>`.
- `GET /api/students/me/dashboard` — hồ sơ, lớp, XP, sao, số bài học và bài đánh giá; cần JWT.
- `GET /api/students/me/profile` — tải hồ sơ học sinh; cần JWT.
- `PATCH /api/students/me/profile` — cập nhật tên, email, ngày sinh, lớp, URL ảnh đại diện; cần JWT.
- `GET /api/students/me/monthly-assessment` — trạng thái bài tháng hiện tại và lịch sử 12 bài gần nhất; cần JWT.
- `POST /api/students/me/monthly-assessment/start` — bắt đầu hoặc tiếp tục bài tháng; cần JWT.
- `POST /api/students/me/monthly-assessment/:attemptId/submit` — nộp đủ 10 câu để chấm và nhận thưởng; cần JWT.
- `GET /api/students/me/weekly-assessment` — tải trạng thái đánh giá tuần, lịch sử và mức luyện tập đề xuất; cần JWT.
- `POST /api/students/me/weekly-assessment/start` — bắt đầu hoặc tiếp tục đánh giá tuần; cần JWT.
- `POST /api/students/me/weekly-assessment/:attemptId/submit` — nộp 10 câu đánh giá để điều chỉnh độ khó; cần JWT.
- `GET /api/admin/dashboard` — số liệu và danh sách tài khoản gần đây; chỉ Admin mới được phép truy cập.

## Kiểm tra tháng cho học sinh

Migration `migrations/MonthlyAssessment.sql` được áp dụng tự động khi backend khởi động (và kiểm tra lại khi gọi API). Mỗi học sinh có tối đa một bài được tính cho mỗi tháng theo giờ Việt Nam. Bài đang làm được lưu trên server để có thể tiếp tục trên thiết bị khác; câu trả lời hiện tại được giữ tạm trên thiết bị cho tới khi nộp. Question Bank cần có ít nhất 10 câu đang hoạt động cho lớp của học sinh.

Trong Postman, đăng nhập trước qua `/api/auth/login`, rồi dùng token trả về làm header `Authorization: Bearer <token>`:

1. `GET http://localhost:4000/api/students/me/monthly-assessment` — xem tháng, lớp, trạng thái hiện tại và lịch sử. API không trả đáp án đúng.
2. `POST http://localhost:4000/api/students/me/monthly-assessment/start` với body JSON `{}` — tạo bài 10 câu ngẫu nhiên hoặc lấy lại bài đang làm. API chỉ trả nội dung và 4 lựa chọn.
3. `POST http://localhost:4000/api/students/me/monthly-assessment/<attemptId>/submit` với body JSON dưới đây; dùng đúng 10 `questionId` nhận từ bước 2 và chọn `A`, `B`, `C` hoặc `D`:

```json
{
  "answers": [
    { "questionId": 101, "answer": "A" },
    { "questionId": 102, "answer": "C" }
  ]
}
```

Body minh họa trên cần bổ sung đủ 10 câu trước khi gửi. Backend đối chiếu đáp án với SQL Server, chỉ trả lời giải/đáp án đúng sau khi nộp, lưu điểm và cộng XP/sao trong cùng transaction. XP = 10 + 2 cho mỗi câu đúng; sao: 3 sao từ 90 điểm, 2 sao từ 70, 1 sao từ 50, dưới 50 không có sao. Bài tháng này đã nộp thì không thể nộp lại.

## Đánh giá năng lực hàng tuần

Migration `migrations/WeeklyAssessment.sql` được chạy tự động khi backend khởi động. Học sinh có một bài 10 câu mỗi tuần (tuần bắt đầu thứ Hai theo giờ Việt Nam); câu hỏi được cố định khi bắt đầu và đáp án đúng chỉ trả về sau khi nộp. Mức luyện tập kế tiếp tăng một bậc khi đạt từ 80/100, giảm một bậc khi dưới 50/100, còn lại giữ nguyên (mức 1–3). Lộ trình bài học lấy mức này để chọn câu luyện tập từ Question Bank. Điểm đánh giá tuần dùng để cá nhân hóa độ khó, không cộng XP/sao.

## Dữ liệu mục tiêu học tập

`curriculum-objectives.v1.json` là danh mục mục tiêu theo lớp/chủ đề; `question-objective-mapping.v1.json` liên kết câu hỏi trong Question Bank với mục tiêu và ghi căn cứ cho từng liên kết. `curriculum-question-bank.v1.js` bổ sung câu hỏi có lời giải cho các mục tiêu trước đó chưa có câu, đồng thời khai báo những chủ đề/bài học còn thiếu; liên kết tới mục tiêu được tạo từ chính dữ liệu câu hỏi để tránh lệch câu chữ. Kiểm tra bằng `npm run curriculum:validate` trong thư mục `backend`; công cụ xác minh mục tiêu, chủ đề, câu hỏi, đáp án và lời giải, rồi in độ phủ cùng các mục tiêu còn thiếu. Khi backend khởi tạo lộ trình, `migrations/LearningObjectives.sql` tạo cấu trúc dữ liệu bổ sung; `curriculumCatalog.js` đồng bộ chủ đề/bài học/câu hỏi bổ sung, mục tiêu, quan hệ tiên quyết, liên kết mục tiêu-bài học và liên kết câu hỏi-mục tiêu. Các trường `Introduction`, `KeyConcept`, `WorkedExample` cũ được giữ nguyên, đồng thời sao lưu thành các khối nội dung có kiểu trong `[mk].[LessonContentBlock]`; API `GET /api/learning/path` trả thêm `contentBlocks` và `learningObjectives` cho từng bài.

Nguồn tổng hợp kiến thức đang được đánh dấu `needs_teacher_review`. Toàn bộ liên kết câu hỏi mới được đồng bộ với `MappingStatus = 'needs-review'`; chưa dùng chúng để kết luận học sinh đã thành thạo hoặc tự bỏ qua bài. Không tự gắn tất cả câu trong cùng chủ đề vào mọi mục tiêu của chủ đề, vì như vậy số liệu năng lực sẽ thiếu chính xác. API lộ trình chỉ trả ứng viên bằng chứng 90 ngày; một mục tiêu chỉ có thể ảnh hưởng lộ trình sau khi chương trình được duyệt, liên kết câu hỏi được duyệt, và học sinh có ít nhất 5 lượt trả lời trên ít nhất 3 câu hỏi khác nhau. Giáo viên cần duyệt mục tiêu và từng liên kết câu hỏi trước khi chúng được phê duyệt làm bằng chứng cho lộ trình thích ứng.

Nếu dùng named instance, SQL Server Browser hoặc TCP/IP phải được bật. Nếu instance dùng port cố định, đặt port đó trong `DB_PORT` và có thể bỏ `DB_INSTANCE`.

## Cấp quyền Admin

Đăng ký tài khoản quản trị như tài khoản bình thường, sau đó cấp role trong SQL Server Management Studio cho đúng email:

```sql
UPDATE [mk].[AppUser]
SET UserRole = 'Admin', UpdatedAt = SYSUTCDATETIME()
WHERE Email = N'admin@example.com';
```

Thay `admin@example.com` bằng email tài khoản cần cấp quyền. Đăng xuất rồi đăng nhập lại để token nhận role mới. Đăng ký công khai luôn tạo tài khoản `Student`; không thể tự chọn role Admin từ form.

## SePay Sandbox Premium

Chạy `MathKidsPremiumPayment.sql` một lần trên database `MathKids`, sau đó thêm các biến sau vào file `.env` backend:

```env
SEPAY_ENVIRONMENT=sandbox
SEPAY_MERCHANT_ID=merchant_sandbox_id
SEPAY_SECRET_KEY=sandbox_secret_key
PUBLIC_APP_URL=https://public-frontend-url
PUBLIC_API_URL=https://public-backend-url
```

Trong SePay Sandbox, cấu hình IPN URL là `PUBLIC_API_URL/api/payments/sepay/ipn`. Không đưa `SEPAY_SECRET_KEY` lên frontend hoặc commit vào Git. Luồng dùng one-time checkout 99.000 VND; sau khi SePay gửi IPN `ORDER_PAID`, hệ thống kích hoạt Premium 30 ngày và mở lộ trình AI. SePay sandbox sử dụng host checkout `pay-sandbox.sepay.vn`; khi production thay bằng bộ merchant/secret production và cập nhật URL public.
