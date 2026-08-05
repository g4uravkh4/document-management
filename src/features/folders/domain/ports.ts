export interface FolderEntity {
  id: string;
  name: string;
  clientId: string;
  fiscalYearId: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FolderNode extends FolderEntity {
  children: FolderNode[];
}

export interface CreateFolderData {
  name: string;
  clientId: string;
  fiscalYearId: string;
  parentId?: string | null;
}

export type UpdateFolderData = Partial<Pick<FolderEntity, 'name'>>;

export interface FolderRepository {
  create(data: CreateFolderData): Promise<FolderEntity>;
  findById(id: string): Promise<FolderEntity | null>;
  findMany(clientId: string, fiscalYearId: string): Promise<FolderEntity[]>;
  findSibling(
    clientId: string,
    fiscalYearId: string,
    parentId: string | null,
    name: string,
    exceptId?: string,
  ): Promise<FolderEntity | null>;
  update(id: string, data: UpdateFolderData): Promise<FolderEntity>;
  remove(id: string): Promise<FolderEntity | null>;
}

export const FOLDER_REPOSITORY = Symbol('FOLDER_REPOSITORY');
