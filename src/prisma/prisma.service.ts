import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const dbUrl = new URL(process.env.DATABASE_URL || 'mysql://root:rootpassword@localhost:3306/btl_db');
    
    // Hỗ trợ tự động cấu hình kết nối SSL cho Aiven Cloud Database khi có tham số sslcert
    const sslcert = dbUrl.searchParams.get('sslcert');
    let sslOptions = undefined;

    if (sslcert) {
      try {
        // Tìm chứng chỉ CA trong thư mục prisma/ hoặc thư mục gốc
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
    });
    super({ adapter });
  }
}

