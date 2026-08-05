import {
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateFiscalYearDto {
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  @Matches(/^\d{4}\/\d{2}$/, {
    message: 'label must match the fiscal year format, e.g. 2081/82',
  })
  label: string;

  @IsISO8601()
  startDate: string;

  @IsISO8601()
  endDate: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
