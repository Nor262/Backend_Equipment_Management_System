import { IsInt, IsString, IsOptional, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({ example: 101 })
  @IsInt()
  equipment_id!: number;

  @ApiProperty({ example: '2026-05-15T08:00:00Z' })
  @IsDateString()
  start_date!: string;

  @ApiProperty({ example: '2026-05-17T17:00:00Z' })
  @IsDateString()
  due_date!: string;

  @ApiProperty({ example: 'Mượn đi quay sự kiện chào tân sinh viên', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReviewTransactionDto {
  @ApiProperty({ example: 'approved', enum: ['approved', 'rejected'] })
  @IsString()
  status!: string;

  @ApiProperty({ example: 'Thiết bị không còn trong kho', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CheckInOutDto {
  @ApiProperty({ example: 'data:image/png;base64,...' })
  @IsString()
  qr_code_data!: string;

  @ApiProperty({ example: 'Tình trạng tốt, không hư hỏng', required: false })
  @IsString()
  @IsOptional()
  condition?: string;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  @IsOptional()
  image?: any;
}

export class VerifyItemDto {
  @ApiProperty({ example: 'MBP-2023-001' })
  @IsString()
  serial_number!: string;
}

export class RatingDto {
  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ example: 'Máy dùng tốt, pin lâu', required: false })
  @IsString()
  @IsOptional()
  feedback?: string;
}

export class ExtendBookingDto {
  @ApiProperty({ example: '2023-12-01T10:00:00.000Z' })
  @IsDateString()
  new_due_date!: string;
}
