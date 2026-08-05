import { Module } from '@nestjs/common';
import { DocumentCategoriesService } from './application/document-categories.service';
import { DocumentCategoriesController } from './presentation/document-categories.controller';
import { PrismaDocumentCategoryRepository } from './infrastructure/prisma-document-category.repository';
import { DOCUMENT_CATEGORY_REPOSITORY } from './domain/ports';

@Module({
  controllers: [DocumentCategoriesController],
  providers: [
    DocumentCategoriesService,
    {
      provide: DOCUMENT_CATEGORY_REPOSITORY,
      useClass: PrismaDocumentCategoryRepository,
    },
  ],
  exports: [DocumentCategoriesService, DOCUMENT_CATEGORY_REPOSITORY],
})
export class DocumentCategoriesModule {}
