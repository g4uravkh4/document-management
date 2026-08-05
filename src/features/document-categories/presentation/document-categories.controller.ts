import {
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
import { DocumentCategoriesService } from '../application/document-categories.service';
import { DocumentCategoryEntity } from '../domain/ports';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('document-categories')
@Controller('document-categories')
export class DocumentCategoriesController {
  constructor(private readonly categoriesService: DocumentCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all document categories' })
  findAll(): Promise<DocumentCategoryEntity[]> {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document category' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DocumentCategoryEntity> {
    return this.categoriesService.findById(id);
  }

  @Post()
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Create a document category (admin)' })
  create(@Body() dto: CreateCategoryDto): Promise<DocumentCategoryEntity> {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Update a document category (admin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<DocumentCategoryEntity> {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Delete a document category (admin)' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.categoriesService.remove(id);
  }
}
