import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CreateCategoryData,
  DocumentCategoryEntity,
  DocumentCategoryRepository,
  UpdateCategoryData,
} from '../domain/ports';

@Injectable()
export class PrismaDocumentCategoryRepository implements DocumentCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCategoryData): Promise<DocumentCategoryEntity> {
    const category = await this.prisma.documentCategory.create({ data });
    return this.toEntity(category);
  }

  async findAll(): Promise<DocumentCategoryEntity[]> {
    const categories = await this.prisma.documentCategory.findMany({
      orderBy: { name: 'asc' },
    });
    return categories.map((c) => this.toEntity(c));
  }

  async findById(id: string): Promise<DocumentCategoryEntity | null> {
    const category = await this.prisma.documentCategory.findUnique({
      where: { id },
    });
    return category ? this.toEntity(category) : null;
  }

  async findBySlug(slug: string): Promise<DocumentCategoryEntity | null> {
    const category = await this.prisma.documentCategory.findUnique({
      where: { slug },
    });
    return category ? this.toEntity(category) : null;
  }

  async update(
    id: string,
    data: UpdateCategoryData,
  ): Promise<DocumentCategoryEntity> {
    const category = await this.prisma.documentCategory.update({
      where: { id },
      data,
    });
    return this.toEntity(category);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.documentCategory.delete({ where: { id } });
  }

  private toEntity(category: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
  }): DocumentCategoryEntity {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      createdAt: category.createdAt,
    };
  }
}
