import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { DOCUMENT_STATUSES } from '@ca-firm/shared';
import type { DocumentStatus } from '@ca-firm/shared';

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  @IsUUID()
  categoryId?: string;

  /** Folder to move the document into. Send an empty string to remove it from any folder. */
  @IsOptional()
  @IsString()
  @MaxLength(36)
  folderId?: string;

  /** Admin only. */
  @IsOptional()
  @IsEnum(DOCUMENT_STATUSES)
  status?: DocumentStatus;

  /** Admin only. */
  @IsOptional()
  @IsUUID()
  clientId?: string;

  /** Admin only. */
  @IsOptional()
  @IsUUID()
  fiscalYearId?: string;
}
