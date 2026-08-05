import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentStatus, ROLES } from '@ca-firm/shared';
import type { Readable } from 'stream';
import { AuthUser } from '../../../common/auth/auth-user.interface';
import { CLIENT_REPOSITORY } from '../../clients/domain/ports';
import type { ClientRepository } from '../../clients/domain/ports';
import { DOCUMENT_CATEGORY_REPOSITORY } from '../../document-categories/domain/ports';
import type { DocumentCategoryRepository } from '../../document-categories/domain/ports';
import { FISCAL_YEAR_REPOSITORY } from '../../fiscal-years/domain/ports';
import type { FiscalYearRepository } from '../../fiscal-years/domain/ports';
import { FOLDER_REPOSITORY } from '../../folders/domain/ports';
import type { FolderRepository } from '../../folders/domain/ports';
import {
  DOCUMENT_REPOSITORY,
  DocumentEntity,
  DocumentItem,
  DocumentFilters,
  FILE_STORAGE,
  Paginated,
  UpdateDocumentData,
} from '../domain/ports';
import type { DocumentRepository, FileStorage } from '../domain/ports';
import { CreateDocumentDto } from '../presentation/dto/create-document.dto';
import { QueryDocumentsDto } from '../presentation/dto/query-documents.dto';
import { UpdateDocumentDto } from '../presentation/dto/update-document.dto';

