import { Module } from '@nestjs/common';
import { FiscalYearsService } from './application/fiscal-years.service';
import { FiscalYearsController } from './presentation/fiscal-years.controller';
import { PrismaFiscalYearRepository } from './infrastructure/prisma-fiscal-year.repository';
import { FISCAL_YEAR_REPOSITORY } from './domain/ports';

@Module({
  controllers: [FiscalYearsController],
  providers: [
    FiscalYearsService,
    { provide: FISCAL_YEAR_REPOSITORY, useClass: PrismaFiscalYearRepository },
  ],
  exports: [FiscalYearsService, FISCAL_YEAR_REPOSITORY],
})
export class FiscalYearsModule {}
