# 🚀 Equipment Management System: Backend API Server

Đây là máy chủ API tập trung của dự án **Hệ thống Quản lý Thiết bị Đa nền tảng (Equipment Management System)**. Được xây dựng dựa trên các tiêu chuẩn API RESTful hiện đại, kiến trúc module chặt chẽ và cơ chế bảo mật phân quyền nghiêm ngặt.

---

### 🌐 Cổng kết nối trực tuyến
* **Web Portal:** [https://btl-thltw.onrender.com/](https://btl-thltw.onrender.com/)
* **Tải xuống ứng dụng di động Android (APK):** [Tải về EquipmentManagement.apk](https://github.com/Nor262/BTL_APP/releases/download/v1.0.0/EquipmentManagement.apk)
---

### 📊 Công nghệ sử dụng & Huy hiệu

<p align="left">
  <a href="https://github.com/Nor262/BTL_APP/releases/download/v1.0.0/EquipmentManagement.apk"><img src="https://img.shields.io/badge/Android%20App-APK%20Download-green?style=for-the-badge&logo=android&logoColor=white" alt="Download APK" /></a>
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/MySQL-00758F?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/BullMQ-FF5722?style=for-the-badge&logo=redis&logoColor=white" alt="BullMQ" />
  <img src="https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black" alt="Swagger" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

---

## ⚡ Tính năng cốt lõi của Backend

1. **Quản lý thiết bị & QR Code:** Tạo và quản trị vòng đời thiết bị, tự động sinh chuỗi mã hóa UUID duy nhất phục vụ in mã QR.
2. **Quy trình mượn/trả an toàn:** Tránh đặt lịch trùng lặp bằng giải pháp **Pessimistic Locking (Khóa bi quan - `SELECT ... FOR UPDATE`)**, đảm bảo tính toàn vẹn dữ liệu trong môi trường bất đồng bộ.
3. **Quản lý hình ảnh minh chứng:** Tích hợp SDK Cloudinary để tải ảnh tình trạng thiết bị khi thực hiện Check-in / Check-out tại kho.
4. **Báo cáo & Thống kê:** Hỗ trợ trích xuất dữ liệu mượn trả và danh sách thiết bị ra file Excel (.xlsx) thông qua thư viện ExcelJS.
5. **Hàng đợi ngầm (Task Queue):** Sử dụng BullMQ kết hợp Redis để chạy các tác vụ nền như tự động gửi email nhắc hạn mượn và gửi thông báo đẩy (Push Notification) qua FCM.
6. **Xác thực & Phân quyền (RBAC):** Phân quyền nghiêm ngặt theo vai trò (`Admin`, `Storekeeper`, `Borrower`) sử dụng cơ chế JWT.

---

## 📋 Yêu cầu hệ thống

* **Node.js:** Phiên bản 20.x trở lên.
* **Docker & Docker Compose:** Dùng để khởi chạy các dịch vụ database MySQL và Redis cục bộ.
* **Tài khoản đám mây:** Cần có tài khoản Cloudinary để lưu hình ảnh và Firebase Project để lấy Service Account File phục vụ Push Notification.

---

## 🛠 Hướng dẫn thiết lập chi tiết

### 1. Cài đặt thư viện
Di chuyển vào thư mục backend và thực hiện cài đặt:
```bash
npm install
```

### 2. Thiết lập biến môi trường
Tạo tệp cấu hình `.env` dựa theo mẫu cấu hình:
```bash
cp .env.example .env
```
Mở file `.env` và thiết lập các biến môi trường quan trọng sau:
* `DATABASE_URL`: Chuỗi kết nối đến MySQL.
* `REDIS_URL`: Chuỗi kết nối tới Redis Server.
* `JWT_SECRET`: Khóa bí mật mã hóa JWT Tokens.
* `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: Thông số kết nối Cloudinary Storage.

---

### 3. Thiết lập Database (Chọn một trong hai phương án)

#### Phương án A: Chạy cơ sở dữ liệu cục bộ qua Docker
Nếu máy tính của bạn đã cài đặt Docker, chỉ cần chạy lệnh sau để tự động khởi tạo MySQL & Redis:
```bash
docker-compose up -d
```

#### Phương án B: Kết nối tới Cơ sở dữ liệu đám mây Aiven MySQL Cloud
Nếu bạn không muốn chạy MySQL cục bộ, bạn có thể thiết lập thông qua **Aiven for MySQL** bằng các bước sau:
1. Đăng ký tài khoản trên [Aiven Console](https://console.aiven.io/) và tạo mới một database instance MySQL.
2. Tải về chứng chỉ bảo mật CA Certificate (`ca.pem`).
3. Đặt tệp `ca.pem` vừa tải vào thư mục chứa schema của Prisma: `backend/prisma/ca.pem`.
4. Cập nhật biến `DATABASE_URL` trong tệp `.env`:
   ```env
   DATABASE_URL="mysql://avnadmin:<MẬT_KHẨU>@<HOST_AIVEN>:<PORT_AIVEN>/defaultdb?sslcert=ca.pem"
   ```

---

### 4. Đồng bộ Schema & Seeding dữ liệu mẫu
1. Tiến hành ánh xạ các Models Prisma vào database:
   ```bash
   npx prisma migrate dev
   ```
2. Thực thi script seeding để nạp sẵn dữ liệu mẫu cho hệ thống (bao gồm các vị trí kho, danh mục, thiết bị demo và tài khoản admin):
   ```bash
   npx prisma db seed
   ```
   *Tài khoản Admin mặc định để đăng nhập:*
   * **Email:** `admin@example.com`
   * **Mật khẩu:** `123456`
   * **Quyền hạn:** `admin`

### 5. Chạy máy chủ ở chế độ phát triển
```bash
npm run dev
```
Hệ thống sẽ lắng nghe các request tại địa chỉ: `http://localhost:3000/v1`. Bạn có thể truy cập Swagger UI để xem tài liệu API chi tiết tại `http://localhost:3000/api/docs`.

---

## 🏗 Cấu trúc thư mục chính của Backend

```
backend/
├── prisma/                 # Cấu hình Prisma Client, CA Cert và các tệp Migrations
│   ├── schema.prisma       # Cấu trúc lược đồ dữ liệu các bảng (DB Schema)
│   └── seed.ts             # Script seeding nạp dữ liệu mẫu ban đầu
├── src/
│   ├── audit/              # Module ghi nhận logs thao tác của admin (Audit Logging)
│   ├── auth/               # Module xác thực JWT, phân quyền Guards & Strategies
│   ├── cloudinary/         # Module quản lý tải ảnh lên máy chủ Cloudinary
│   ├── equipment/          # Module CRUD thiết bị và kiểm tra lịch bận
│   ├── reports/            # Module logic khởi tạo cấu trúc và xuất file Excel (.xlsx)
│   ├── transactions/       # Module nghiệp vụ mượn/trả, check-in, check-out và quét QR
│   ├── app.module.ts       # Module gốc liên kết toàn bộ ứng dụng
│   └── main.ts             # Tệp khởi tạo chính của NestJS Server
└── test/                   # Kịch bản kiểm thử tích hợp (End-to-End Tests)
```

---

## 🧪 Kiểm thử (Testing)

Bạn có thể chạy các kịch bản test tích hợp của dự án bằng lệnh:
```bash
npm run test
```

---
*Ghi chú: Luôn đảm bảo rằng Redis Server đang hoạt động tốt vì hệ thống hàng đợi BullMQ yêu cầu kết nối Redis liên tục để gửi email thông báo và xử lý cronjob.*
