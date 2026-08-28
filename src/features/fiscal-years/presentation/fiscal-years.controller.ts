import {
  HttpCode,
  HttpStatus,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ROLES } from '@ca-firm/shared';
import { Roles } from '../../../common/auth/roles.decorator';
import { FiscalYearsService } from '../application/fiscal-years.service';
import { FiscalYearEntity } from '../domain/ports';
import { CreateFiscalYearDto } from './dto/create-fiscal-year.dto';
import { UpdateFiscalYearDto } from './dto/update-fiscal-year.dto';

@ApiTags('fiscal-years')
@Controller('fiscal-years')
export class FiscalYearsController {
  constructor(private readonly fiscalYearsService: FiscalYearsService) {}

  @Get()
  @ApiOperation({ summary: 'List all fiscal years' })
  findAll(): Promise<FiscalYearEntity[]> {
    return this.fiscalYearsService.findAll();
  }

  @Get('current')
  @ApiOperation({ summary: 'Get the active fiscal year' })
  current(): Promise<FiscalYearEntity> {
    return this.fiscalYearsService.current();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a fiscal year' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<FiscalYearEntity> {
    return this.fiscalYearsService.findById(id);
  }

  @Post()
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Create a fiscal year (admin)' })
  create(@Body() dto: CreateFiscalYearDto): Promise<FiscalYearEntity> {
    return this.fiscalYearsService.create(dto);
  }

  @Patch(':id')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Update a fiscal year (admin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFiscalYearDto,
  ): Promise<FiscalYearEntity> {
    return this.fiscalYearsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Delete a fiscal year (admin)' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.fiscalYearsService.remove(id);
  }
}
