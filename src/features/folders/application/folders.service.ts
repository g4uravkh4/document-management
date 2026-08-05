import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ROLES } from '@ca-firm/shared';
import type { AuthUser } from '../../../common/auth/auth-user.interface';
import { CLIENT_REPOSITORY } from '../../clients/domain/ports';
import type { ClientRepository } from '../../clients/domain/ports';
import { FISCAL_YEAR_REPOSITORY } from '../../fiscal-years/domain/ports';
import type { FiscalYearRepository } from '../../fiscal-years/domain/ports';
import { FOLDER_REPOSITORY, FolderEntity, FolderNode } from '../domain/ports';
import type { FolderRepository } from '../domain/ports';
import { CreateFolderDto } from '../presentation/dto/create-folder.dto';
import { QueryFoldersDto } from '../presentation/dto/query-folders.dto';
import { UpdateFolderDto } from '../presentation/dto/update-folder.dto';

@Injectable()
export class FoldersService {
  constructor(
    @Inject(FOLDER_REPOSITORY) private readonly folders: FolderRepository,
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
    @Inject(FISCAL_YEAR_REPOSITORY)
    private readonly fiscalYears: FiscalYearRepository,
  ) {}

  async create(user: AuthUser, dto: CreateFolderDto): Promise<FolderEntity> {
    const clientId =
      user.role === ROLES.ADMIN ? (dto.clientId ?? '') : (user.clientId ?? '');
    if (!clientId) {
      throw new BadRequestException('A client must be specified');
    }
    await this.ensureClientExists(clientId);
    await this.ensureFiscalYearExists(dto.fiscalYearId);

    if (dto.parentId) {
      const parent = await this.getFolderOrThrow(dto.parentId);
      if (
        parent.clientId !== clientId ||
        parent.fiscalYearId !== dto.fiscalYearId
      ) {
        throw new BadRequestException(
          'Parent folder must belong to the same client and fiscal year',
        );
      }
    }

    await this.assertSiblingAvailable(
      clientId,
      dto.fiscalYearId,
      dto.parentId ?? null,
      dto.name,
    );

    return this.folders.create({
      name: dto.name,
      clientId,
      fiscalYearId: dto.fiscalYearId,
      parentId: dto.parentId ?? null,
    });
  }

  async list(user: AuthUser, query: QueryFoldersDto): Promise<FolderNode[]> {
    if (!query.fiscalYearId) {
      throw new BadRequestException('fiscalYearId is required');
    }
    const clientId =
      user.role === ROLES.ADMIN
        ? (query.clientId ?? '')
        : (user.clientId ?? '');
    if (!clientId) {
      throw new BadRequestException('A client must be specified');
    }

    const folders = await this.folders.findMany(clientId, query.fiscalYearId);
    return this.buildTree(folders);
  }

  async rename(
    user: AuthUser,
    id: string,
    dto: UpdateFolderDto,
  ): Promise<FolderEntity> {
    if (dto.name === undefined) {
      throw new BadRequestException('A folder name is required');
    }
    const folder = await this.getFolderOrThrow(id);
    this.assertCanManage(user, folder);

    await this.assertSiblingAvailable(
      folder.clientId,
      folder.fiscalYearId,
      folder.parentId,
      dto.name,
      id,
    );

    return this.folders.update(id, { name: dto.name });
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    const folder = await this.getFolderOrThrow(id);
    this.assertCanManage(user, folder);
    const removed = await this.folders.remove(id);
    if (!removed) {
      throw new NotFoundException('Folder not found');
    }
  }

  private async getFolderOrThrow(id: string): Promise<FolderEntity> {
    const folder = await this.folders.findById(id);
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
    return folder;
  }

  private assertCanManage(user: AuthUser, folder: FolderEntity): void {
    if (user.role === ROLES.ADMIN) {
      return;
    }
    if (folder.clientId !== user.clientId) {
      throw new ForbiddenException('Access denied');
    }
  }

  private async assertSiblingAvailable(
    clientId: string,
    fiscalYearId: string,
    parentId: string | null,
    name: string,
    exceptId?: string,
  ): Promise<void> {
    const sibling = await this.folders.findSibling(
      clientId,
      fiscalYearId,
      parentId,
      name,
      exceptId,
    );
    if (sibling) {
      throw new ConflictException(
        'A folder with this name already exists here',
      );
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

  private buildTree(folders: FolderEntity[]): FolderNode[] {
    const map = new Map<string, FolderNode>();
    for (const folder of folders) {
      map.set(folder.id, { ...folder, children: [] });
    }
    const roots: FolderNode[] = [];
    for (const folder of folders) {
      const node = map.get(folder.id)!;
      if (folder.parentId && map.has(folder.parentId)) {
        map.get(folder.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    const sort = (nodes: FolderNode[]): FolderNode[] => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach((n) => sort(n.children));
      return nodes;
    };
    return sort(roots);
  }
}
