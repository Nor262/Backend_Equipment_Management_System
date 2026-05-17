import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterDto, ForgotPasswordDto, ResetPasswordDto } from './auth.dto';
import { UpdateProfileDto, ChangePasswordDto } from '../users/users.dto';
import { MailService } from '../mail/mail.service';
import { OAuth2Client } from 'google-auth-library';

//login google
interface GooglePayload {
  email: string;
  name: string;
  picture?: string;
}

@Injectable()
export class AuthService {

  private googleClient;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  async validateUser(identifier: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByIdentifier(identifier);
    if (user && await bcrypt.compare(pass, user.password_hash)) {
      const { password_hash, ...result } = user;
      return result;
    }
    return null;
  }

  // function add google token
  async validateGoogleUser(idToken: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedException();
      }

      const googleUser: GooglePayload = {
        email: payload.email,
        name: payload.name || '',
        picture: payload.picture,
      };

      let user = await this.usersService.findOneByEmail(googleUser.email);

      if (!user) {

        const baseUsername = googleUser.email.split('@')[0];
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const uniqueUsername = `${baseUsername}${randomSuffix}`;

        const randomPassword = Math.random().toString(36).slice(-16);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        user = await this.usersService.create({
          email: googleUser.email,
          username: uniqueUsername,
          password_hash: hashedPassword,
          full_name: googleUser.name,
          role: 'borrower',
        });
      }

      const jwtPayload = { sub: user.id, email: user.email, role: user.role };

      return {
        access_token: this.jwtService.sign(jwtPayload),
        user,
      };
    } catch (error) {
      throw new UnauthorizedException();
    }
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.identifier, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Wrong Email or Password');
    }
    if (!user.is_active) {
      throw new UnauthorizedException('Account is deactivated. Contact admin.');
    }
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      user,
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.is_active) {
        throw new UnauthorizedException('User not found or deactivated');
      }
      const newPayload = { email: user.email, sub: user.id, role: user.role };
      return {
        accessToken: this.jwtService.sign(newPayload),
        refreshToken: this.jwtService.sign(newPayload, { expiresIn: '7d' }),
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async register(registerDto: RegisterDto) {
    const existingEmail = await this.usersService.findOneByEmail(registerDto.email);
    if (existingEmail) {
      throw new BadRequestException('Email already exists');
    }

    const existingUsername = await this.usersService.findOneByUsername(registerDto.username);
    if (existingUsername) {
      throw new BadRequestException('Username already exists');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);

    const user = await this.usersService.create({
      email: registerDto.email,
      username: registerDto.username,
      full_name: registerDto.full_name,
      phone: registerDto.phone,
      password_hash: hashedPassword,
      role: 'borrower',
    });

    const { password_hash, ...result } = user;
    return result;
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findOneByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('Email not found');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 5);

    await this.usersService.saveOtp(user.email, otp, expires);
    await this.mailService.sendPasswordResetOtp(user.email, otp);

    return { message: 'OTP sent to email successfully' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const isValid = await this.usersService.verifyOtp(dto.email, dto.otp);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const user = await this.usersService.findOneByEmail(dto.email);
    const salt = await bcrypt.genSalt();
    const newHash = await bcrypt.hash(dto.new_password, salt);
    await this.usersService.updatePassword(user!.id, newHash);

    return { message: 'Password reset successfully' };
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const isMatch = await bcrypt.compare(dto.old_password, user.password_hash);
    if (!isMatch) throw new BadRequestException('Old password is incorrect');

    const salt = await bcrypt.genSalt();
    const newHash = await bcrypt.hash(dto.new_password, salt);
    await this.usersService.updatePassword(userId, newHash);

    return { message: 'Password changed successfully' };
  }
}
