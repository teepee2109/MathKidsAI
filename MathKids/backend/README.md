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

Nếu dùng named instance, SQL Server Browser hoặc TCP/IP phải được bật. Nếu instance dùng port cố định, đặt port đó trong `DB_PORT` và có thể bỏ `DB_INSTANCE`.
