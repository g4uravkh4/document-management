import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { FiscalYearsModule } from '../fiscal-years/fiscal-years.module';
import { FoldersService } from './application/folders.service';
import { FoldersController } from './presentation/folders.controller';
import { PrismaFolderRepository } from './infrastructure/prisma-folder.repository';
import { FOLDER_REPOSITORY } from './domain/ports';

@Module({
  imports: [ClientsModule, FiscalYearsModule],
  controllers: [FoldersController],
  providers: [
    FoldersService,
    { provide: FOLDER_REPOSITORY, useClass: PrismaFolderRepository },
  ],
  exports: [FoldersService, FOLDER_REPOSITORY],
})
export class FoldersModule {}
