export interface FiscalYearEntity {
  id: string;
  label: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFiscalYearData {
  label: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

export type UpdateFiscalYearData = Partial<
  Pick<FiscalYearEntity, 'label' | 'startDate' | 'endDate' | 'isActive'>
>;

export interface FiscalYearRepository {
  create(data: CreateFiscalYearData): Promise<FiscalYearEntity>;
  findAll(): Promise<FiscalYearEntity[]>;
  findById(id: string): Promise<FiscalYearEntity | null>;
  findByLabel(label: string): Promise<FiscalYearEntity | null>;
  findActive(): Promise<FiscalYearEntity | null>;
  update(id: string, data: UpdateFiscalYearData): Promise<FiscalYearEntity>;
  remove(id: string): Promise<void>;
}

export const FISCAL_YEAR_REPOSITORY = Symbol('FISCAL_YEAR_REPOSITORY');
