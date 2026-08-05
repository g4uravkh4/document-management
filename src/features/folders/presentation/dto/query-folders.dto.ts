import { IsOptional, IsUUID } from 'class-validator';

export class QueryFoldersDto {
  /** Admin only: the client whose folder tree to load. */
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsUUID()
  fiscalYearId: string;
}
