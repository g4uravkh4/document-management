import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { HealthModule } from './features/health/health.module';
import { AuthModule } from './features/auth/auth.module';
import { UsersModule } from './features/users/users.module';
import { ClientsModule } from './features/clients/clients.module';
import { FiscalYearsModule } from './features/fiscal-years/fiscal-years.module';
import { DocumentCategoriesModule } from './features/document-categories/document-categories.module';
import { DocumentsModule } from './features/documents/documents.module';
import { FoldersModule } from './features/folders/folders.module';
import { SettingsModule } from './features/settings/settings.module';
import { DashboardModule } from './features/dashboard/dashboard.module';
import { MediaModule } from './common/media/media.module';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { RolesGuard } from './common/auth/roles.guard';
import { StorageModule } from './common/storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    FiscalYearsModule,
    DocumentCategoriesModule,
    DocumentsModule,
    FoldersModule,
    SettingsModule,
    DashboardModule,
    MediaModule,
    StorageModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
