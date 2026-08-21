import type { Readable } from 'stream';
import type { DocumentStatus } from '@ca-firm/shared';

export interface DocumentEntity {
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
  status: DocumentStatus;
  uploadedById: string;
  uploadedAt: Date;
  updatedAt: Date;
}

export interface DocumentItem extends DocumentEntity {
  clientName: string;
  categoryName: string | null;
  fiscalYearLabel: string;
  uploadedByName: string;
  /** Breadcrumb of folder names, e.g. "VAT / Returns". */
  folderPath: string | null;
}

export interface CreateDocumentData {
  clientId: string;
  fiscalYearId: string;
  categoryId?: string | null;
  folderId?: string | null;
  title: string;
  description?: string | null;
  fileKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  uploadedById: string;
}

export type UpdateDocumentData = Partial<
  Pick<
    DocumentEntity,
    | 'title'
    | 'description'
    | 'categoryId'
    | 'status'
    | 'clientId'
    | 'fiscalYearId'
    | 'folderId'
  >
>;

export interface DocumentFilters {
  clientId?: string | null;
  fiscalYearId?: string | null;
  categoryId?: string | null;
  folderId?: string | null;
  search?: string | null;
  page: number;
  pageSize: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DocumentRepository {
  create(data: CreateDocumentData): Promise<DocumentEntity>;
  findById(id: string): Promise<DocumentItem | null>;
  findMany(filters: DocumentFilters): Promise<Paginated<DocumentItem>>;
  update(id: string, data: UpdateDocumentData): Promise<DocumentEntity>;
  findRawById(id: string): Promise<DocumentEntity | null>;
  remove(id: string): Promise<DocumentEntity | null>;
}

export interface FileStorage {
  save(key: string, data: Buffer, contentType: string): Promise<void>;
  readStream(key: string): Promise<Readable>;
  remove(key: string): Promise<void>;
}

export const DOCUMENT_REPOSITORY = Symbol('DOCUMENT_REPOSITORY');
export const FILE_STORAGE = Symbol('FILE_STORAGE');
