import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: PrismaService;

  const mockPrisma = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('logAction', () => {
    it('should create an audit log entry', async () => {
      const mockLog = {
        id: 1,
        user_id: 2,
        action: 'UPDATE_EQUIPMENT',
        target_type: 'equipment',
        target_id: 42,
        details: 'Updated serial number',
        created_at: new Date(),
      };
      mockPrisma.auditLog.create.mockResolvedValue(mockLog);

      const result = await service.logAction(2, 'UPDATE_EQUIPMENT', 'equipment', 42, 'Updated serial number');
      expect(result).toEqual(mockLog);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          user_id: 2,
          action: 'UPDATE_EQUIPMENT',
          target_type: 'equipment',
          target_id: 42,
          details: 'Updated serial number',
        },
      });
    });
  });

  describe('getLogs', () => {
    it('should return all audit logs ordered by creation date descending', async () => {
      const mockLogs = [
        { id: 2, action: 'CREATE_EQUIPMENT', created_at: new Date() },
        { id: 1, action: 'LOGIN', created_at: new Date(Date.now() - 1000) },
      ];
      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getLogs();
      expect(result).toEqual(mockLogs);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        orderBy: { created_at: 'desc' },
        include: { user: { select: { id: true, username: true, role: true } } },
      });
    });
  });
});
