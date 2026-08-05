import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  AdminOverview,
  CategoryCount,
  ClientOverview,
  DashboardRepository,
  FiscalYearCount,
  RecentUpload,
} from '../domain/ports';

@Injectable()
export class PrismaDashboardRepository implements DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async adminOverview(): Promise<AdminOverview> {
    const [
      totalClients,
      totalDocuments,
      storage,
      documentsThisMonth,
      newClientsThisMonth,
      activeFiscalYear,
    ] = await Promise.all([
      this.prisma.client.count({ where: { isActive: true } }),
      this.prisma.document.count(),
      this.prisma.document.aggregate({ _sum: { sizeBytes: true } }),
      this.prisma.document.count({
        where: { uploadedAt: { gte: this.firstOfMonth() } },
      }),
      this.prisma.client.count({
        where: { createdAt: { gte: this.firstOfMonth() } },
      }),
      this.prisma.fiscalYear.findFirst({ where: { isActive: true } }),
    ]);

    const [byFiscalYear, byCategory, recentUploads] = await Promise.all([
      this.countByFiscalYear(),
      this.countByCategory(),
      this.recentUploads(),
    ]);

    return {
      totalClients,
      totalDocuments,
      storageUsedBytes: storage._sum.sizeBytes ?? 0,
      documentsThisMonth,
      newClientsThisMonth,
      activeFiscalYearLabel: activeFiscalYear?.label ?? null,
      documentsByFiscalYear: byFiscalYear,
      documentsByCategory: byCategory,
      recentUploads,
    };
  }

  async clientOverview(clientId: string): Promise<ClientOverview> {
    const where = { clientId };
    const [
      totalDocuments,
      storage,
      documentsThisMonth,
      byCategory,
      recentUploads,
    ] = await Promise.all([
      this.prisma.document.count({ where }),
      this.prisma.document.aggregate({ where, _sum: { sizeBytes: true } }),
      this.prisma.document.count({
        where: { ...where, uploadedAt: { gte: this.firstOfMonth() } },
      }),
      this.countByCategory(clientId),
      this.recentUploads(clientId),
    ]);

    return {
      totalDocuments,
      documentsThisMonth,
      storageUsedBytes: storage._sum.sizeBytes ?? 0,
      documentsByCategory: byCategory,
      recentUploads,
    };
  }

  private async countByFiscalYear(): Promise<FiscalYearCount[]> {
    const [grouped, years] = await Promise.all([
      this.prisma.document.groupBy({
        by: ['fiscalYearId'],
        _count: { _all: true },
      }),
      this.prisma.fiscalYear.findMany(),
    ]);
    const labelById = new Map(years.map((y) => [y.id, y.label]));
    return grouped
      .map((g) => ({
        fiscalYearId: g.fiscalYearId,
        label: labelById.get(g.fiscalYearId) ?? 'Unknown',
        count: g._count._all,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private async countByCategory(clientId?: string): Promise<CategoryCount[]> {
    const grouped = await this.prisma.document.groupBy({
      by: ['categoryId'],
      where: clientId ? { clientId } : undefined,
      _count: { _all: true },
    });
    const categories = await this.prisma.documentCategory.findMany();
    const nameById = new Map(categories.map((c) => [c.id, c.name]));
    return grouped.map((g) => ({
      categoryId: g.categoryId,
      name: g.categoryId
        ? (nameById.get(g.categoryId) ?? null)
        : 'Uncategorized',
      count: g._count._all,
    }));
  }

  private async recentUploads(clientId?: string): Promise<RecentUpload[]> {
    const rows = await this.prisma.document.findMany({
      where: clientId ? { clientId } : undefined,
      include: { client: { select: { name: true } } },
      orderBy: { uploadedAt: 'desc' },
      take: 10,
    });
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      clientName: row.client.name,
      sizeBytes: row.sizeBytes,
      status: row.status,
      uploadedAt: row.uploadedAt,
    }));
  }

  private firstOfMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}
