import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';

const dbUrl = new URL(process.env.DATABASE_URL || 'mysql://root:rootpassword@localhost:3306/btl_db');
const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: Number(dbUrl.port) || 3306,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.replace('/', ''),
  connectionLimit: 10,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const salt = await bcrypt.genSalt();

  // 1. Admin account
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@ptit.edu.vn',
      password_hash: await bcrypt.hash('admin123', salt),
      full_name: 'Quản trị viên',
      role: 'admin',
    },
  });

  // 2. Storekeeper account
  const storekeeper = await prisma.user.upsert({
    where: { username: 'storekeeper01' },
    update: {},
    create: {
      username: 'storekeeper01',
      email: 'storekeeper01@ptit.edu.vn',
      password_hash: await bcrypt.hash('store123', salt),
      full_name: 'Nguyễn Văn Kho',
      role: 'storekeeper',
    },
  });

  // 3. Borrower account
  const borrower = await prisma.user.upsert({
    where: { username: 'sinhvien01' },
    update: {},
    create: {
      username: 'sinhvien01',
      email: 'sinhvien01@ptit.edu.vn',
      password_hash: await bcrypt.hash('sv123456', salt),
      full_name: 'Trần Thị Sinh Viên',
      role: 'borrower',
    },
  });

  console.log('✅ Seeded 3 accounts:');
  console.log(`  Admin:       admin / admin123       (id=${admin.id})`);
  console.log(`  Storekeeper: storekeeper01 / store123 (id=${storekeeper.id})`);
  console.log(`  Borrower:    sinhvien01 / sv123456   (id=${borrower.id})`);

  // 4. Equipment Categories
  const categoryLaptop = await prisma.equipmentCategory.upsert({
    where: { name: 'Laptop' },
    update: {},
    create: {
      name: 'Laptop',
      description: 'Máy tính xách tay dùng cho học tập, giảng dạy',
    },
  });

  const categoryProjector = await prisma.equipmentCategory.upsert({
    where: { name: 'Máy chiếu' },
    update: {},
    create: {
      name: 'Máy chiếu',
      description: 'Máy chiếu dùng cho các phòng học và phòng hội thảo',
    },
  });

  const categoryCamera = await prisma.equipmentCategory.upsert({
    where: { name: 'Máy ảnh' },
    update: {},
    create: {
      name: 'Máy ảnh',
      description: 'Máy ảnh chụp hình, quay phim và thực hành truyền thông',
    },
  });

  const categoryMicrophone = await prisma.equipmentCategory.upsert({
    where: { name: 'Microphone' },
    update: {},
    create: {
      name: 'Microphone',
      description: 'Microphone thu âm, micro không dây giảng dạy',
    },
  });

  // 5. Suppliers
  let supplierDell = await prisma.supplier.findFirst({ where: { name: 'Dell Vietnam' } });
  if (!supplierDell) {
    supplierDell = await prisma.supplier.create({
      data: {
        name: 'Dell Vietnam',
        contact_info: 'sales@dell.com.vn',
        address: 'Quận 1, TP. HCM',
      },
    });
  }

  let supplierSony = await prisma.supplier.findFirst({ where: { name: 'Sony Vietnam' } });
  if (!supplierSony) {
    supplierSony = await prisma.supplier.create({
      data: {
        name: 'Sony Vietnam',
        contact_info: 'info@sony.com.vn',
        address: 'Quận 3, TP. HCM',
      },
    });
  }

  let supplierPhongVu = await prisma.supplier.findFirst({ where: { name: 'Phong Vũ Computer' } });
  if (!supplierPhongVu) {
    supplierPhongVu = await prisma.supplier.create({
      data: {
        name: 'Phong Vũ Computer',
        contact_info: 'hotline@phongvu.vn',
        address: 'Phố Thái Hà, Đống Đa, Hà Nội',
      },
    });
  }

  // 6. Storage Locations
  let locationA1 = await prisma.storageLocation.findFirst({ where: { name: 'Kho Thiết Bị A1' } });
  if (!locationA1) {
    locationA1 = await prisma.storageLocation.create({
      data: {
        name: 'Kho Thiết Bị A1',
        address: 'Phòng 101, Tòa nhà A1, Học viện Công nghệ Bưu chính Viễn thông',
      },
    });
  }

  let locationB2 = await prisma.storageLocation.findFirst({ where: { name: 'Kho Thiết Bị B2' } });
  if (!locationB2) {
    locationB2 = await prisma.storageLocation.create({
      data: {
        name: 'Kho Thiết Bị B2',
        address: 'Phòng 204, Tòa nhà B2, Học viện Công nghệ Bưu chính Viễn thông',
      },
    });
  }

  let locationLab = await prisma.storageLocation.findFirst({ where: { name: 'Phòng Lab Công Nghệ' } });
  if (!locationLab) {
    locationLab = await prisma.storageLocation.create({
      data: {
        name: 'Phòng Lab Công Nghệ',
        address: 'Phòng 402, Tòa nhà A2, Học viện Công nghệ Bưu chính Viễn thông',
      },
    });
  }

  // 7. Equipments
  const equipmentData = [
    {
      name: 'Laptop Dell Latitude 5420',
      serial_number: 'LPT-DELL-5420-001',
      sku: 'SKU-LPT-DELL-5420-001',
      category_id: categoryLaptop.id,
      supplier_id: supplierDell.id,
      location_id: locationA1.id,
      status: 'available',
      specifications: { cpu: 'Core i5-1135G7', ram: '16GB DDR4', ssd: '256GB NVMe', screen: '14" FHD' },
      qr_code_data: 'QR-LPT-DELL-5420-001',
      image_url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      current_condition: 'Mới 98%, hoạt động tốt',
      purchase_date: new Date('2025-01-15'),
    },
    {
      name: 'Laptop Dell Latitude 5420',
      serial_number: 'LPT-DELL-5420-002',
      sku: 'SKU-LPT-DELL-5420-002',
      category_id: categoryLaptop.id,
      supplier_id: supplierDell.id,
      location_id: locationA1.id,
      status: 'available',
      specifications: { cpu: 'Core i5-1135G7', ram: '16GB DDR4', ssd: '256GB NVMe', screen: '14" FHD' },
      qr_code_data: 'QR-LPT-DELL-5420-002',
      image_url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      current_condition: 'Mới 95%, vỏ ngoài hơi xước nhẹ',
      purchase_date: new Date('2025-01-15'),
    },
    {
      name: 'Máy Chiếu Sony VPL-DX221',
      serial_number: 'PRJ-SONY-DX221-001',
      sku: 'SKU-PRJ-SONY-DX221-001',
      category_id: categoryProjector.id,
      supplier_id: supplierSony.id,
      location_id: locationA1.id,
      status: 'available',
      specifications: { resolution: 'XGA (1024x768)', brightness: '2800 Ansi Lumens', ratio: '4:3' },
      qr_code_data: 'QR-PRJ-SONY-DX221-001',
      image_url: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      current_condition: 'Đèn chiếu tốt, đầy đủ phụ kiện cáp HDMI, điều khiển',
      purchase_date: new Date('2024-05-10'),
    },
    {
      name: 'Máy Chiếu Sony VPL-DX221',
      serial_number: 'PRJ-SONY-DX221-002',
      sku: 'SKU-PRJ-SONY-DX221-002',
      category_id: categoryProjector.id,
      supplier_id: supplierSony.id,
      location_id: locationB2.id,
      status: 'available',
      specifications: { resolution: 'XGA (1024x768)', brightness: '2800 Ansi Lumens', ratio: '4:3' },
      qr_code_data: 'QR-PRJ-SONY-DX221-002',
      image_url: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      current_condition: 'Bóng chiếu hơi mờ, hoạt động bình thường',
      purchase_date: new Date('2024-05-10'),
    },
    {
      name: 'Máy ảnh Canon EOS 80D',
      serial_number: 'CAM-CANON-80D-001',
      sku: 'SKU-CAM-CANON-80D-001',
      category_id: categoryCamera.id,
      supplier_id: supplierPhongVu.id,
      location_id: locationLab.id,
      status: 'available',
      specifications: { sensor: 'APS-C CMOS 24.2MP', lens: 'Kit 18-135mm IS USM', video: 'Full HD 60fps' },
      qr_code_data: 'QR-CAM-CANON-80D-001',
      image_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      current_condition: 'Kèm thẻ nhớ 64GB, 2 pin sạc đầy đủ, hoạt động hoàn hảo',
      purchase_date: new Date('2024-11-20'),
    },
    {
      name: 'Micro không dây Rode Wireless GO II',
      serial_number: 'MIC-RODE-WGO2-001',
      sku: 'SKU-MIC-RODE-WGO2-001',
      category_id: categoryMicrophone.id,
      supplier_id: supplierPhongVu.id,
      location_id: locationB2.id,
      status: 'available',
      specifications: { type: 'Dual Channel Wireless Mic', range: '200m line of sight', battery: 'Up to 7 hours' },
      qr_code_data: 'QR-MIC-RODE-WGO2-001',
      image_url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      current_condition: 'Đầy đủ phụ kiện dây cáp Type-C, bông lọc gió',
      purchase_date: new Date('2025-02-10'),
    },
  ];

  for (const eq of equipmentData) {
    await prisma.equipment.upsert({
      where: { serial_number: eq.serial_number },
      update: {},
      create: eq,
    });
  }

  console.log(`✅ Seeded ${equipmentData.length} equipment items.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
