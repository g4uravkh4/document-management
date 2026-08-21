import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { ROLES } from '@ca-firm/shared';
import { Roles } from '../../../common/auth/roles.decorator';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthUser } from '../../../common/auth/auth-user.interface';
import {
  MediaService,
  imageFileFilter,
} from '../../../common/media/media.service';
import { UsersService } from '../application/users.service';
import { PublicUser } from '../domain/ports';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly media: MediaService,
  ) {}

  @Get()
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'List all users (admin)' })
  findAll(): Promise<PublicUser[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Get a user (admin)' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PublicUser> {
    return this.usersService.findById(id);
  }

  @Post()
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Create a user account (admin)' })
  create(@Body() dto: CreateUserDto): Promise<PublicUser> {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Update a user (admin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<PublicUser> {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Delete a user (admin)' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.usersService.remove(id);
  }

  @Post(':id/avatar')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a user avatar (admin or self)' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_SIZE },
      fileFilter: imageFileFilter,
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<{ avatarKey: string }> {
    if (!file) {
      throw new NotFoundException('No image file uploaded');
    }
    const key = await this.media.saveImage('avatar', file);
    const saved = await this.usersService.setAvatar(user, id, key);
    return { avatarKey: saved.avatarKey ?? key };
  }

  @Get(':id/avatar')
  @ApiOperation({ summary: 'Get a user avatar image (admin or self)' })
  async getAvatar(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const key = await this.usersService.getAvatarKey(user, id);
    if (!key) {
      throw new NotFoundException('No avatar set');
    }
    const { stream, mimeType } = await this.media.read(key);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return new StreamableFile(stream);
  }
}
