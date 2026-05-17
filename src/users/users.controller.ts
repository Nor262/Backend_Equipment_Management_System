import { Controller, Get, Patch, Param, Body, UseGuards, Request, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserRoleDto, DeactivateUserDto } from './users.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@ApiTags('Users Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  @Roles('admin')
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Roles('admin')
  @Patch(':id/role')
  updateRole(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.usersService.updateRole(+id, dto.role, req.user.id);
  }

  @Roles('admin')
  @Patch(':id/status')
  setActiveStatus(@Request() req: any, @Param('id') id: string, @Body() dto: DeactivateUserDto) {
    return this.usersService.setActiveStatus(+id, dto.is_active, req.user.id);
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async uploadAvatar(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    const result = await this.cloudinaryService.uploadFile(file);
    const updatedUser = await this.usersService.updateProfile(req.user.id, { avatar_url: result.secure_url });
    return {
      message: 'Avatar uploaded successfully',
      avatar_url: result.secure_url,
      user: updatedUser
    };
  }
}
