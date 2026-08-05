export type Role = 'ADMIN' | 'CLIENT';
export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ThemePreference = 'LIGHT' | 'DARK' | 'SYSTEM';
export type DateFormat = 'BS' | 'AD';
export type Language = 'en' | 'ne';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  clientId: string | null;
  isActive: boolean;
  avatarKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  pan: string | null;
  address: string | null;
  isActive: boolean;
  logoKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FiscalYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentCategory {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  clientId: string;
  fiscalYearId: string;
  categoryId: string | null;
  folderId: string | null;
  title: string;
  description: string | null;
  fileKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  uploadedById: string;
  uploadedAt: string;
  updatedAt: string;
  clientName: string;
  categoryName: string | null;
  fiscalYearLabel: string;
  uploadedByName: string;
  folderPath: string | null;
}

export interface Folder {
  id: string;
  name: string;
  clientId: string;
  fiscalYearId: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FolderNode extends Folder {
  children: FolderNode[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UserSetting {
  id: string;
  userId: string;
  theme: ThemePreference;
  dateFormat: DateFormat;
  language: Language;
}

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
  uploadedAt: string;
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

export type DashboardOverview = AdminOverview | ClientOverview;
