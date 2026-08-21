import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthUser } from '../../../common/auth/auth-user.interface';
import { Roles } from '../../../common/auth/roles.decorator';
import {
  MediaService,
  imageFileFilter,
} from '../../../common/media/media.service';
import { ClientsService } from '../application/clients.service';
import { ClientEntity } from '../domain/ports';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

const MAX_LOGO_SIZE = 2 * 1024 * 1024;

@ApiTags('clients')
@Controller('clients')
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly media: MediaService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the client record for the current user' })
  async me(@CurrentUser() user: AuthUser): Promise<ClientEntity> {
    if (user.role !== ROLES.CLIENT || !user.clientId) {
      throw new ForbiddenException('No linked client record');
    }
    const client = await this.clientsService.findById(user.clientId);
    if (!client) {
      throw new NotFoundException('Client record not found');
    }
    return client;
  }

  @Get()
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'List all clients (admin)' })
  findAll(): Promise<ClientEntity[]> {
    return this.clientsService.findAll();
  }

  @Get(':id')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Get a client (admin)' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ClientEntity> {
    return this.clientsService.findById(id);
  }

  @Post()
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Create a client (admin)' })
  create(@Body() dto: CreateClientDto): Promise<ClientEntity> {
    return this.clientsService.create(dto);
  }

  @Patch(':id')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Update a client (admin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
  ): Promise<ClientEntity> {
    return this.clientsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Delete a client (admin)' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.clientsService.remove(id);
  }

  @Post(':id/logo')
  @Roles(ROLES.ADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a client logo (admin)' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_LOGO_SIZE },
      fileFilter: imageFileFilter,
    }),
  )
  async uploadLogo(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<{ logoKey: string }> {
    if (!file) {
      throw new NotFoundException('No image file uploaded');
    }
    const key = await this.media.saveImage('logo', file);
    const saved = await this.clientsService.setLogo(id, key);
    return { logoKey: saved.logoKey ?? key };
  }

  @Get(':id/logo')
  @ApiOperation({ summary: 'Get a client logo image' })
  async getLogo(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const key = await this.clientsService.getLogoKey(id);
    if (!key) {
      throw new NotFoundException('No logo set');
    }
    const { stream, mimeType } = await this.media.read(key);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return new StreamableFile(stream);
  }
}
