# Equipment Management System - Backend

Hệ thống quản lý thiết bị tích hợp mượn/trả, báo cáo hư hỏng kèm hình ảnh, lịch bận (Calendar) và xuất báo cáo Excel.

## 🚀 Tính năng chính

- **Quản lý thiết bị**: Theo dõi tình trạng, vị trí, danh mục và mã QR.
- **Quy trình mượn/trả**: Phê duyệt yêu cầu, chống đặt trùng lịch (Double-Booking) bằng Pessimistic Locking.
- **Báo cáo hư hỏng**: Tích hợp tải ảnh lên Cloudinary khi Check-in/Check-out.
- **Lịch bận (Availability)**: API cung cấp các khoảng thời gian bận của thiết bị để hiển thị lên Calendar.
- **Hệ thống Audit Log**: Theo dõi các hành động nhạy cảm của quản trị viên.
- **Báo cáo**: Xuất danh sách thiết bị ra file Excel (.xlsx).

## 🛠 Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) (v11)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Database**: MySQL 8.0
- **Storage**: Cloudinary (Image handling)
- **Reporting**: ExcelJS
- **Queue/Background**: BullMQ & Redis
- **Security**: Passport JWT, Bcrypt

## 📋 Yêu cầu hệ thống

- **Node.js**: v20 hoặc mới hơn
- **Docker & Docker Compose**: Để chạy MySQL & Redis
- **Cloudinary Account**: Để lưu trữ hình ảnh báo cáo

## 🛠 Hướng dẫn cài đặt

### 1. Clone repository
```bash
git clone <repository-url>
cd backend
```

### 2. Cài đặt dependency
```bash
npm install
```

### 3. Thiết lập biến môi trường
```bash
cp .env.example .env
```
Mở file `.env` và điền các thông tin về Cloudinary và JWT Secret.

### 4. Khởi động Database (MySQL & Redis)
```bash
docker-compose up -d
```

### 5. Khởi tạo Database Schema
```bash
npx prisma migrate dev
```
Hoặc nếu bạn muốn đẩy nhanh cấu hình (không dùng migration file trong môi trường dev):
```bash
npx prisma db push
```

### 6. Nạp dữ liệu mẫu (Seeding)
```bash
npx prisma db seed
```
Mặc định sẽ tạo tài khoản:
- **Email**: `admin@example.com`
- **Password**: `123456`
- **Role**: `admin`

### 7. Chạy ứng dụng
```bash
# Development mode
npm run dev
```
Server sẽ chạy tại [http://localhost:3000/v1](http://localhost:3000/v1).
Tài liệu Swagger: [http://localhost:3000/api/docs](http://localhost:3000/api/docs).

### 8. Cập nhật Database khi Pull code mới
Nếu bạn thực hiện Pull code từ lần thứ 2 trở đi và có sự thay đổi về Schema, hãy chạy lệnh sau để cập nhật cơ sở dữ liệu:
```bash
npx prisma migrate dev
```

## 📂 Cấu trúc thư mục chính

```
src/
├── audit/          # Logic lưu vết hoạt động hệ thống
├── auth/           # Xác thực, phân quyền JWT
├── cloudinary/     # Xử lý upload ảnh lên Cloud
├── equipment/      # Quản lý thiết bị & kiểm tra lịch bận
├── reports/        # Logic xuất file Excel
├── transactions/   # Nghiệp vụ mượn/trả & báo cáo hư hỏng
└── prisma/         # Prisma Client & Schema
```

## 🧪 Chạy Tests
```bash
npm run test
```

## 📜 Tài liệu API chi tiết
Xem file `API_DOCS.md` ở thư mục gốc của project để biết chi tiết về các endpoint.
