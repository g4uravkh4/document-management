import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(150)
  name: string;

  /** Admin only: the client the folder belongs to. */
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsUUID()
  fiscalYearId: string;

  /** Parent folder id for nesting; omit for a root folder. */
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
