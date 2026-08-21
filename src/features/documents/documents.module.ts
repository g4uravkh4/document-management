import { Module } from '@nestjs/common';
import { StorageModule } from '../../common/storage/storage.module';
import { ClientsModule } from '../clients/clients.module';
import { DocumentCategoriesModule } from '../document-categories/document-categories.module';
import { FiscalYearsModule } from '../fiscal-years/fiscal-years.module';
import { FoldersModule } from '../folders/folders.module';
import { DocumentsService } from './application/documents.service';
import { DocumentsController } from './presentation/documents.controller';
import { PrismaDocumentRepository } from './infrastructure/prisma-document.repository';
import { StorageService } from '../../common/storage/storage.service';
import { DOCUMENT_REPOSITORY, FILE_STORAGE } from './domain/ports';

@Module({
  imports: [
    StorageModule,
    ClientsModule,
    FiscalYearsModule,
    DocumentCategoriesModule,
    FoldersModule,
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    { provide: DOCUMENT_REPOSITORY, useClass: PrismaDocumentRepository },
    { provide: FILE_STORAGE, useExisting: StorageService },
  ],
  exports: [DocumentsService, DOCUMENT_REPOSITORY],
})
export class DocumentsModule {}
