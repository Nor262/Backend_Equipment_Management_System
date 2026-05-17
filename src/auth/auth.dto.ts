import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com / admin' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'newuser' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Nguyen Van B' })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty({ example: '0987654321' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  otp: string;

  @ApiProperty({ example: 'newpassword123', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  new_password: string;
}
