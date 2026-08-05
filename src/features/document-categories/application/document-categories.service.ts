import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import {
  DOCUMENT_CATEGORY_REPOSITORY,
  DocumentCategoryEntity,
  UpdateCategoryData,
} from '../domain/ports';
import type { DocumentCategoryRepository } from '../domain/ports';
import { CreateCategoryDto } from '../presentation/dto/create-category.dto';
import { UpdateCategoryDto } from '../presentation/dto/update-category.dto';

@Injectable()
export class DocumentCategoriesService {
  constructor(
    @Inject(DOCUMENT_CATEGORY_REPOSITORY)
    private readonly categories: DocumentCategoryRepository,
  ) {}

  async create(dto: CreateCategoryDto): Promise<DocumentCategoryEntity> {
    const slug = this.slugify(dto.name);
    const existing = await this.categories.findBySlug(slug);
    if (existing) {
      throw new ConflictException('Category name already exists');
    }
    return this.categories.create({ name: dto.name, slug });
  }

  async findAll(): Promise<DocumentCategoryEntity[]> {
    return this.categories.findAll();
  }

  async findById(id: string): Promise<DocumentCategoryEntity> {
    const category = await this.categories.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<DocumentCategoryEntity> {
    await this.findById(id);
    const data: UpdateCategoryData = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
      data.slug = this.slugify(dto.name);
      const existing = await this.categories.findBySlug(data.slug);
      if (existing && existing.id !== id) {
        throw new ConflictException('Category name already exists');
      }
    }
    return this.categories.update(id, data);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    try {
      await this.categories.remove(id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Cannot delete a category that has documents',
        );
      }
      throw error;
    }
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
