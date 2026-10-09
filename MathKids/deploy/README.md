# Deploy MathKids lên VPS Ubuntu (Docker + PM2 + Nginx + Cloudflare)

```
Người dùng ──HTTPS──> Cloudflare ──HTTPS (Origin Cert)──> Nginx :443
                                                         ├─ /            → frontend/dist (file tĩnh)
                                                         ├─ /api/*       → PM2: Node backend :4000
                                                         └─ /uploads/*   → PM2: Node backend :4000
                                              backend ──> Docker: SQL Server 127.0.0.1:1433
```

Tên miền: **hexcode.win** (`www.hexcode.win` tự chuyển về `hexcode.win`). Repo được clone vào `/var/www/mathkid`.

**Yêu cầu VPS:** Ubuntu 22.04/24.04, **tối thiểu 2 GB RAM** (SQL Server cần ~2 GB; nên dùng 4 GB), 20 GB disk.

---

## 1. Cài phần mềm

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git curl ufw

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER      # đăng xuất / đăng nhập lại để có hiệu lực

# Node.js 22 + PM2
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```

Nếu VPS chỉ có 2 GB RAM, thêm swap:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 2. Lấy code

```bash
sudo mkdir -p /var/www && sudo chown $USER:$USER /var/www
git clone <url-repo> /var/www/mathkid
cd /var/www/mathkid/MathKids/deploy
chmod +x *.sh
```

## 3. Database (Docker)

```bash
cp .env.example .env
nano .env                         # đặt MSSQL_SA_PASSWORD mạnh
mkdir -p backups && sudo chown 10001:0 backups   # user mssql trong container
docker compose up -d
./init-db.sh                      # chạy MathKidsDB.sql + MathKidsPremiumPayment.sql
```

Các bảng còn lại (Question Bank, lộ trình, kiểm tra tuần/tháng, phần thưởng, phụ huynh, OTP) được backend tự tạo khi khởi động.

Port 1433 chỉ mở trên `127.0.0.1`, không lộ ra internet.

## 4. Backend (PM2)

```bash
cd /var/www/mathkid/MathKids/backend
cp .env.example .env
nano .env
```

Các giá trị cần sửa:

```env
PORT=4000
FRONTEND_ORIGIN=https://hexcode.win
PUBLIC_APP_URL=https://hexcode.win
PUBLIC_API_URL=https://hexcode.win

DB_SERVER=127.0.0.1
DB_INSTANCE=
DB_PORT=1433
DB_NAME=MathKids
DB_USER=sa
DB_PASSWORD=<giống MSSQL_SA_PASSWORD>
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
DB_POOL_MAX=10

