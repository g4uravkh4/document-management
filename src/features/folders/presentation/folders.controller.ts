import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthUser } from '../../../common/auth/auth-user.interface';
import { FoldersService } from '../application/folders.service';
import { FolderEntity, FolderNode } from '../domain/ports';
import { CreateFolderDto } from './dto/create-folder.dto';
import { QueryFoldersDto } from './dto/query-folders.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

@ApiTags('folders')
@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Get()
  @ApiOperation({ summary: 'Get the folder tree for a client and fiscal year' })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryFoldersDto,
  ): Promise<FolderNode[]> {
    return this.foldersService.list(user, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a folder (admin or client)' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateFolderDto,
  ): Promise<FolderEntity> {
    return this.foldersService.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a folder (admin or client)' })
  rename(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFolderDto,
  ): Promise<FolderEntity> {
    return this.foldersService.rename(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a folder and its subfolders (admin or client)',
  })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.foldersService.remove(user, id);
  }
}
