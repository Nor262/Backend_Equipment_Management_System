import { IsInt, IsArray, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LogInventoryDto {
  @ApiProperty({ example: 10 })
  @IsInt()
  @IsNotEmpty()
  total_items!: number;

  @ApiProperty({ example: 8 })
  @IsInt()
  @IsNotEmpty()
  matched_count!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  missing_count!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  skipped_count!: number;

  @ApiProperty({ example: [2], type: [Number], required: false })
  @IsArray()
  @IsOptional()
  missing_item_ids?: number[];
}