JWT_SECRET=<chuỗi ngẫu nhiên>
OTP_HASH_SECRET=<chuỗi ngẫu nhiên khác>
GOOGLE_CLIENT_ID=<client-id>
SMTP_...=<Gmail App Password>
SEPAY_ENVIRONMENT=sandbox        # đổi thành production khi có tài khoản thật
SEPAY_MERCHANT_ID=...
SEPAY_SECRET_KEY=...
```

Tạo chuỗi ngẫu nhiên: `openssl rand -hex 48`.

`NODE_ENV=production` đã được đặt sẵn trong `ecosystem.config.cjs`, không cần ghi vào `.env`.

```bash
npm ci --omit=dev
pm2 start ../deploy/ecosystem.config.cjs
pm2 save
pm2 startup          # chạy lệnh sudo mà PM2 in ra để tự khởi động cùng VPS
curl http://127.0.0.1:4000/api/health      # {"ok":true,"database":"MathKids"}
```

## 5. Frontend

```bash
cd /var/www/mathkid/MathKids/frontend
cat > .env <<'EOF'
VITE_API_URL=/api
VITE_GOOGLE_CLIENT_ID=<client-id>
EOF
npm ci && npm run build          # tạo dist/
```

## 6. Cloudflare

1. **DNS:** thêm 2 bản ghi, cả hai bật **Proxied** (đám mây cam):
   | Type | Name | Content |
   |---|---|---|
   | A | `@` | IP VPS |
   | A | `www` | IP VPS |
2. **SSL/TLS → Overview:** chọn **Full (strict)**.
3. **SSL/TLS → Origin Server → Create Certificate** (RSA, 15 năm, hostname `hexcode.win`, `*.hexcode.win`). Lưu vào VPS:
   ```bash
   sudo mkdir -p /etc/ssl/cloudflare
   sudo nano /etc/ssl/cloudflare/mathkids.pem   # dán Origin Certificate
   sudo nano /etc/ssl/cloudflare/mathkids.key   # dán Private Key
   sudo chmod 600 /etc/ssl/cloudflare/mathkids.key
   ```
4. **SSL/TLS → Edge Certificates:** bật *Always Use HTTPS*.
5. **Cho phép SePay gọi IPN:** nếu bật *Bot Fight Mode* hoặc WAF, tạo rule **Security → WAF → Custom rules → Skip** với điều kiện `URI Path equals /api/payments/sepay/ipn`. Nếu không, Cloudflare có thể chặn request từ máy chủ SePay.
6. **Caching:** để mặc định. Cloudflare không cache `/api` vì là JSON động.

## 7. Nginx

```bash
sudo cp /var/www/mathkid/MathKids/deploy/nginx/mathkids.conf /etc/nginx/sites-available/mathkids
sudo ln -s /etc/nginx/sites-available/mathkids /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo chmod o+x /var/www /var/www/mathkid /var/www/mathkid/MathKids /var/www/mathkid/MathKids/frontend
sudo nginx -t && sudo systemctl reload nginx

# Lấy IP thật của người dùng từ Cloudflare + tường lửa chỉ mở 80/443 cho Cloudflare
sudo /var/www/mathkid/MathKids/deploy/cloudflare-setup.sh
```

> ⚠️ Sau khi chạy `cloudflare-setup.sh`, chỉ Cloudflare mới vào được port 80/443; SSH vẫn mở. Không truy cập trực tiếp bằng IP VPS được nữa, đây là chủ đích.

## 8. Dịch vụ bên ngoài

- **Google Cloud Console → OAuth Client:** thêm `https://hexcode.win` vào *Authorized JavaScript origins*.
- **SePay:** IPN URL = `https://hexcode.win/api/payments/sepay/ipn`.
- **Gmail SMTP:** một số nhà cung cấp VPS chặn port 587 ra ngoài. Kiểm tra bằng `nc -vz smtp.gmail.com 587`; nếu bị chặn, mở ticket yêu cầu mở port.

## 9. Kiểm tra

- `https://hexcode.win` mở được trang chủ, tải lại ở trang con (vd. `/dashboard`, `/ho-so`) không bị 404.
- `https://hexcode.win/api/health` trả `{"ok":true,...}`.
- Đăng ký tài khoản (nhận OTP qua email), đăng nhập Google, tải ảnh đại diện.
- `pm2 logs mathkids-api` không có lỗi.

## 10. Vận hành

| Việc | Lệnh |
|---|---|
| Cập nhật code mới | `bash /var/www/mathkid/MathKids/deploy/deploy.sh` |
| Xem log backend | `pm2 logs mathkids-api` |
| Khởi động lại backend | `pm2 restart mathkids-api` |
| Log Nginx | `sudo tail -f /var/log/nginx/error.log` |
| Trạng thái DB | `docker compose -f /var/www/mathkid/MathKids/deploy/docker-compose.yml ps` |
| Backup DB thủ công | `/var/www/mathkid/MathKids/deploy/backup-db.sh` |

Backup tự động lúc 2 giờ sáng (`crontab -e`):

```
0 2 * * * /var/www/mathkid/MathKids/deploy/backup-db.sh >> /var/log/mathkids-backup.log 2>&1
```

Nên sao lưu thêm `deploy/backups/` và `backend/uploads/` (ảnh đại diện) ra ngoài VPS, vd. bằng `rclone` lên Google Drive / S3.

Xoay log PM2: `pm2 install pm2-logrotate`.
