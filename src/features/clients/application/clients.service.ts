import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { MediaService } from '../../../common/media/media.service';
import {
  CLIENT_REPOSITORY,
  ClientEntity,
  CreateClientData,
  UpdateClientData,
} from '../domain/ports';
import type { ClientRepository } from '../domain/ports';
import { CreateClientDto } from '../presentation/dto/create-client.dto';
import { UpdateClientDto } from '../presentation/dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
    private readonly media: MediaService,
  ) {}

  async create(dto: CreateClientDto): Promise<ClientEntity> {
    await this.assertEmailAvailable(dto.email);
    const data: CreateClientData = {
      name: dto.name,
      email: dto.email,
      phone: dto.phone ?? null,
      pan: dto.pan ?? null,
      address: dto.address ?? null,
    };
    return this.clients.create(data);
  }

  async findAll(): Promise<ClientEntity[]> {
    return this.clients.findAll();
  }

  async findById(id: string): Promise<ClientEntity> {
    return this.getClientOrThrow(id);
  }

  async update(id: string, dto: UpdateClientDto): Promise<ClientEntity> {
    await this.getClientOrThrow(id);
    if (dto.email !== undefined) {
      await this.assertEmailAvailable(dto.email, id);
    }

    const data: UpdateClientData = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.pan !== undefined) data.pan = dto.pan;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.clients.update(id, data);
  }

  async remove(id: string): Promise<void> {
    const client = await this.getClientOrThrow(id);
    try {
      await this.clients.remove(id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Cannot delete a client that has users or documents',
        );
      }
      throw error;
    }
    if (client.logoKey) {
      await this.media.remove(client.logoKey);
    }
  }

  async setLogo(id: string, key: string): Promise<ClientEntity> {
    const client = await this.getClientOrThrow(id);
    const updated = await this.clients.update(id, { logoKey: key });
    if (client.logoKey && client.logoKey !== key) {
      await this.media.remove(client.logoKey);
    }
    return updated;
  }

  async getLogoKey(id: string): Promise<string | null> {
    const client = await this.getClientOrThrow(id);
    return client.logoKey;
  }

  private async getClientOrThrow(id: string): Promise<ClientEntity> {
    const client = await this.clients.findById(id);
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }

  private async assertEmailAvailable(
    email: string,
    exceptId?: string,
  ): Promise<void> {
    const existing = await this.clients.findByEmail(email);
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Client email is already in use');
    }
  }
}
