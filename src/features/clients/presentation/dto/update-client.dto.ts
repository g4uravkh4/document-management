import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @ValidateIf((o) => o.phone !== null)
  @IsString()
  @MaxLength(15)
  @Matches(/^[0-9]+$/, { message: 'Phone must contain digits only' })
  @Transform(({ value }) => (value === '' ? null : value))
  phone?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.pan !== null)
  @IsString()
  @MaxLength(15)
  @Matches(/^[0-9]+$/, { message: 'PAN must contain digits only' })
  @Transform(({ value }) => (value === '' ? null : value))
  pan?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.address !== null)
  @IsString()
  @MaxLength(300)
  @Transform(({ value }) => (value === '' ? null : value))
  address?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
