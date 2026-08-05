import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CreateFolderData,
  FolderEntity,
  FolderRepository,
  UpdateFolderData,
} from '../domain/ports';

@Injectable()
export class PrismaFolderRepository implements FolderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateFolderData): Promise<FolderEntity> {
    const folder = await this.prisma.folder.create({
      data: {
        name: data.name,
        clientId: data.clientId,
        fiscalYearId: data.fiscalYearId,
        parentId: data.parentId ?? null,
      },
    });
    return this.toEntity(folder);
  }

  async findById(id: string): Promise<FolderEntity | null> {
    const folder = await this.prisma.folder.findUnique({ where: { id } });
    return folder ? this.toEntity(folder) : null;
  }

  async findMany(
    clientId: string,
    fiscalYearId: string,
  ): Promise<FolderEntity[]> {
    const folders = await this.prisma.folder.findMany({
      where: { clientId, fiscalYearId },
      orderBy: { name: 'asc' },
    });
    return folders.map((f) => this.toEntity(f));
  }

  async findSibling(
    clientId: string,
    fiscalYearId: string,
    parentId: string | null,
    name: string,
    exceptId?: string,
  ): Promise<FolderEntity | null> {
    const folder = await this.prisma.folder.findFirst({
      where: {
        clientId,
        fiscalYearId,
        parentId,
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
    });
    return folder ? this.toEntity(folder) : null;
  }

  async update(id: string, data: UpdateFolderData): Promise<FolderEntity> {
    const folder = await this.prisma.folder.update({ where: { id }, data });
    return this.toEntity(folder);
  }

  async remove(id: string): Promise<FolderEntity | null> {
    try {
      const folder = await this.prisma.folder.delete({ where: { id } });
      return this.toEntity(folder);
    } catch {
      return null;
    }
  }

  private toEntity(folder: {
    id: string;
    name: string;
    clientId: string;
    fiscalYearId: string;
    parentId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): FolderEntity {
    return {
      id: folder.id,
      name: folder.name,
      clientId: folder.clientId,
      fiscalYearId: folder.fiscalYearId,
      parentId: folder.parentId,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    };
  }
}
