import { Injectable } from '@nestjs/common';
import { DocumentStatus } from '@ca-firm/shared';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CreateDocumentData,
  DocumentEntity,
  DocumentFilters,
  DocumentItem,
  DocumentRepository,
  Paginated,
  UpdateDocumentData,
} from '../domain/ports';

interface DocumentWithRelations {
  id: string;
  clientId: string;
  fiscalYearId: string;
  categoryId: string | null;
  folderId: string | null;
  title: string;
  description: string | null;
  fileKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  uploadedById: string;
  uploadedAt: Date;
  updatedAt: Date;
  client: { name: string } | null;
  category: { name: string } | null;
  fiscalYear: { label: string };
  uploadedBy: { name: string };
}

@Injectable()
export class PrismaDocumentRepository implements DocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateDocumentData): Promise<DocumentEntity> {
    const document = await this.prisma.document.create({
      data: {
        clientId: data.clientId,
        fiscalYearId: data.fiscalYearId,
        categoryId: data.categoryId ?? null,
        folderId: data.folderId ?? null,
        title: data.title,
        description: data.description ?? null,
        fileKey: data.fileKey,
        originalName: data.originalName,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        status: data.status,
        uploadedById: data.uploadedById,
      },
    });
    return this.toEntity(document);
  }

  async findById(id: string): Promise<DocumentItem | null> {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: this.itemInclude(),
    });
    if (!document) return null;
    return this.toItemWithPath(document, await this.folderPathMap([document]));
  }

  async findRawById(id: string): Promise<DocumentEntity | null> {
    const document = await this.prisma.document.findUnique({ where: { id } });
    return document ? this.toEntity(document) : null;
  }

  async findMany(filters: DocumentFilters): Promise<Paginated<DocumentItem>> {
    const where = this.buildWhere(filters);
    const [documents, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        include: this.itemInclude(),
        orderBy: { uploadedAt: 'desc' },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.document.count({ where }),
    ]);

    const pathMap = await this.folderPathMap(documents);
    return {
      items: documents.map((d) => this.toItemWithPath(d, pathMap)),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages: Math.ceil(total / filters.pageSize),
    };
  }

  async update(id: string, data: UpdateDocumentData): Promise<DocumentEntity> {
    const document = await this.prisma.document.update({
      where: { id },
      data,
    });
    return this.toEntity(document);
  }

  async remove(id: string): Promise<DocumentEntity | null> {
    try {
      const document = await this.prisma.document.delete({ where: { id } });
      return this.toEntity(document);
    } catch {
      return null;
    }
  }

  private buildWhere(filters: DocumentFilters): Record<string, unknown> {
    const where: Record<string, unknown> = {};
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.fiscalYearId) where.fiscalYearId = filters.fiscalYearId;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.folderId) where.folderId = filters.folderId;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  private itemInclude() {
    return {
      client: { select: { name: true } },
      category: { select: { name: true } },
      fiscalYear: { select: { label: true } },
      uploadedBy: { select: { name: true } },
    };
  }

  /** Builds `folderId -> "Parent / Child"` paths for the given documents. */
  private async folderPathMap(
    documents: { folderId: string | null }[],
  ): Promise<Map<string, string>> {
    const ids = [
      ...new Set(
        documents
          .map((d) => d.folderId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (ids.length === 0) return new Map();

    const all = new Map<
      string,
      { id: string; name: string; parentId: string | null }
    >();
    let frontier = [...ids];
    let guard = 0;
    while (frontier.length > 0 && guard < 50) {
      const found = await this.prisma.folder.findMany({
        where: { id: { in: frontier } },
        select: { id: true, name: true, parentId: true },
      });
      const next: string[] = [];
      for (const f of found) {
        if (all.has(f.id)) continue;
        all.set(f.id, f);
        if (f.parentId && !all.has(f.parentId)) next.push(f.parentId);
      }
      frontier = next;
      guard += 1;
    }

    const pathMap = new Map<string, string>();
    for (const id of ids) {
      const parts: string[] = [];
      let node = all.get(id) ?? null;
      let depth = 0;
      while (node && depth < 50) {
        parts.unshift(node.name);
        node = node.parentId ? (all.get(node.parentId) ?? null) : null;
        depth += 1;
      }
      if (parts.length > 0) pathMap.set(id, parts.join(' / '));
    }
    return pathMap;
  }

  private toEntity(document: {
    id: string;
    clientId: string;
    fiscalYearId: string;
    categoryId: string | null;
    folderId: string | null;
    title: string;
    description: string | null;
    fileKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    status: string;
    uploadedById: string;
    uploadedAt: Date;
    updatedAt: Date;
  }): DocumentEntity {
    return {
      id: document.id,
      clientId: document.clientId,
      fiscalYearId: document.fiscalYearId,
      categoryId: document.categoryId,
      folderId: document.folderId,
      title: document.title,
      description: document.description,
      fileKey: document.fileKey,
      originalName: document.originalName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      status: document.status as DocumentStatus,
      uploadedById: document.uploadedById,
      uploadedAt: document.uploadedAt,
      updatedAt: document.updatedAt,
    };
  }

  private toItem(
    document: DocumentWithRelations,
    pathMap: Map<string, string>,
  ): DocumentItem {
    return {
      ...this.toEntity(document),
      clientName: document.client?.name ?? '',
      categoryName: document.category?.name ?? null,
      fiscalYearLabel: document.fiscalYear.label,
      uploadedByName: document.uploadedBy.name,
      folderPath: document.folderId
        ? (pathMap.get(document.folderId) ?? null)
        : null,
    };
  }

  private toItemWithPath(
    document: DocumentWithRelations,
    pathMap: Map<string, string>,
  ): DocumentItem {
    return this.toItem(document, pathMap);
  }
}
