import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ROLES } from '@ca-firm/shared';
import type { Role } from '@ca-firm/shared';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;

  @IsOptional()
  @IsEnum(ROLES)
  role?: Role;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
