import { Controller, Post, Body, Get, Param, Patch, Put, UseGuards, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto, ReviewTransactionDto, CheckInOutDto, RatingDto, VerifyItemDto, ExtendBookingDto } from './transactions.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Roles('borrower', 'admin')
  @Post('borrow')
  createBorrowRequest(@Request() req: any, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.createBorrowRequest(req.user.id, dto);
  }

  @Roles('admin')
  @Put(':id/review')
  reviewRequest(@Request() req: any, @Param('id') id: string, @Body() dto: ReviewTransactionDto) {
    return this.transactionsService.reviewRequest(+id, req.user.id, dto);
  }

  @Roles('storekeeper', 'admin')
  @Put(':id/checkout')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  checkOut(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CheckInOutDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.transactionsService.checkOut(+id, req.user.id, dto, file);
  }

  @Roles('storekeeper', 'admin')
  @Put(':id/checkin')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  checkIn(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CheckInOutDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.transactionsService.checkIn(+id, req.user.id, dto, file);
  }

  @Roles('storekeeper', 'admin')
  @Post('verify-item')
  verifyItem(@Body() dto: VerifyItemDto) {
    return this.transactionsService.verifyItem(dto.serial_number);
  }

  @Patch(':id/extend')
  extendBooking(@Request() req: any, @Param('id') id: string, @Body() dto: ExtendBookingDto) {
    return this.transactionsService.extendBooking(+id, req.user.id, dto);
  }

  @Patch(':id/rate')
  rateTransaction(@Request() req: any, @Param('id') id: string, @Body() dto: RatingDto) {
    return this.transactionsService.rateTransaction(+id, req.user.id, dto);
  }

  @Roles('admin', 'storekeeper')
  @Get()
  findAll() {
    return this.transactionsService.findAll();
  }

  @Get('my')
  findMyTransactions(@Request() req: any) {
    return this.transactionsService.findMyTransactions(req.user.id);
  }

  @Get('equipment/:id')
  findByEquipment(@Param('id') id: string) {
    return this.transactionsService.findByEquipment(+id);
  }
}

