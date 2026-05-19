import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

// Phân tích DATABASE_URL
const dbUrl = new URL(process.env.DATABASE_URL || 'mysql://root:rootpassword@localhost:3306/btl_db');
const sslcert = dbUrl.searchParams.get('sslcert');
let sslOptions = undefined;

if (sslcert) {
  try {
    const certPathInPrisma = path.resolve(process.cwd(), 'prisma', sslcert);
    if (fs.existsSync(certPathInPrisma)) {
      sslOptions = {
        ca: fs.readFileSync(certPathInPrisma, 'utf8'),
        rejectUnauthorized: true,
      };
    } else {
      const certPathDirect = path.resolve(process.cwd(), sslcert);
      if (fs.existsSync(certPathDirect)) {
        sslOptions = {
          ca: fs.readFileSync(certPathDirect, 'utf8'),
          rejectUnauthorized: true,
        };
      }
    }
  } catch (error) {
    console.error('❌ Lỗi khi đọc chứng chỉ SSL CA cho Aiven Database:', error);
  }
}

const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: Number(dbUrl.port) || 3306,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.replace('/', ''),
  connectionLimit: 10,
  ssl: sslOptions,
  allowPublicKeyRetrieval: true,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('123456', salt);

  console.log('🌱 Bắt đầu dọn dẹp dữ liệu cũ...');
  // Xóa theo thứ tự ràng buộc khóa ngoại
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.maintenanceHistory.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.equipment.deleteMany({});
  await prisma.storageLocation.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.equipmentCategory.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('✅ Đã dọn dẹp dữ liệu cũ.');

  console.log('🌱 Tạo danh sách Người dùng (Users)...');
  const user1 = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@ptit.edu.vn',
      password_hash: passwordHash,
      full_name: 'Nguyễn Bình Minh (Admin)',
      role: 'admin',
      phone: '0912345678',
      penalty_points: 0,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      username: 'storekeeper01',
      email: 'storekeeper01@ptit.edu.vn',
      password_hash: passwordHash,
      full_name: 'Nguyễn Văn Kho (Thủ kho)',
      role: 'storekeeper',
      phone: '0987654321',
      penalty_points: 0,
    },
  });

  const user3 = await prisma.user.create({
    data: {
      username: 'storekeeper02',
      email: 'storekeeper02@ptit.edu.vn',
      password_hash: passwordHash,
      full_name: 'Trần Thị Kho (Phó kho)',
      role: 'storekeeper',
      phone: '0977654321',
      penalty_points: 0,
    },
  });

  const sv1 = await prisma.user.create({
    data: {
      username: 'sinhvien01',
      email: 'sinhvien01@ptit.edu.vn',
      password_hash: passwordHash,
      full_name: 'Trần Văn Hoàng (Sinh viên)',
      role: 'borrower',
      phone: '0901234567',
      penalty_points: 0,
    },
  });

  const sv2 = await prisma.user.create({
    data: {
      username: 'sinhvien02',
      email: 'sinhvien02@ptit.edu.vn',
      password_hash: passwordHash,
      full_name: 'Lê Văn Học (Sinh viên)',
      role: 'borrower',
      phone: '0932345678',
      penalty_points: 2, // Đã có ít điểm phạt
    },
  });

  const sv3 = await prisma.user.create({
    data: {
      username: 'sinhvien03',
      email: 'sinhvien03@ptit.edu.vn',
      password_hash: passwordHash,
      full_name: 'Phạm Hoàng Nam (Sinh viên)',
      role: 'borrower',
      phone: '0942345678',
      penalty_points: 0,
    },
  });

  const sv4 = await prisma.user.create({
    data: {
      username: 'sinhvien04',
      email: 'sinhvien04@ptit.edu.vn',
      password_hash: passwordHash,
      full_name: 'Đỗ Thùy Chi (Sinh viên)',
      role: 'borrower',
      phone: '0952345678',
      penalty_points: 5, // Có điểm phạt cao
    },
  });

  const sv5 = await prisma.user.create({
    data: {
      username: 'sinhvien05',
      email: 'sinhvien05@ptit.edu.vn',
      password_hash: passwordHash,
      full_name: 'Hoàng Quốc Việt (Sinh viên)',
      role: 'borrower',
      phone: '0962345678',
      penalty_points: 0,
    },
  });

  console.log('🌱 Tạo danh sách Danh mục Thiết bị (Equipment Categories)...');
  const catLaptop = await prisma.equipmentCategory.create({
    data: { name: 'Laptops', description: 'Máy tính xách tay cấu hình cao phục vụ lập trình và thiết kế đồ họa' },
  });
  const catCamera = await prisma.equipmentCategory.create({
    data: { name: 'Cameras & Lenses', description: 'Máy ảnh Mirrorless, máy quay phim và các loại ống kính studio chuyên nghiệp' },
  });
  const catProjector = await prisma.equipmentCategory.create({
    data: { name: 'Projectors & Screens', description: 'Máy chiếu độ sáng cao và màn chiếu di động phục vụ sự kiện, thuyết trình' },
  });
  const catAudio = await prisma.equipmentCategory.create({
    data: { name: 'Audio Equipment', description: 'Hệ thống loa di động, micro thu âm không dây và mixer âm thanh sân khấu' },
  });
  const catNetwork = await prisma.equipmentCategory.create({
    data: { name: 'Networking', description: 'Thiết bị mạng bao gồm Switch, Router và Access Point phục vụ thực hành kỹ thuật' },
  });
  const catStudio = await prisma.equipmentCategory.create({
    data: { name: 'Studio Accessories', description: 'Phụ kiện phòng quay bao gồm Gimbal, chân máy Tripod, đèn LED Godox' },
  });

  console.log('🌱 Tạo danh sách Nhà cung cấp (Suppliers)...');
  const supFpt = await prisma.supplier.create({
    data: { name: 'FPT Shop', contact_info: 'hotline: 1800 6601', address: '261-263 Khánh Hội, Phường 5, Quận 4, TP.HCM' },
  });
  const supPv = await prisma.supplier.create({
    data: { name: 'Phong Vũ Computer', contact_info: 'hotline: 1900 6035', address: '264 Nguyễn Thị Minh Khai, Quận 3, TP.HCM' },
  });
  const supSony = await prisma.supplier.create({
    data: { name: 'Sony Việt Nam', contact_info: 'hotline: 1800 588 885', address: 'Tòa nhà President Place, 93 Nguyễn Du, Quận 1, TP.HCM' },
  });
  const supGearvn = await prisma.supplier.create({
    data: { name: 'GearVN Hi-End', contact_info: 'hotline: 1800 6173', address: '78-80 Hoàng Hoa Thám, Phường 12, Quận Tân Bình, TP.HCM' },
  });

  console.log('🌱 Tạo danh sách Vị trí Kho (Storage Locations)...');
  const locA1 = await prisma.storageLocation.create({
    data: { name: 'Kho A1 - Phòng Kỹ thuật', address: 'Tầng 2, Nhà A2, Học viện Công nghệ Bưu chính Viễn thông, Hà Nội', manager_id: user2.id },
  });
  const locB2 = await prisma.storageLocation.create({
    data: { name: 'Kho B2 - Media Studio', address: 'Tầng 5, Nhà C, Học viện Công nghệ Bưu chính Viễn thông, Hà Nội', manager_id: user3.id },
  });
  const locC3 = await prisma.storageLocation.create({
    data: { name: 'Kho C3 - Thư viện PTIT', address: 'Tầng 1, Nhà Thư viện Học viện Công nghệ Bưu chính Viễn thông, Hà Nội', manager_id: user2.id },
  });

  console.log('🌱 Tạo danh sách Thiết bị (Equipment) - Tối thiểu 40 items...');
  const equipmentData = [
    // --- LAPTOPS (10 items) ---
    {
      name: 'MacBook Pro 16" M3 Pro 18GB/512GB',
      serial_number: 'SN-LAP-001',
      sku: 'SKU-MBP16-M3P',
      status: 'available',
      specifications: { cpu: 'Apple M3 Pro', ram: '18GB', storage: '512GB SSD', screen: '16.2 inch Liquid Retina XDR' },
      qr_code_data: 'QR-MBP16-001',
      image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500',
      purchase_date: new Date('2024-01-15'),
      current_condition: 'Mới 99%, không trầy xước, kèm sạc zin Apple 140W',
      category_id: catLaptop.id,
      supplier_id: supFpt.id,
      location_id: locA1.id,
    },
    {
      name: 'MacBook Pro 14" M3 8GB/512GB',
      serial_number: 'SN-LAP-002',
      sku: 'SKU-MBP14-M3',
      status: 'in_use',
      specifications: { cpu: 'Apple M3', ram: '8GB', storage: '512GB SSD', screen: '14.2 inch Liquid Retina XDR' },
      qr_code_data: 'QR-MBP14-002',
      image_url: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=500',
      purchase_date: new Date('2024-01-20'),
      current_condition: 'Mới 98%, góc dưới trầy xước nhẹ',
      category_id: catLaptop.id,
      supplier_id: supFpt.id,
      location_id: locA1.id,
    },
    {
      name: 'Dell XPS 15 9530 i7-13700H 16GB/1TB',
      serial_number: 'SN-LAP-003',
      sku: 'SKU-DELL-XPS15',
      status: 'available',
      specifications: { cpu: 'Intel Core i7-13700H', ram: '16GB', storage: '1TB SSD', gpu: 'NVIDIA RTX 4050 6GB' },
      qr_code_data: 'QR-XPS15-003',
      image_url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500',
      purchase_date: new Date('2023-11-05'),
      current_condition: 'Mới 97%, màn hình OLED cảm ứng sắc nét',
      category_id: catLaptop.id,
      supplier_id: supPv.id,
      location_id: locA1.id,
    },
    {
      name: 'Dell Latitude 5440 i5-1335U 16GB/512GB',
      serial_number: 'SN-LAP-004',
      sku: 'SKU-DELL-LAT5440',
      status: 'available',
      specifications: { cpu: 'Intel Core i5-1335U', ram: '16GB', storage: '512GB SSD', screen: '14 inch FHD' },
      qr_code_data: 'QR-LAT5440-004',
      image_url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500',
      purchase_date: new Date('2023-09-12'),
      current_condition: 'Độ bền cao, pin khỏe, phục vụ thực hành văn phòng',
      category_id: catLaptop.id,
      supplier_id: supPv.id,
      location_id: locC3.id,
    },
    {
      name: 'Lenovo ThinkPad X1 Carbon Gen 11 i7-1355U',
      serial_number: 'SN-LAP-005',
      sku: 'SKU-THINKPAD-X1',
      status: 'available',
      specifications: { cpu: 'Intel Core i7-1355U', ram: '32GB', storage: '1TB SSD', screen: '14 inch WUXGA IPS' },
      qr_code_data: 'QR-THINKX1-005',
      image_url: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500',
      purchase_date: new Date('2024-02-18'),
      current_condition: 'Mới 100%, nguyên hộp, siêu nhẹ, bàn phím gõ cực êm',
      category_id: catLaptop.id,
      supplier_id: supPv.id,
      location_id: locA1.id,
    },
    {
      name: 'Lenovo Legion 5 Pro 16IRX8 i7-13700HX/16GB',
      serial_number: 'SN-LAP-006',
      sku: 'SKU-LEGION5-PRO',
      status: 'in_use',
      specifications: { cpu: 'Intel Core i7-13700HX', ram: '16GB', storage: '512GB SSD', gpu: 'NVIDIA RTX 4060 8GB' },
      qr_code_data: 'QR-LEGION5-006',
      image_url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=500',
      purchase_date: new Date('2023-12-10'),
      current_condition: 'Mới 98%, tản nhiệt tốt, phục vụ thiết kế đồ họa nặng và AI',
      category_id: catLaptop.id,
      supplier_id: supGearvn.id,
      location_id: locA1.id,
    },
    {
      name: 'ASUS ROG Zephyrus G14 Ryzen 7-7735HS/16GB',
      serial_number: 'SN-LAP-007',
      sku: 'SKU-ROG-ZEPHYRUS',
      status: 'maintenance',
      specifications: { cpu: 'AMD Ryzen 7 7735HS', ram: '16GB', storage: '512GB SSD', gpu: 'NVIDIA RTX 4050 6GB' },
      qr_code_data: 'QR-ZEPHYRUS-007',
      image_url: 'https://images.unsplash.com/photo-1593642532842-98d0fd5ebc1a?w=500',
      purchase_date: new Date('2023-08-25'),
      current_condition: 'Màn hình bị sọc nhẹ, đang chờ kỹ thuật viên kiểm tra và sửa màn hình',
      category_id: catLaptop.id,
      supplier_id: supGearvn.id,
      location_id: locA1.id,
    },
    {
      name: 'ASUS TUF Gaming A15 Ryzen 5-7535HS/8GB',
      serial_number: 'SN-LAP-008',
      sku: 'SKU-ASUS-TUF',
      status: 'available',
      specifications: { cpu: 'AMD Ryzen 5 7535HS', ram: '8GB', storage: '512GB SSD', gpu: 'NVIDIA RTX 2050 4GB' },
      qr_code_data: 'QR-ASUSTUF-008',
      image_url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500',
      purchase_date: new Date('2023-06-14'),
      current_condition: 'Ngoại hình cũ 90%, phím space hơi kẹt nhưng hoạt động bình thường',
      category_id: catLaptop.id,
      supplier_id: supPv.id,
      location_id: locC3.id,
    },
    {
      name: 'Acer Predator Helios Neo 16 i7-13700HX/16GB',
      serial_number: 'SN-LAP-009',
      sku: 'SKU-ACER-PREDATOR',
      status: 'available',
      specifications: { cpu: 'Intel Core i7-13700HX', ram: '16GB', storage: '512GB SSD', gpu: 'NVIDIA RTX 4060 8GB' },
      qr_code_data: 'QR-PREDATOR-009',
      image_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500',
      purchase_date: new Date('2024-03-01'),
      current_condition: 'Mới 100%, cấu hình khủng cho nghiên cứu xử lý ngôn ngữ tự nhiên NLP',
      category_id: catLaptop.id,
      supplier_id: supGearvn.id,
      location_id: locA1.id,
    },
    {
      name: 'HP Pavilion 15 Core i5-1335U 8GB/512GB',
      serial_number: 'SN-LAP-010',
      sku: 'SKU-HP-PAVILION',
      status: 'broken',
      specifications: { cpu: 'Intel Core i5-1335U', ram: '8GB', storage: '512GB SSD', screen: '15.6 inch FHD IPS' },
      qr_code_data: 'QR-HPPAV-010',
      image_url: 'https://images.unsplash.com/photo-1589561084283-930aa7b1ce50?w=500',
      purchase_date: new Date('2023-05-18'),
      current_condition: 'Vỡ vỏ máy góc bản lề do rơi, lỗi màn hình không lên nguồn',
      category_id: catLaptop.id,
      supplier_id: supFpt.id,
      location_id: locC3.id,
    },

    // --- CAMERAS & LENSES (8 items) ---
    {
      name: 'Sony Alpha 7 III Mirrorless Camera (Body Only)',
      serial_number: 'SN-CAM-011',
      sku: 'SKU-SONY-A7M3',
      status: 'available',
      specifications: { sensor: '24.2MP Full-Frame Exmor R BSI CMOS', video: '4K30p HDR', mount: 'Sony E-mount' },
      qr_code_data: 'QR-SONYA7M3-011',
      image_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500',
      purchase_date: new Date('2023-02-15'),
      current_condition: 'Mới 95%, sensor sạch không bụi, khoảng 12.000 shot',
      category_id: catCamera.id,
      supplier_id: supSony.id,
      location_id: locB2.id,
    },
    {
      name: 'Sony Alpha 7 IV Mirrorless Camera (Body Only)',
      serial_number: 'SN-CAM-012',
      sku: 'SKU-SONY-A7M4',
      status: 'in_use',
      specifications: { sensor: '33MP Full-Frame Exmor R BSI CMOS', video: '4K60p 10-Bit', mount: 'Sony E-mount' },
      qr_code_data: 'QR-SONYA7M4-012',
      image_url: 'https://images.unsplash.com/photo-1616440347437-b1c73416efc2?w=500',
      purchase_date: new Date('2023-11-20'),
      current_condition: 'Mới 98%, cực tốt, chụp khoảng 3.000 shot',
      category_id: catCamera.id,
      supplier_id: supSony.id,
      location_id: locB2.id,
    },
    {
      name: 'Sony FE 24-70mm f/2.8 GM Lens',
      serial_number: 'SN-LEN-013',
      sku: 'SKU-SONY-2470GM',
      status: 'available',
      specifications: { focal_length: '24-70mm', aperture: 'f/2.8', line: 'G Master professional' },
      qr_code_data: 'QR-SONY2470-013',
      image_url: 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=500',
      purchase_date: new Date('2023-03-01'),
      current_condition: 'Kính trong veo, không mốc hay rễ tre, kèm hood zin và filter UV',
      category_id: catCamera.id,
      supplier_id: supSony.id,
      location_id: locB2.id,
    },
    {
      name: 'Sony FE 85mm f/1.4 GM Lens',
      serial_number: 'SN-LEN-014',
      sku: 'SKU-SONY-85GM',
      status: 'available',
      specifications: { focal_length: '85mm', aperture: 'f/1.4', type: 'Portrait Prime Lens' },
      qr_code_data: 'QR-SONY85-014',
      image_url: 'https://images.unsplash.com/photo-1607462109225-6b64ae2dd3cb?w=500',
      purchase_date: new Date('2023-05-10'),
      current_condition: 'Mới 96%, xóa phông tuyệt đỉnh cho chụp studio',
      category_id: catCamera.id,
      supplier_id: supSony.id,
      location_id: locB2.id,
    },
    {
      name: 'Canon EOS R6 Mirrorless Camera (Body Only)',
      serial_number: 'SN-CAM-015',
      sku: 'SKU-CANON-R6',
      status: 'available',
      specifications: { sensor: '20MP Full-Frame CMOS', video: '4K60p 10-Bit Internal', mount: 'Canon RF' },
      qr_code_data: 'QR-CANONR6-015',
      image_url: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=500',
      purchase_date: new Date('2023-04-18'),
      current_condition: 'Mới 95%, cao su tay cầm hơi giãn nhẹ, chụp ổn định',
      category_id: catCamera.id,
      supplier_id: supPv.id,
      location_id: locB2.id,
    },
    {
      name: 'Canon RF 24-105mm f/4L IS USM Lens',
      serial_number: 'SN-LEN-016',
      sku: 'SKU-CANON-24105L',
      status: 'available',
      specifications: { focal_length: '24-105mm', aperture: 'f/4 constant', features: 'Image Stabilizer, L-Series' },
      qr_code_data: 'QR-CANON24105-016',
      image_url: 'https://images.unsplash.com/photo-1619961313028-e4b7b25206c7?w=500',
      purchase_date: new Date('2023-04-20'),
      current_condition: 'Mới 97%, chống rung hoạt động rất tốt',
      category_id: catCamera.id,
      supplier_id: supPv.id,
      location_id: locB2.id,
    },
    {
      name: 'Sony Cinema Line FX3 Camera',
      serial_number: 'SN-CAM-017',
      sku: 'SKU-SONY-FX3',
      status: 'in_use',
      specifications: { sensor: '12.1MP Full-Frame Exmor R BSI CMOS', video: 'UHD 4K 120p / 10-Bit 4:2:2', handle: 'XLR top handle unit included' },
      qr_code_data: 'QR-SONYFX3-017',
      image_url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=500',
      purchase_date: new Date('2024-02-10'),
      current_condition: 'Mới 99%, chuyên dụng cho quay MV và sự kiện lớn của Học viện',
      category_id: catCamera.id,
      supplier_id: supSony.id,
      location_id: locB2.id,
    },
    {
      name: 'Sigma 24-70mm f/2.8 DG DN Art Lens for Sony E',
      serial_number: 'SN-LEN-018',
      sku: 'SKU-SIGMA-2470',
      status: 'maintenance',
      specifications: { focal_length: '24-70mm', aperture: 'f/2.8', series: 'Sigma Art Series' },
      qr_code_data: 'QR-SIGMA2470-018',
      image_url: 'https://images.unsplash.com/photo-1616440347817-268e185c889f?w=500',
      purchase_date: new Date('2023-07-15'),
      current_condition: 'Vòng zoom bị rít nặng, đang gửi hãng vệ sinh thấu kính và bảo dưỡng cơ học',
      category_id: catCamera.id,
      supplier_id: supGearvn.id,
      location_id: locB2.id,
    },

    // --- PROJECTORS & SCREENS (6 items) ---
    {
      name: 'Epson EB-X06 3LCD XGA Projector',
      serial_number: 'SN-PRJ-019',
      sku: 'SKU-EPSON-EBX06',
      status: 'available',
      specifications: { brightness: '3600 lumens', resolution: 'XGA (1024x768)', technology: '3LCD technology' },
      qr_code_data: 'QR-EPSONX06-019',
      image_url: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=500',
      purchase_date: new Date('2023-01-10'),
      current_condition: 'Sử dụng tốt, tuổi thọ bóng đèn còn khoảng 85%, kèm điều khiển từ xa',
      category_id: catProjector.id,
      supplier_id: supPv.id,
      location_id: locC3.id,
    },
    {
      name: 'Panasonic PT-LB386 3LCD Projector',
      serial_number: 'SN-PRJ-020',
      sku: 'SKU-PANASONIC-LB386',
      status: 'available',
      specifications: { brightness: '3800 lumens', resolution: 'XGA (1024x768)', contrast: '20000:1' },
      qr_code_data: 'QR-PANALB386-020',
      image_url: 'https://images.unsplash.com/photo-1527689368864-3a821dbccc34?w=500',
      purchase_date: new Date('2023-05-18'),
      current_condition: 'Mới 95%, cổng kết nối HDMI hơi rơ nhẹ nhưng vẫn kết nối ổn định',
      category_id: catProjector.id,
      supplier_id: supPv.id,
      location_id: locC3.id,
    },
    {
      name: 'Màn chiếu 3 chân di động Dalite 100 inch',
      serial_number: 'SN-SCR-021',
      sku: 'SKU-DALITE-100',
      status: 'available',
      specifications: { size: '100 inch (1m78 x 1m78)', gain: '1.1', format: '1:1 ratio' },
      qr_code_data: 'QR-DALITE100-021',
      image_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500',
      purchase_date: new Date('2022-12-05'),
      current_condition: 'Chân đỡ inox chắc chắn, mặt màn chiếu hơi bụi nhẹ',
      category_id: catProjector.id,
      supplier_id: supPv.id,
      location_id: locC3.id,
    },
    {
      name: 'Epson EB-2250U Full HD Projector',
      serial_number: 'SN-PRJ-022',
      sku: 'SKU-EPSON-2250U',
      status: 'in_use',
      specifications: { brightness: '5000 lumens', resolution: 'WUXGA Full HD', wireless: 'Wi-Fi built-in' },
      qr_code_data: 'QR-EPSON2250-022',
      image_url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500',
      purchase_date: new Date('2023-10-15'),
      current_condition: 'Mới 97%, chuyên dùng hội trường lớn Ptithcm',
      category_id: catProjector.id,
      supplier_id: supPv.id,
      location_id: locA1.id,
    },
    {
      name: 'Màn chiếu 3 chân Dalite 120 inch',
      serial_number: 'SN-SCR-023',
      sku: 'SKU-DALITE-120',
      status: 'available',
      specifications: { size: '120 inch (2m44 x 2m44)', gain: '1.2' },
      qr_code_data: 'QR-DALITE120-023',
      image_url: 'https://images.unsplash.com/photo-1496181130204-7552cc15f1e3?w=500',
      purchase_date: new Date('2023-01-20'),
      current_condition: 'Mới 94%, khóa chân hơi rít cần nhỏ dầu',
      category_id: catProjector.id,
      supplier_id: supPv.id,
      location_id: locC3.id,
    },
    {
      name: 'Sony VPL-DX221 XGA Projector',
      serial_number: 'SN-PRJ-024',
      sku: 'SKU-SONY-DX221',
      status: 'available',
      specifications: { brightness: '2800 lumens', resolution: 'XGA', tech: '3LCD BrightEra' },
      qr_code_data: 'QR-SONYDX221-024',
      image_url: 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=500',
      purchase_date: new Date('2022-09-10'),
      current_condition: 'Tuổi thọ bóng còn khoảng 60%, chiếu ổn định phòng học nhỏ',
      category_id: catProjector.id,
      supplier_id: supSony.id,
      location_id: locC3.id,
    },

    // --- AUDIO EQUIPMENT (8 items) ---
    {
      name: 'Rode Wireless Go II Dual Mic Kit',
      serial_number: 'SN-AUD-025',
      sku: 'SKU-RODE-WGO2',
      status: 'in_use',
      specifications: { channels: 'Dual channel receiver/transmitters', range: '200m line of sight', connection: 'USB-C & 3.5mm TRS' },
      qr_code_data: 'QR-RODEWGO2-025',
      image_url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500',
      purchase_date: new Date('2023-08-11'),
      current_condition: 'Mới 98%, đầy đủ phụ kiện đầu lọc gió và cáp nối kết nối điện thoại',
      category_id: catAudio.id,
      supplier_id: supPv.id,
      location_id: locB2.id,
    },
    {
      name: 'Rode VideoMic Pro+ Shotgun Microphone',
      serial_number: 'SN-AUD-026',
      sku: 'SKU-RODE-VMPPLUS',
      status: 'available',
      specifications: { type: 'Supercardioid Shotgun Mic', battery: 'LB-1 Rechargeable Battery', mount: 'Standard cold shoe' },
      qr_code_data: 'QR-RODEVMP-026',
      image_url: 'https://images.unsplash.com/photo-1590602846989-e20a06d30f50?w=500',
      purchase_date: new Date('2023-05-02'),
      current_condition: 'Mới 95%, thu âm định hướng tiếng trong, sạch',
      category_id: catAudio.id,
      supplier_id: supPv.id,
      location_id: locB2.id,
    },
    {
      name: 'JBL PartyBox 310 Portable Bluetooth Speaker',
      serial_number: 'SN-AUD-027',
      sku: 'SKU-JBL-PB310',
      status: 'available',
      specifications: { power: '240W RMS', battery: 'Up to 18 hours', features: 'Light show & karaoke inputs' },
      qr_code_data: 'QR-JBLPB310-027',
      image_url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500',
      purchase_date: new Date('2023-07-22'),
      current_condition: 'Loa kéo công suất lớn cho sự kiện CLB sinh viên ngoài trời, bánh xe kéo mượt',
      category_id: catAudio.id,
      supplier_id: supGearvn.id,
      location_id: locA1.id,
    },
    {
      name: 'JBL PartyBox 110 Portable Speaker',
      serial_number: 'SN-AUD-028',
      sku: 'SKU-JBL-PB110',
      status: 'available',
      specifications: { power: '160W RMS', battery: 'Up to 12 hours' },
      qr_code_data: 'QR-JBLPB110-028',
      image_url: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=500',
      purchase_date: new Date('2023-09-01'),
      current_condition: 'Mới 96%, âm bass khỏe, đèn LED hoạt động rất đẹp',
      category_id: catAudio.id,
      supplier_id: supGearvn.id,
      location_id: locA1.id,
    },
    {
      name: 'Shure SM58 Cardioid Dynamic Vocal Mic',
      serial_number: 'SN-AUD-029',
      sku: 'SKU-SHURE-SM58',
      status: 'available',
      specifications: { pattern: 'Cardioid Dynamic', connection: 'XLR', frequency: '50 to 15,000 Hz' },
      qr_code_data: 'QR-SHURESM58-029',
      image_url: 'https://images.unsplash.com/photo-1551698618-1ffdfe196404?w=500',
      purchase_date: new Date('2022-10-18'),
      current_condition: 'Bền bỉ, đầu lọc lưới thép hơi móp nhẹ không ảnh hưởng chất âm',
      category_id: catAudio.id,
      supplier_id: supPv.id,
      location_id: locA1.id,
    },
    {
      name: 'Sennheiser EW 100 G4 Wireless Handheld Mic',
      serial_number: 'SN-AUD-030',
      sku: 'SKU-SEN-EW100G4',
      status: 'available',
      specifications: { receiver: 'EM 100 G4 True Diversity', transmitter: 'SKM 100 G4-S Handheld', capsule: 'e 835 cardioid' },
      qr_code_data: 'QR-SENEW100-030',
      image_url: 'https://images.unsplash.com/photo-1563330232-57114bb0823c?w=500',
      purchase_date: new Date('2023-04-12'),
      current_condition: 'Mới 94%, thu tiếng MC cực sáng, đầy đủ củ thu và anten',
      category_id: catAudio.id,
      supplier_id: supPv.id,
      location_id: locA1.id,
    },
    {
      name: 'Behringer X Air XR18 Digital Mixer',
      serial_number: 'SN-AUD-031',
      sku: 'SKU-BEH-XR18',
      status: 'available',
      specifications: { inputs: '16 Midas Preamps XLR', control: 'Built-in Wifi router for iPad/Tablet control' },
      qr_code_data: 'QR-BEHXR18-031',
      image_url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=500',
      purchase_date: new Date('2023-10-20'),
      current_condition: 'Mới 98%, điều khiển phối âm sân khấu vô cùng chuyên nghiệp qua iPad',
      category_id: catAudio.id,
      supplier_id: supPv.id,
      location_id: locA1.id,
    },
    {
      name: 'Focusrite Scarlett 2i2 Gen 4 USB Audio Interface',
      serial_number: 'SN-AUD-032',
      sku: 'SKU-FOCUS-2I2',
      status: 'available',
      specifications: { inputs: '2 Scarlett mic preamps', connection: 'USB-C bus-powered' },
      qr_code_data: 'QR-FOCUS2I2-032',
      image_url: 'https://images.unsplash.com/photo-1583244532610-2a234e7c3eca?w=500',
      purchase_date: new Date('2024-01-08'),
      current_condition: 'Mới 99%, chuyên dụng thu âm nhạc cụ và vocal tại phòng Media CLB',
      category_id: catAudio.id,
      supplier_id: supFpt.id,
      location_id: locB2.id,
    },

    // --- NETWORKING (6 items) ---
    {
      name: 'Cisco Catalyst 2960-L 24-Port Gigabit Switch',
      serial_number: 'SN-NET-033',
      sku: 'SKU-CISCO-2960L',
      status: 'available',
      specifications: { ports: '24x 10/100/1000 Ethernet, 4x 1G SFP', management: 'CLI & Web UI managed' },
      qr_code_data: 'QR-CISCO2960-033',
      image_url: 'https://images.unsplash.com/photo-1544256718-3bcf237f3974?w=500',
      purchase_date: new Date('2022-11-20'),
      current_condition: 'Hoạt động tốt, tai rack thép chắc chắn phục vụ lắp tủ lab',
      category_id: catNetwork.id,
      supplier_id: supPv.id,
      location_id: locA1.id,
    },
    {
      name: 'MikroTik Cloud Core Router CCR2004',
      serial_number: 'SN-NET-034',
      sku: 'SKU-MIKRO-CCR2004',
      status: 'available',
      specifications: { cpu: '4-core AL32400 1.7GHz', interfaces: '12x 10G SFP+ ports, 2x 25G SFP28' },
      qr_code_data: 'QR-MIKRO2004-034',
      image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500',
      purchase_date: new Date('2023-06-25'),
      current_condition: 'Mới 95%, hiệu năng chịu tải mạng rất lớn, đang cài RouterOS v7',
      category_id: catNetwork.id,
      supplier_id: supPv.id,
      location_id: locA1.id,
    },
    {
      name: 'Aruba Instant On AP22 Access Point',
      serial_number: 'SN-NET-035',
      sku: 'SKU-ARUBA-AP22',
      status: 'available',
      specifications: { standard: 'Wi-Fi 6 (802.11ax) 2x2 MU-MIMO', speed: 'Up to 1.7 Gbps data rate' },
      qr_code_data: 'QR-ARUBAAP22-035',
      image_url: 'https://images.unsplash.com/photo-1600541519468-4a9121c6f376?w=500',
      purchase_date: new Date('2023-08-30'),
      current_condition: 'Mới 98%, hỗ trợ phát Wi-Fi tốc độ cao phòng lab CNTT',
      category_id: catNetwork.id,
      supplier_id: supFpt.id,
      location_id: locA1.id,
    },
    {
      name: 'Linksys LGS116P 16-Port PoE+ Switch',
      serial_number: 'SN-NET-036',
      sku: 'SKU-LINKSYS-116P',
      status: 'available',
      specifications: { ports: '16x Gigabit ports with 8x PoE+ ports', budget: '80W PoE budget' },
      qr_code_data: 'QR-LINK116P-036',
      image_url: 'https://images.unsplash.com/photo-1618060932014-4eb9c1fc97e6?w=500',
      purchase_date: new Date('2023-02-12'),
      current_condition: 'Sử dụng cấp nguồn camera IP, hoạt động rất ổn định',
      category_id: catNetwork.id,
      supplier_id: supPv.id,
      location_id: locA1.id,
    },
    {
      name: 'PfSense Netgate 2100 Firewall Appliance',
      serial_number: 'SN-NET-037',
      sku: 'SKU-NETGATE-2100',
      status: 'available',
      specifications: { software: 'Pre-loaded pfSense Plus', ports: '4-port Switched GbE, 1x WAN GbE' },
      qr_code_data: 'QR-NETGATE2100-037',
      image_url: 'https://images.unsplash.com/photo-1544890225-2f3faec4cd60?w=500',
      purchase_date: new Date('2023-04-05'),
      current_condition: 'Mới 96%, chuyên dùng làm tường lửa thực hành bảo mật mạng CLB',
      category_id: catNetwork.id,
      supplier_id: supPv.id,
      location_id: locA1.id,
    },
    {
      name: 'Cisco Catalyst AP9115AX Wi-Fi 6',
      serial_number: 'SN-NET-038',
      sku: 'SKU-CISCO-AP9115',
      status: 'in_use',
      specifications: { tech: 'Cisco cleanair, Wi-Fi 6', speed: 'Up to 2.4 Gbps' },
      qr_code_data: 'QR-CISCOAP9115-038',
      image_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=500',
      purchase_date: new Date('2023-11-15'),
      current_condition: 'Đang lắp cố định tại hành lang tầng 5 nhà C',
      category_id: catNetwork.id,
      supplier_id: supPv.id,
      location_id: locA1.id,
    },

    // --- STUDIO ACCESSORIES (6 items) ---
    {
      name: 'DJI Ronin SC 3-Axis Gimbal Stabilizer',
      serial_number: 'SN-ACC-039',
      sku: 'SKU-DJI-RONINSC',
      status: 'available',
      specifications: { payload: 'Supports up to 2.0 kg payload', features: 'ActiveTrack 3.0, Sport mode' },
      qr_code_data: 'QR-DJIRONIN-039',
      image_url: 'https://images.unsplash.com/photo-1584438784894-089d6a128f3e?w=500',
      purchase_date: new Date('2023-04-10'),
      current_condition: 'Mới 94%, đầy đủ tripod mini đi kèm và cáp kết nối điều khiển camera',
      category_id: catStudio.id,
      supplier_id: supFpt.id,
      location_id: locB2.id,
    },
    {
      name: 'Manfrotto 055 Carbon Fiber Tripod with 3-Way Head',
      serial_number: 'SN-ACC-040',
      sku: 'SKU-MANFROTTO-055',
      status: 'available',
      specifications: { material: 'Carbon Fiber', head: 'MHXPRO-3W 3-Way Pan/Tilt Head', capacity: 'Supports up to 9kg' },
      qr_code_data: 'QR-MANFROTTO-040',
      image_url: 'https://images.unsplash.com/photo-1513829096963-f2ed0f2095cc?w=500',
      purchase_date: new Date('2023-05-15'),
      current_condition: 'Khung sợi carbon siêu nhẹ và cứng, các khớp khóa chặt chẽ',
      category_id: catStudio.id,
      supplier_id: supPv.id,
      location_id: locB2.id,
    },
    {
      name: 'Godox SL60W LED Video Light (5600K)',
      serial_number: 'SN-ACC-041',
      sku: 'SKU-GODOX-SL60W',
      status: 'available',
      specifications: { power: '60W COB LED', temp: '5600K daylight', CRI: '95+ rating' },
      qr_code_data: 'QR-GODOX60W-041',
      image_url: 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=500',
      purchase_date: new Date('2023-03-20'),
      current_condition: 'Hoạt động tốt, quạt gió tản nhiệt êm, kèm reflector chóa đèn bowen mount',
      category_id: catStudio.id,
      supplier_id: supGearvn.id,
      location_id: locB2.id,
    },
    {
      name: 'Softbox Godox SB-UE 80cm Octagon Bowens',
      serial_number: 'SN-ACC-042',
      sku: 'SKU-GODOX-SBUE80',
      status: 'available',
      specifications: { size: 'Octagon 80cm diameter', mount: 'Bowens Speedring' },
      qr_code_data: 'QR-GODOXSOFT-042',
      image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500',
      purchase_date: new Date('2023-03-22'),
      current_condition: 'Vải dù tản sáng tốt, không rách, đầy đủ 2 lớp vải trắng tản mịn',
      category_id: catStudio.id,
      supplier_id: supGearvn.id,
      location_id: locB2.id,
    },
    {
      name: 'Đèn LED Godox VL150 Video Light (150W)',
      serial_number: 'SN-ACC-043',
      sku: 'SKU-GODOX-VL150',
      status: 'available',
      specifications: { power: '150W high output', temp: '5600K daylight' },
      qr_code_data: 'QR-GODOXVL150-043',
      image_url: 'https://images.unsplash.com/photo-1508962914676-134849a727f0?w=500',
      purchase_date: new Date('2023-11-05'),
      current_condition: 'Mới 98%, độ sáng cực lớn phục vụ quay talkshow chuyên nghiệp',
      category_id: catStudio.id,
      supplier_id: supGearvn.id,
      location_id: locB2.id,
    },
    {
      name: 'Chân đèn Inox C-Stand Kupo Master',
      serial_number: 'SN-ACC-044',
      sku: 'SKU-KUPO-CSTAND',
      status: 'available',
      specifications: { height: '3.2 meters', arm: 'Grip Arm 40 inches included' },
      qr_code_data: 'QR-KUPO-044',
      image_url: 'https://images.unsplash.com/photo-1616440347437-b1c73416efc2?w=500',
      purchase_date: new Date('2023-06-18'),
      current_condition: 'Chân thép chịu lực cực nặng, không lo đổ đèn',
      category_id: catStudio.id,
      supplier_id: supPv.id,
      location_id: locB2.id,
    },
  ];

  console.log(`🌱 Đang lưu ${equipmentData.length} thiết bị vào DB...`);
  const createdEquipment = [];
  for (const item of equipmentData) {
    const eq = await prisma.equipment.create({ data: item });
    createdEquipment.push(eq);
  }
  console.log(`✅ Đã lưu thành công ${createdEquipment.length} thiết bị.`);

  // Tìm nhanh các ID thiết bị để ánh xạ vào transactions/maintenance một cách logic
  const mbp16 = createdEquipment.find(e => e.serial_number === 'SN-LAP-001')!;
  const mbp14 = createdEquipment.find(e => e.serial_number === 'SN-LAP-002')!;
  const xps15 = createdEquipment.find(e => e.serial_number === 'SN-LAP-003')!;
  const legion5 = createdEquipment.find(e => e.serial_number === 'SN-LAP-006')!;
  const zephyrus = createdEquipment.find(e => e.serial_number === 'SN-LAP-007')!;
  const hpPavilion = createdEquipment.find(e => e.serial_number === 'SN-LAP-010')!;

  const sonya7m3 = createdEquipment.find(e => e.serial_number === 'SN-CAM-011')!;
  const sonya7m4 = createdEquipment.find(e => e.serial_number === 'SN-CAM-012')!;
  const sony2470 = createdEquipment.find(e => e.serial_number === 'SN-LEN-013')!;
  const sonyfx3 = createdEquipment.find(e => e.serial_number === 'SN-CAM-017')!;
  const sigma2470 = createdEquipment.find(e => e.serial_number === 'SN-LEN-018')!;

  const epsonEB = createdEquipment.find(e => e.serial_number === 'SN-PRJ-019')!;
  const screen100 = createdEquipment.find(e => e.serial_number === 'SN-SCR-021')!;

  const rodeMic = createdEquipment.find(e => e.serial_number === 'SN-AUD-025')!;
  const jblPb310 = createdEquipment.find(e => e.serial_number === 'SN-AUD-027')!;

  const ciscoSwitch = createdEquipment.find(e => e.serial_number === 'SN-NET-033')!;

  const djiRonin = createdEquipment.find(e => e.serial_number === 'SN-ACC-039')!;
  const godoxSL60 = createdEquipment.find(e => e.serial_number === 'SN-ACC-041')!;

  console.log('🌱 Tạo các Giao dịch mẫu (Transactions) để kiểm tra logic...');
  const now = new Date();

  // 1. Đơn mượn đang chờ duyệt (Pending)
  // Sinh viên sv1 muốn mượn Macbook Pro 16"
  await prisma.transaction.create({
    data: {
      equipment_id: mbp16.id,
      borrower_id: sv1.id,
      type: 'borrow',
      status: 'pending',
      request_date: new Date(now.getTime() - 2 * 60 * 60 * 1000), // Gửi cách đây 2 tiếng
      start_date: new Date(now.getTime() + 24 * 60 * 60 * 1000),   // Định mượn vào ngày mai
      due_date: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), // Hạn trả 3 ngày sau mượn
      notes: 'Thực hành phát triển ứng dụng di động môn học Lập trình di động',
    },
  });

  // 2. Đơn mượn đã được duyệt (Approved) nhưng chưa nhận máy vật lý
  // Sinh viên sv3 muốn mượn Sony A7III
  await prisma.transaction.create({
    data: {
      equipment_id: sonya7m3.id,
      borrower_id: sv3.id,
      approver_id: user1.id, // Được duyệt bởi Admin
      type: 'borrow',
      status: 'approved',
      request_date: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      start_date: new Date(now.getTime()), // Ngày mượn bắt đầu hôm nay
      approval_date: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      due_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      notes: 'Quay chụp talkshow ra mắt CLB Công nghệ PTIT',
    },
  });

  // 3. Giao dịch đã hoàn tất (Completed)
  // Sinh viên sv1 mượn Dell XPS 15 và đã trả đúng hạn, có đánh giá 5 sao
  await prisma.transaction.create({
    data: {
      equipment_id: xps15.id,
      borrower_id: sv1.id,
      approver_id: user1.id,
      storekeeper_id: user2.id, // Bàn giao và thu hồi bởi Thủ kho 1
      type: 'borrow',
      status: 'completed',
      request_date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      start_date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      approval_date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      due_date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      actual_check_out: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      actual_check_in: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      condition_at_check_out: 'Máy hoạt động hoàn hảo, đầy đủ sạc cáp 130W',
      condition_at_check_in: 'Máy bình thường, không trầy xước, bàn trả đủ sạc',
      notes: 'Thực hành vẽ thiết kế đồ họa 3D',
      rating: 5,
      feedback: 'Máy cấu hình rất mượt, xử lý render 3D nhanh, bàn phím gõ thoải mái.',
    },
  });

  // 4. Thiết bị đang được mượn (In Use)
  // Sinh viên sv2 mượn Sony A7IV và Lens Sony 24-70GM (2 transactions)
  await prisma.transaction.create({
    data: {
      equipment_id: mbp14.id,
      borrower_id: sv2.id,
      approver_id: user1.id,
      storekeeper_id: user2.id,
      type: 'borrow',
      status: 'completed', // Bảng MBP14 hiện tại có trạng thái "in_use", ta tạo record mượn đang In Use
      request_date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      start_date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      approval_date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      due_date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // Hạn trả tương lai
      actual_check_out: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      condition_at_check_out: 'Ngoại hình trầy nhẹ góc, hoạt động tốt',
      notes: 'Mượn lập trình đồ án tốt nghiệp',
    },
  });

  await prisma.transaction.create({
    data: {
      equipment_id: sonya7m4.id,
      borrower_id: sv2.id,
      approver_id: user1.id,
      storekeeper_id: user3.id,
      type: 'borrow',
      status: 'completed', // Cho thiết bị đang in_use
      request_date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      start_date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      approval_date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      due_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      actual_check_out: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      condition_at_check_out: 'Hoạt động bình thường, kèm thẻ nhớ 64GB',
      notes: 'Quay phóng sự ngày hội khoa CNTT',
    },
  });

  // 5. Giao dịch Bị quá hạn trả (Overdue)
  // Sinh viên sv5 mượn Legion 5 Pro nhưng đã quá hạn trả 3 ngày
  await prisma.transaction.create({
    data: {
      equipment_id: legion5.id,
      borrower_id: sv5.id,
      approver_id: user1.id,
      storekeeper_id: user2.id,
      type: 'borrow',
      status: 'overdue', // Quá hạn
      request_date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      start_date: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
      approval_date: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
      due_date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // Đáng lẽ phải trả từ 3 ngày trước
      actual_check_out: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
      condition_at_check_out: 'Máy và sạc mới tốt, không lỗi lầm',
      notes: 'Thực hành lập trình mô hình học sâu Deep Learning',
    },
  });

  // 6. Đơn mượn bị Từ chối (Rejected)
  // Sinh viên sv4 bị từ chối mượn Sony FX3 do đang có 5 điểm phạt (Penalty points) vi phạm nội quy
  await prisma.transaction.create({
    data: {
      equipment_id: sonyfx3.id,
      borrower_id: sv4.id,
      approver_id: user1.id,
      type: 'borrow',
      status: 'rejected',
      request_date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      start_date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      approval_date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      due_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      notes: 'Mượn thiết bị quay Vlog cá nhân',
      feedback: 'Đơn bị từ chối: Sinh viên đang có 5 điểm phạt quá hạn chưa xử lý. Theo quy định, quyền mượn thiết bị tạm thời bị khóa.',
    },
  });

  console.log('🌱 Tạo Lịch sử Bảo trì mẫu (Maintenance History)...');
  // 1. ASUS ROG Zephyrus G14 (đang ở trạng thái maintenance)
  await prisma.maintenanceHistory.create({
    data: {
      equipment_id: zephyrus.id,
      maintenance_date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      performed_by: 'Trung tâm Bảo hành ASUS',
      details: 'Sửa lỗi sọc màn hình, kiểm tra quạt tản nhiệt bị kêu to',
      cost: 2500000.00,
      next_maintenance_date: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000), // 6 tháng sau
    },
  });

  // 2. Sigma 24-70mm Lens (đang ở trạng thái maintenance)
  await prisma.maintenanceHistory.create({
    data: {
      equipment_id: sigma2470.id,
      maintenance_date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      performed_by: 'Bệnh viện Máy ảnh Việt Nam',
      details: 'Lau bụi thấu kính, bôi trơn vòng zoom cao su',
      cost: 650000.00,
      next_maintenance_date: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
    },
  });

  // 3. HP Pavilion (đang ở trạng thái broken)
  await prisma.maintenanceHistory.create({
    data: {
      equipment_id: hpPavilion.id,
      maintenance_date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      performed_by: 'Hanoicomputer Service',
      details: 'Thay thế bản lề thép bị gãy và hàn vỏ nhựa',
      cost: 1200000.00,
    },
  });

  console.log('🌱 Tạo các Thông báo hệ thống mẫu (Notifications)...');
  await prisma.notification.create({
    data: {
      user_id: sv5.id,
      title: 'CẢNH BÁO QUÁ HẠN TRẢ THIẾT BỊ',
      message: 'Thiết bị Lenovo Legion 5 Pro (SN-LAP-006) của bạn đã quá hạn trả từ ngày ' + new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString() + '. Vui lòng mang trả lại thiết bị ngay lập tức tại Kho A1!',
      type: 'borrow',
      is_read: false,
    },
  });

  await prisma.notification.create({
    data: {
      user_id: user1.id, // Gửi cho Admin
      title: 'ĐƠN MƯỢN MỚI CHỜ DUYỆT',
      message: 'Sinh viên Trần Văn Hoàng vừa gửi yêu cầu mượn MacBook Pro 16" M3 Pro (SN-LAP-001). Vui lòng kiểm tra và duyệt đơn mượn!',
      type: 'system',
      is_read: false,
    },
  });

  console.log('🌱 Tạo các Nhật ký hoạt động mẫu (Audit Logs)...');
  await prisma.auditLog.create({
    data: {
      user_id: user1.id,
      action: 'ADD_EQUIPMENT',
      target_type: 'Equipment',
      target_id: mbp16.id,
      details: 'Thêm mới thiết bị MacBook Pro 16" M3 Pro vào Kho A1',
    },
  });

  await prisma.auditLog.create({
    data: {
      user_id: user1.id,
      action: 'APPROVE_TRANSACTION',
      target_type: 'Transaction',
      target_id: 2,
      details: 'Phê duyệt đơn mượn Sony Alpha 7 III cho sinh viên Phạm Hoàng Nam',
    },
  });

  console.log('🎉 TOÀN BỘ TIẾN TRÌNH SEED DỮ LIỆU ĐÃ HOÀN TẤT THÀNH CÔNG!');
  console.log(`  - Users: ${await prisma.user.count()} tài khoản`);
  console.log(`  - Categories: ${await prisma.equipmentCategory.count()} nhóm`);
  console.log(`  - Suppliers: ${await prisma.supplier.count()} nhà cung cấp`);
  console.log(`  - Storage Locations: ${await prisma.storageLocation.count()} vị trí kho`);
  console.log(`  - Equipment: ${await prisma.equipment.count()} thiết bị (Mục tiêu tối thiểu 40 đã đạt: ${await prisma.equipment.count()})`);
  console.log(`  - Transactions: ${await prisma.transaction.count()} đơn giao dịch`);
  console.log(`  - Maintenance Records: ${await prisma.maintenanceHistory.count()} bản ghi bảo trì`);
  console.log(`  - System Notifications: ${await prisma.notification.count()} thông báo`);
  console.log(`  - Audit Logs: ${await prisma.auditLog.count()} nhật ký hệ thống`);
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi thực hiện seed dữ liệu mẫu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
