export interface DocumentCategoryEntity {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

export interface CreateCategoryData {
  name: string;
  slug: string;
}

export type UpdateCategoryData = Partial<
  Pick<DocumentCategoryEntity, 'name' | 'slug'>
>;

export interface DocumentCategoryRepository {
  create(data: CreateCategoryData): Promise<DocumentCategoryEntity>;
  findAll(): Promise<DocumentCategoryEntity[]>;
  findById(id: string): Promise<DocumentCategoryEntity | null>;
  findBySlug(slug: string): Promise<DocumentCategoryEntity | null>;
  update(id: string, data: UpdateCategoryData): Promise<DocumentCategoryEntity>;
  remove(id: string): Promise<void>;
}

export const DOCUMENT_CATEGORY_REPOSITORY = Symbol(
  'DOCUMENT_CATEGORY_REPOSITORY',
);
