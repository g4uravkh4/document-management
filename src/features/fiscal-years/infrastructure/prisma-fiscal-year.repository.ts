import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CreateFiscalYearData,
  FiscalYearEntity,
  FiscalYearRepository,
  UpdateFiscalYearData,
} from '../domain/ports';

@Injectable()
export class PrismaFiscalYearRepository implements FiscalYearRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateFiscalYearData): Promise<FiscalYearEntity> {
    const fy = await this.prisma.fiscalYear.create({ data });
    return this.toEntity(fy);
  }

  async findAll(): Promise<FiscalYearEntity[]> {
    const years = await this.prisma.fiscalYear.findMany({
      orderBy: { startDate: 'desc' },
    });
    return years.map((y) => this.toEntity(y));
  }

  async findById(id: string): Promise<FiscalYearEntity | null> {
    const fy = await this.prisma.fiscalYear.findUnique({ where: { id } });
    return fy ? this.toEntity(fy) : null;
  }

  async findByLabel(label: string): Promise<FiscalYearEntity | null> {
    const fy = await this.prisma.fiscalYear.findUnique({ where: { label } });
    return fy ? this.toEntity(fy) : null;
  }

  async findActive(): Promise<FiscalYearEntity | null> {
    const fy = await this.prisma.fiscalYear.findFirst({
      where: { isActive: true },
    });
    return fy ? this.toEntity(fy) : null;
  }

  async update(
    id: string,
    data: UpdateFiscalYearData,
  ): Promise<FiscalYearEntity> {
    const fy = await this.prisma.fiscalYear.update({ where: { id }, data });
    return this.toEntity(fy);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.fiscalYear.delete({ where: { id } });
  }

  private toEntity(fy: {
    id: string;
    label: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): FiscalYearEntity {
    return {
      id: fy.id,
      label: fy.label,
      startDate: fy.startDate,
      endDate: fy.endDate,
      isActive: fy.isActive,
      createdAt: fy.createdAt,
      updatedAt: fy.updatedAt,
    };
  }
}
