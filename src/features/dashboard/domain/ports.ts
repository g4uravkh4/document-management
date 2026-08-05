import { DocumentStatus } from '@ca-firm/shared';

export interface CategoryCount {
  categoryId: string | null;
  name: string | null;
  count: number;
}

export interface FiscalYearCount {
  fiscalYearId: string;
  label: string;
  count: number;
}

export interface RecentUpload {
  id: string;
  title: string;
  clientName: string;
  sizeBytes: number;
  status: DocumentStatus;
  uploadedAt: Date;
}

export interface AdminOverview {
  totalClients: number;
  totalDocuments: number;
  storageUsedBytes: number;
  documentsThisMonth: number;
  newClientsThisMonth: number;
  activeFiscalYearLabel: string | null;
  documentsByFiscalYear: FiscalYearCount[];
  documentsByCategory: CategoryCount[];
  recentUploads: RecentUpload[];
}

export interface ClientOverview {
  totalDocuments: number;
  documentsThisMonth: number;
  storageUsedBytes: number;
  documentsByCategory: CategoryCount[];
  recentUploads: RecentUpload[];
}

export interface DashboardRepository {
  adminOverview(): Promise<AdminOverview>;
  clientOverview(clientId: string): Promise<ClientOverview>;
}

export const DASHBOARD_REPOSITORY = Symbol('DASHBOARD_REPOSITORY');
