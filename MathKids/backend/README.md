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

## API xác thực

- `GET /api/health` — kiểm tra kết nối SQL Server.
- `POST /api/auth/register` — body `{ name, email, password, confirmPassword }`.
- `POST /api/auth/login` — body `{ email, password }`.
- `GET /api/auth/me` — cần header `Authorization: Bearer <token>`.
- `GET /api/students/me/dashboard` — hồ sơ, lớp, XP, sao, số bài học và bài đánh giá; cần JWT.
- `GET /api/students/me/profile` — tải hồ sơ học sinh; cần JWT.
- `PATCH /api/students/me/profile` — cập nhật tên, email, ngày sinh, lớp, URL ảnh đại diện; cần JWT.
- `GET /api/admin/dashboard` — số liệu và danh sách tài khoản gần đây; chỉ Admin mới được phép truy cập.

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
