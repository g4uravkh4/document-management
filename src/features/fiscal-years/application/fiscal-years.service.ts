import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import {
  FISCAL_YEAR_REPOSITORY,
  FiscalYearEntity,
  UpdateFiscalYearData,
} from '../domain/ports';
import type { FiscalYearRepository } from '../domain/ports';
import { CreateFiscalYearDto } from '../presentation/dto/create-fiscal-year.dto';
import { UpdateFiscalYearDto } from '../presentation/dto/update-fiscal-year.dto';

@Injectable()
export class FiscalYearsService {
  constructor(
    @Inject(FISCAL_YEAR_REPOSITORY)
    private readonly fiscalYears: FiscalYearRepository,
  ) {}

  async create(dto: CreateFiscalYearDto): Promise<FiscalYearEntity> {
    const startDate = this.parseDate(dto.startDate);
    const endDate = this.parseDate(dto.endDate);
    this.assertValidRange(startDate, endDate);
    await this.assertLabelAvailable(dto.label);

    if (dto.isActive) {
      await this.deactivateAll();
    }

    return this.fiscalYears.create({
      label: dto.label,
      startDate,
      endDate,
      isActive: dto.isActive ?? false,
    });
  }

  async findAll(): Promise<FiscalYearEntity[]> {
    return this.fiscalYears.findAll();
  }

  async current(): Promise<FiscalYearEntity> {
    const active = await this.fiscalYears.findActive();
    if (!active) {
      throw new NotFoundException('No active fiscal year set');
    }
    return active;
  }

  async findById(id: string): Promise<FiscalYearEntity> {
    return this.getOrThrow(id);
  }

  async update(
    id: string,
    dto: UpdateFiscalYearDto,
  ): Promise<FiscalYearEntity> {
    await this.getOrThrow(id);
    if (dto.label !== undefined) {
      await this.assertLabelAvailable(dto.label, id);
    }

    const data: UpdateFiscalYearData = {};
    if (dto.label !== undefined) data.label = dto.label;
    if (dto.startDate !== undefined) {
      data.startDate = this.parseDate(dto.startDate);
    }
    if (dto.endDate !== undefined) {
      data.endDate = this.parseDate(dto.endDate);
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
      if (dto.isActive) {
        await this.deactivateAll();
      }
    }

    const startDate = data.startDate ?? (await this.getOrThrow(id)).startDate;
    const endDate = data.endDate ?? (await this.getOrThrow(id)).endDate;
    this.assertValidRange(startDate, endDate);

    return this.fiscalYears.update(id, data);
  }

  async remove(id: string): Promise<void> {
    await this.getOrThrow(id);
    try {
      await this.fiscalYears.remove(id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Cannot delete a fiscal year that has documents',
        );
      }
      throw error;
    }
  }

  private async getOrThrow(id: string): Promise<FiscalYearEntity> {
    const fy = await this.fiscalYears.findById(id);
    if (!fy) {
      throw new NotFoundException('Fiscal year not found');
    }
    return fy;
  }

  private async assertLabelAvailable(
    label: string,
    exceptId?: string,
  ): Promise<void> {
    const existing = await this.fiscalYears.findByLabel(label);
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Fiscal year label already exists');
    }
  }

  private async deactivateAll(): Promise<void> {
    const years = await this.fiscalYears.findAll();
    for (const year of years) {
      if (year.isActive) {
        await this.fiscalYears.update(year.id, { isActive: false });
      }
    }
  }

  private assertValidRange(startDate: Date, endDate: Date): void {
    if (endDate <= startDate) {
      throw new BadRequestException('endDate must be after startDate');
    }
  }

  private parseDate(iso: string): Date {
    return new Date(`${iso}T00:00:00.000Z`);
  }
}
