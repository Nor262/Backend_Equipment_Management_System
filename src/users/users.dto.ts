import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserRoleDto {
  @ApiProperty({ example: 'storekeeper', enum: ['admin', 'storekeeper', 'borrower'] })
  @IsString()
  @IsIn(['admin', 'storekeeper', 'borrower'])
  role!: string;
}

export class DeactivateUserDto {
  @ApiProperty({ example: false, description: 'Set false to lock account' })
  @IsBoolean()
  is_active!: boolean;
}

export class UpdateProfileDto {
  @ApiProperty({ example: 'Nguyễn Văn B', required: false })
  @IsString()
  @IsOptional()
  full_name?: string;

  @ApiProperty({ example: '0987654321', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'https://cloudinary...', required: false })
  @IsString()
  @IsOptional()
  avatar_url?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  email_notifications_enabled?: boolean;

  @ApiProperty({ example: 'fcm_token_from_firebase_sdk', required: false })
  @IsString()
  @IsOptional()
  fcm_token?: string;

  @ApiProperty({ example: '0123456789', required: false })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'oldpassword123' })
  @IsString()
  old_password!: string;

  @ApiProperty({ example: 'newpassword456' })
  @IsString()
  new_password!: string;
}
