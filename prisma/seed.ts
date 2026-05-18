import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';

import * as fs from 'fs';
import * as path from 'path';

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
