import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: PrismaService;

  const mockPrisma = {
    equipmentCategory: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all categories', async () => {
      const mockCats = [{ id: 1, name: 'IT Devices' }];
      mockPrisma.equipmentCategory.findMany.mockResolvedValue(mockCats);

      const result = await service.findAll();
      expect(result).toEqual(mockCats);
      expect(mockPrisma.equipmentCategory.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a category if found', async () => {
      const mockCat = { id: 1, name: 'IT Devices' };
      mockPrisma.equipmentCategory.findUnique.mockResolvedValue(mockCat);

      const result = await service.findOne(1);
      expect(result).toEqual(mockCat);
      expect(mockPrisma.equipmentCategory.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { _count: { select: { equipment: true } } },
      });
    });

    it('should throw NotFoundException if category not found', async () => {
      mockPrisma.equipmentCategory.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new category', async () => {
      const dto = { name: 'Lab Equip', description: 'Lab items' };
      const created = { id: 2, ...dto };
      mockPrisma.equipmentCategory.create.mockResolvedValue(created);

      const result = await service.create(dto);
      expect(result).toEqual(created);
      expect(mockPrisma.equipmentCategory.create).toHaveBeenCalledWith({ data: dto });
    });
  });

  describe('update', () => {
    it('should update the category if found', async () => {
      const mockCat = { id: 1, name: 'IT Devices' };
      const dto = { name: 'IT Gadgets' };
      mockPrisma.equipmentCategory.findUnique.mockResolvedValue(mockCat);
      mockPrisma.equipmentCategory.update.mockResolvedValue({ id: 1, name: 'IT Gadgets' });

      const result = await service.update(1, dto);
      expect(result).toEqual({ id: 1, name: 'IT Gadgets' });
      expect(mockPrisma.equipmentCategory.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: dto,
      });
    });
  });

  describe('remove', () => {
    it('should delete the category if found', async () => {
      const mockCat = { id: 1, name: 'IT Devices' };
      mockPrisma.equipmentCategory.findUnique.mockResolvedValue(mockCat);
      mockPrisma.equipmentCategory.delete.mockResolvedValue(mockCat);

      const result = await service.remove(1);
      expect(result).toEqual(mockCat);
      expect(mockPrisma.equipmentCategory.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });
});
