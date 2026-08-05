import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateClientDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  pan?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;
}
