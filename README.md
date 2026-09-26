# Stalwart Recovery Portal

Portal bổ sung email khôi phục, OTP và đặt lại mật khẩu cho Stalwart. Tài khoản, mật khẩu và quyền vẫn nằm trên Stalwart. SQLite chỉ lưu metadata khôi phục, challenge OTP và audit.

## Chạy bằng Docker

Portal và Stalwart phải cùng Docker network. `docker-compose.yml` dùng network ngoài tên `mail-network`.

```bash
cp .env.example .env
# sửa .env
docker compose up -d
```

Image: `ghcr.io/vthang87/stalwart-recovery-portal:latest`

SQLite nằm trong volume `stalwart_recovery_data`, mount tại `/data` trong container (`DATA_DIR=/data`). Giữ volume này khi cập nhật image.

Health check: `GET /api/health`.

## Biến môi trường

Copy từ [`.env.example`](.env.example).

### Ứng dụng

| Biến | Ý nghĩa |
| --- | --- |
| `APP_NAME` | Tên hiển thị trên giao diện. |
| `APP_URL` | URL public của portal, không có dấu `/` cuối. Phải là `https://` khi chạy production để cookie session bật `Secure`. |
| `PORT` | Cổng trong container. Mặc định `3000`. |
| `DATA_DIR` | Thư mục chứa `recovery.db`. Trong Docker để `/data`. |
| `SESSION_SECRET` | Chuỗi ngẫu nhiên dài, dùng để mã hóa session cookie và hash OTP. Bắt buộc khi `NODE_ENV=production`. Đổi secret sẽ đăng xuất mọi phiên hiện có. |

Tạo secret:

```bash
openssl rand -base64 48
```

### Stalwart

| Biến | Ý nghĩa |
| --- | --- |
| `STALWART_URL` | URL Management API, ví dụ `http://stalwart:8080` trên Docker network. Không có dấu `/` cuối. |
| `STALWART_API_TOKEN` | API key của tài khoản tích hợp. Chỉ dùng ở server, không đưa ra trình duyệt. |
| `STALWART_OAUTH_CLIENT_ID` | Client id khi portal gọi `POST /api/auth` để phát hiện MFA. Mặc định `stalwart-recovery-portal`. |
| `RECOVERY_ADMIN_PERMISSIONS` | Danh sách quyền, phân tách bằng dấu phẩy. Ai có một trong các quyền này thì vào trang quản trị khôi phục. Mặc định `sysAccountQuery`. Không kiểm tra tên role `admin`. |

API key cần ít nhất:

- `sysAccountQuery` — tìm tài khoản
- `sysAccountGet` — đọc tài khoản
- `sysAccountUpdate` — đặt lại mật khẩu khi quên

Tạo key trong Stalwart: Account → Credentials → API Keys. Gán key cho một tài khoản dịch vụ, không dùng tài khoản mailbox cá nhân.

Đăng nhập người dùng đi qua `GET /api/account` bằng mật khẩu của chính họ. Nếu Stalwart trả `mfaRequired`, portal không bỏ qua MFA.

### OTP

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `OTP_LENGTH` | `6` | Số chữ số. |
| `OTP_TTL_MINUTES` | `15` | Thời gian sống của mã. |
| `OTP_MAX_ATTEMPTS` | `5` | Số lần nhập sai trước khi khóa challenge. |
| `OTP_RESEND_COOLDOWN_SECONDS` | `60` | Thời gian chờ giữa hai lần gửi. |

Portal chỉ lưu HMAC của OTP. Email khôi phục chưa xác minh không được dùng để đặt lại mật khẩu.

### SMTP noreply

| Biến | Ý nghĩa |
| --- | --- |
| `SMTP_HOST` | Máy chủ SMTP. Trên Docker network thường là tên service Stalwart, ví dụ `stalwart`. |
| `SMTP_PORT` | `587` (STARTTLS), `465` (TLS) hoặc `25`. |
| `SMTP_SECURE` | `true` khi dùng cổng 465. `false` với 587/25. |
| `SMTP_STARTTLS` | `true` để bật STARTTLS trên 587. |
| `SMTP_USER` | Tài khoản gửi, ví dụ `noreply@domain.com`. |
| `SMTP_PASSWORD` | Mật khẩu mailbox noreply. |
| `MAIL_FROM_NAME` | Tên hiển thị người gửi. |
| `MAIL_FROM_ADDRESS` | Địa chỉ From, thường trùng `SMTP_USER`. |

Tài khoản noreply là mailbox Stalwart bình thường, dùng để gửi OTP. Lỗi SMTP không làm container thoát. Sau khi portal chạy, đăng nhập bằng tài khoản có quyền admin recovery rồi vào `/admin/settings` để kiểm tra kết nối và gửi thư thử.

## Ví dụ `.env`

```env
APP_NAME=Stalwart Recovery Portal
APP_URL=https://account.domain.com
PORT=3000
DATA_DIR=/data
SESSION_SECRET=thay-bang-chuoi-ngau-nhien

STALWART_URL=http://stalwart:8080
STALWART_API_TOKEN=thay-bang-api-key
STALWART_OAUTH_CLIENT_ID=stalwart-recovery-portal
RECOVERY_ADMIN_PERMISSIONS=sysAccountQuery

OTP_LENGTH=6
OTP_TTL_MINUTES=15
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60

SMTP_HOST=stalwart
SMTP_PORT=587
SMTP_SECURE=false
SMTP_STARTTLS=true
SMTP_USER=noreply@domain.com
SMTP_PASSWORD=thay-bang-mat-khau-noreply
MAIL_FROM_NAME=Mail Recovery
MAIL_FROM_ADDRESS=noreply@domain.com
```

Đặt reverse proxy HTTPS phía trước cổng 3000. `APP_URL` phải trùng URL người dùng mở trên trình duyệt.

## Chạy local

```bash
cp .env.example .env
npm ci
npm run dev
```

`DATA_DIR` mặc định là `./data` khi không khai báo. `STALWART_URL` trỏ tới Stalwart mà máy dev truy cập được, ví dụ `http://127.0.0.1:8080`.
