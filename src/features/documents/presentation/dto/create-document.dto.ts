import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { DOCUMENT_STATUSES } from '@ca-firm/shared';
import type { DocumentStatus } from '@ca-firm/shared';

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsUUID()
  fiscalYearId: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  folderId?: string;

  /** Admin only: the client the document belongs to. */
  @IsOptional()
  @IsUUID()
  clientId?: string;

  /** Admin only: initial document status. */
  @IsOptional()
  @IsEnum(DOCUMENT_STATUSES)
  status?: DocumentStatus;
}
