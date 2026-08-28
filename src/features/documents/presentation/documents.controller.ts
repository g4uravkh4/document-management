import { memoryStorage } from 'multer';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthUser } from '../../../common/auth/auth-user.interface';
import {
  DocumentsService,
  DownloadResult,
} from '../application/documents.service';
import { DocumentEntity, DocumentItem, Paginated } from '../domain/ports';
import { CreateDocumentDto } from './dto/create-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'image/jpeg',
  'image/png',
  'application/zip',
]);

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List documents with filters and pagination' })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryDocumentsDto,
  ): Promise<Paginated<DocumentItem>> {
    return this.documentsService.list(user, query);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download a document file' })
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const result: DownloadResult = await this.documentsService.download(
      user,
      id,
    );
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Length', String(result.sizeBytes));
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
    );
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
    return new StreamableFile(result.stream);
  }

  @Get(':id/view')
  @ApiOperation({ summary: 'View a document inline in browser' })
  async view(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const result: DownloadResult = await this.documentsService.download(
      user,
      id,
    );
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Length', String(result.sizeBytes));
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${result.filename}"; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
    );
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    return new StreamableFile(result.stream);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document' })
  detail(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DocumentItem> {
    return this.documentsService.detail(user, id);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        cb(null, ALLOWED_MIME_TYPES.has(file.mimetype));
      },
    }),
  )
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateDocumentDto,
  ): Promise<DocumentItem> {
    return this.documentsService.upload(user, file, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a document' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
  ): Promise<DocumentEntity> {
    return this.documentsService.update(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.documentsService.remove(user, id);
  }
}
