import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
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
  @MaxLength(15)
  @Matches(/^[0-9]+$/, { message: 'Phone must contain digits only' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  @Matches(/^[0-9]+$/, { message: 'PAN must contain digits only' })
  pan?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;
}
