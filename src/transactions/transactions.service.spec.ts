import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: PrismaService;
  let notifications: NotificationsService;
  let cloudinary: CloudinaryService;

  const mockPrisma = {
    transaction: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    equipment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrisma)),
    $queryRaw: jest.fn(),
  };

  const mockNotifications = {
    createNotification: jest.fn(),
  };

  const mockCloudinary = {
    uploadFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: CloudinaryService, useValue: mockCloudinary },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    prisma = module.get<PrismaService>(PrismaService);
    notifications = module.get<NotificationsService>(NotificationsService);
    cloudinary = module.get<CloudinaryService>(CloudinaryService);

    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-13T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createBorrowRequest', () => {
    it('should throw NotFoundException if equipment does not exist', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);
      
      await expect(service.createBorrowRequest(1, { equipment_id: 1, start_date: new Date().toISOString(), due_date: new Date().toISOString() }))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if equipment is broken', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ id: 1, status: 'broken' }]);
      
      await expect(service.createBorrowRequest(1, { equipment_id: 1, start_date: new Date().toISOString(), due_date: new Date().toISOString() }))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if dates overlap', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ id: 1, status: 'available' }]);
      mockPrisma.transaction.findFirst.mockResolvedValue({ id: 2 }); // Overlapping tx
      
      const startDate = new Date();
      const dueDate = new Date(startDate.getTime() + 3600000);

      await expect(service.createBorrowRequest(1, { equipment_id: 1, start_date: startDate.toISOString(), due_date: dueDate.toISOString() }))
        .rejects.toThrow(BadRequestException);
    });

    it('should create a borrow request if valid', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ id: 1, status: 'available' }]);
      mockPrisma.transaction.findFirst.mockResolvedValue(null);
      mockPrisma.transaction.create.mockResolvedValue({ id: 10 });

      const startDate = new Date();
      const dueDate = new Date(startDate.getTime() + 3600000);

      const result = await service.createBorrowRequest(1, { 
        equipment_id: 1, 
        start_date: startDate.toISOString(), 
        due_date: dueDate.toISOString(),
        notes: 'Test'
      });

      expect(result).toEqual({ id: 10 });
      expect(mockPrisma.transaction.create).toHaveBeenCalled();
    });
  });

  describe('checkIn', () => {
    it('should handle damage detection and penalty points', async () => {
      const now = new Date('2026-05-13T10:00:00Z');
      const mockTx = {
        id: 1,
        borrower_id: 2,
        equipment_id: 3,
        status: 'active',
        due_date: new Date(now.getTime() - 86400000 * 2), // Exactly 2 days overdue
        equipment: { id: 3, qr_code_data: 'valid_qr' }
      };

      mockPrisma.transaction.findUnique.mockResolvedValue(mockTx);
      mockPrisma.transaction.update.mockResolvedValue({ ...mockTx, status: 'completed' });
      mockPrisma.user.update.mockResolvedValue({ id: 2, penalty_points: 120, is_active: true });

      await service.checkIn(1, 1, { qr_code_data: 'valid_qr', condition: 'Thiết bị bị hỏng màn hình' });

      // Check maintenance status
      expect(mockPrisma.equipment.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 3 },
        data: { status: 'maintenance' }
      }));

      // Check penalty points increment
      expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 2 },
        data: { penalty_points: { increment: 20 } } // 2 days * 10
      }));

      // Check auto-deactivation since points >= 100
      expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 2 },
        data: { is_active: false }
      }));

      // Check notification
      expect(mockNotifications.createNotification).toHaveBeenCalledWith(
        2,
        'Tài khoản bị tạm khóa',
        expect.any(String),
        'system'
      );
    });
  });
});