export interface DownloadResult {
  stream: Readable;
  mimeType: string;
  filename: string;
  sizeBytes: number;
}

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documents: DocumentRepository,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
    @Inject(FISCAL_YEAR_REPOSITORY)
    private readonly fiscalYears: FiscalYearRepository,
    @Inject(DOCUMENT_CATEGORY_REPOSITORY)
    private readonly categories: DocumentCategoryRepository,
    @Inject(FOLDER_REPOSITORY) private readonly folders: FolderRepository,
  ) {}

  async upload(
    user: AuthUser,
    file: Express.Multer.File | undefined,
    dto: CreateDocumentDto,
  ): Promise<DocumentItem> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const clientId =
      user.role === ROLES.ADMIN ? (dto.clientId ?? '') : (user.clientId ?? '');
    if (!clientId) {
      throw new BadRequestException(
        'A client must be associated with the document',
      );
    }

    await this.ensureClientExists(clientId);
    await this.ensureFiscalYearExists(dto.fiscalYearId);
    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }
    if (dto.folderId) {
      await this.ensureFolderMatches(dto.folderId, clientId, dto.fiscalYearId);
    }

    const status: DocumentStatus =
      user.role === ROLES.ADMIN && dto.status ? dto.status : 'PENDING';

    const created = await this.documents.create({
      clientId,
      fiscalYearId: dto.fiscalYearId,
      categoryId: dto.categoryId ?? null,
      folderId: dto.folderId ?? null,
      title: dto.title,
      description: dto.description ?? null,
      fileKey: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      status,
      uploadedById: user.sub,
    });

    const item = await this.documents.findById(created.id);
    if (!item) {
      throw new NotFoundException('Uploaded document could not be read back');
    }
    return item;
  }

  async list(
    user: AuthUser,
    query: QueryDocumentsDto,
  ): Promise<Paginated<DocumentItem>> {
    const filters: DocumentFilters = {
      fiscalYearId: query.fiscalYearId ?? null,
      categoryId: query.categoryId ?? null,
      folderId: null,
      search: query.search ?? null,
      page: query.page ?? 1,
      pageSize: Math.min(query.pageSize ?? 20, 100),
      clientId:
        user.role === ROLES.ADMIN
          ? (query.clientId ?? null)
          : (user.clientId ?? null),
    };
    const clientId = filters.clientId ?? '';
    if (query.folderId) {
      await this.ensureFolderMatches(
        query.folderId,
        clientId,
        filters.fiscalYearId ?? '',
      );
      filters.folderId = query.folderId;
    }
    return this.documents.findMany(filters);
  }

  async detail(user: AuthUser, id: string): Promise<DocumentItem> {
    const item = await this.documents.findById(id);
    if (!item) {
      throw new NotFoundException('Document not found');
    }
    this.assertCanAccess(user, item);
    return item;
  }

  async download(user: AuthUser, id: string): Promise<DownloadResult> {
    const item = await this.detail(user, id);
    return {
      stream: this.storage.readStream(item.fileKey),
      mimeType: item.mimeType,
      filename: this.sanitizeFilename(item.originalName),
      sizeBytes: item.sizeBytes,
    };
  }

  async update(
    user: AuthUser,
    id: string,
    dto: UpdateDocumentDto,
  ): Promise<DocumentEntity> {
    const existing = await this.documents.findRawById(id);
    if (!existing) {
      throw new NotFoundException('Document not found');
    }
    this.assertCanAccess(user, existing);

    const data: UpdateDocumentData = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;

    let scopeClientId = existing.clientId;
    let scopeFiscalYearId = existing.fiscalYearId;

    if (user.role === ROLES.ADMIN) {
      if (dto.status !== undefined) data.status = dto.status;
      if (dto.clientId !== undefined) {
        await this.ensureClientExists(dto.clientId);
        data.clientId = dto.clientId;
        scopeClientId = dto.clientId;
      }
      if (dto.fiscalYearId !== undefined) {
        await this.ensureFiscalYearExists(dto.fiscalYearId);
        data.fiscalYearId = dto.fiscalYearId;
        scopeFiscalYearId = dto.fiscalYearId;
      }
    }

    if (dto.folderId !== undefined) {
      if (dto.folderId === '') {
        data.folderId = null;
      } else {
        await this.ensureFolderMatches(
          dto.folderId,
          scopeClientId,
          scopeFiscalYearId,
        );
        data.folderId = dto.folderId;
      }
    } else if (data.clientId !== undefined || data.fiscalYearId !== undefined) {
      // Scope changed without an explicit folder: drop the folder if it no
      // longer belongs to the new client/fiscal year.
      if (
        existing.folderId &&
        (await this.folderMatchesScope(
          existing.folderId,
          scopeClientId,
          scopeFiscalYearId,
        )) === false
      ) {
        data.folderId = null;
      }
    }

    return this.documents.update(id, data);
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    const existing = await this.documents.findRawById(id);
    if (!existing) {
      throw new NotFoundException('Document not found');
    }
    this.assertCanAccess(user, existing);

    const removed = await this.documents.remove(id);
    if (removed) {
      await this.storage.remove(removed.fileKey);
    }
  }

  private assertCanAccess(user: AuthUser, item: { clientId: string }): void {
    if (user.role === ROLES.ADMIN) {
      return;
    }
    if (item.clientId !== user.clientId) {
      throw new ForbiddenException('Access denied');
    }
  }

  private async ensureClientExists(clientId: string): Promise<void> {
    const client = await this.clients.findById(clientId);
    if (!client) {
      throw new BadRequestException('Client does not exist');
    }
  }

  private async ensureFiscalYearExists(fiscalYearId: string): Promise<void> {
    const year = await this.fiscalYears.findById(fiscalYearId);
    if (!year) {
      throw new BadRequestException('Fiscal year does not exist');
    }
  }

  private async ensureCategoryExists(categoryId: string): Promise<void> {
    const category = await this.categories.findById(categoryId);
    if (!category) {
      throw new BadRequestException('Category does not exist');
    }
  }

  private async ensureFolderMatches(
    folderId: string,
    clientId: string,
    fiscalYearId: string,
  ): Promise<void> {
    const folder = await this.folders.findById(folderId);
    if (!folder) {
      throw new BadRequestException('Folder does not exist');
    }
    if (clientId && folder.clientId !== clientId) {
      throw new BadRequestException(
        'Folder does not belong to the selected client',
      );
    }
    if (fiscalYearId && folder.fiscalYearId !== fiscalYearId) {
      throw new BadRequestException(
        'Folder does not belong to the selected fiscal year',
      );
    }
  }

  private async folderMatchesScope(
    folderId: string,
    clientId: string,
    fiscalYearId: string,
  ): Promise<boolean> {
    const folder = await this.folders.findById(folderId);
    if (!folder) return false;
    if (clientId && folder.clientId !== clientId) return false;
    if (fiscalYearId && folder.fiscalYearId !== fiscalYearId) return false;
    return true;
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/["\\/]/g, '_').replace(/[^\x20-\x7E]/g, '_');
  }
}
