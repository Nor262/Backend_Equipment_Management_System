import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService
  ) { }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findOneByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findOneByIdentifier(identifier: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier }
        ]
      }
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  // ===== Admin Management Methods =====

  async createAdminUser(data: any, adminId: number) {
    const existingEmail = await this.findOneByEmail(data.email);
    if (existingEmail) throw new ConflictException('Email already in use');

    const existingUsername = await this.findOneByUsername(data.username);
    if (existingUsername) throw new ConflictException('Username already in use');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const newUser = await this.prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        full_name: data.full_name,
        role: data.role || 'borrower',
        password_hash: passwordHash,
      },
      select: { id: true, username: true, email: true, full_name: true, role: true, is_active: true, created_at: true },
    });

    await this.auditService.logAction(
      adminId,
      'CREATE_USER',
      'User',
      newUser.id,
      `Admin created a new user: ${newUser.username} (${newUser.role})`
    );

    return newUser;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        full_name: true,
        phone: true,
        role: true,
        is_active: true,
        created_at: true,
        student_id: true,
        class: true,
        department: true,
        avatar_url: true,
        penalty_points: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async updateRole(id: number, role: string, adminId: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, username: true, email: true, role: true, is_active: true },
    });

    await this.auditService.logAction(
      adminId,
      'UPDATE_ROLE',
      'User',
      id,
      `Changed role from ${user.role} to ${role}`
    );

    return updated;
  }

  async updateAdminUser(id: number, data: { full_name?: string; email?: string; role?: string; is_active?: boolean }, adminId: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        full_name: data.full_name,
        email: data.email,
        role: data.role,
        is_active: data.is_active !== undefined ? data.is_active : undefined,
      },
      select: { id: true, username: true, email: true, full_name: true, role: true, is_active: true },
    });

    await this.auditService.logAction(
      adminId,
      'UPDATE_USER',
      'User',
      id,
      `Admin updated user details: ${JSON.stringify(data)}`
    );

    return updated;
  }

  async setActiveStatus(id: number, is_active: boolean, adminId: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { is_active },
      select: { id: true, username: true, email: true, role: true, is_active: true },
    });

    await this.auditService.logAction(
      adminId,
      'UPDATE_STATUS',
      'User',
      id,
      `Changed active status to ${is_active}`
    );

    return updated;
  }

  async updateProfile(id: number, data: { full_name?: string; fcm_token?: string; phone?: string; avatar_url?: string; email_notifications_enabled?: boolean; student_id?: string; class?: string; department?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: { 
        id: true, 
        username: true, 
        email: true, 
        full_name: true, 
        role: true, 
        phone: true, 
        avatar_url: true, 
        email_notifications_enabled: true,
        student_id: true,
        class: true,
        department: true,
        penalty_points: true,
        created_at: true
      },
    });
  }

  async updatePassword(id: number, newPasswordHash: string) {
    return this.prisma.user.update({
      where: { id },
      data: { 
        password_hash: newPasswordHash,
        otp: null,
        otp_expires_at: null
      },
    });
  }

  async updateOtp(id: number, otp: string, expiresAt: Date) {
    return this.prisma.user.update({
      where: { id },
      data: {
        otp,
        otp_expires_at: expiresAt,
      },
    });
  }

  // ===== OTP Management =====

  async saveOtp(email: string, otp: string, expires: Date) {
    return this.prisma.user.update({
      where: { email },
      data: { reset_otp: otp, reset_otp_expires: expires }
    });
  }

  async verifyOtp(email: string, otp: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.reset_otp || !user.reset_otp_expires) return false;

    if (user.reset_otp !== otp) return false;
    if (new Date() > user.reset_otp_expires) return false;

    // Xóa OTP sau khi dùng
    await this.prisma.user.update({
      where: { email },
      data: { reset_otp: null, reset_otp_expires: null }
    });

    return true;
  }
}
