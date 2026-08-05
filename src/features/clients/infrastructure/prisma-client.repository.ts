import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  ClientEntity,
  ClientRepository,
  CreateClientData,
  UpdateClientData,
} from '../domain/ports';

@Injectable()
export class PrismaClientRepository implements ClientRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateClientData): Promise<ClientEntity> {
    const client = await this.prisma.client.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        pan: data.pan ?? null,
        address: data.address ?? null,
      },
    });
    return this.toEntity(client);
  }

  async findById(id: string): Promise<ClientEntity | null> {
    const client = await this.prisma.client.findUnique({ where: { id } });
    return client ? this.toEntity(client) : null;
  }

  async findByEmail(email: string): Promise<ClientEntity | null> {
    const client = await this.prisma.client.findUnique({ where: { email } });
    return client ? this.toEntity(client) : null;
  }

  async findAll(): Promise<ClientEntity[]> {
    const clients = await this.prisma.client.findMany({
      orderBy: { name: 'asc' },
    });
    return clients.map((c) => this.toEntity(c));
  }

  async update(id: string, data: UpdateClientData): Promise<ClientEntity> {
    const client = await this.prisma.client.update({ where: { id }, data });
    return this.toEntity(client);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.client.delete({ where: { id } });
  }

  private toEntity(client: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    pan: string | null;
    address: string | null;
    isActive: boolean;
    logoKey: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ClientEntity {
    return {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      pan: client.pan,
      address: client.address,
      isActive: client.isActive,
      logoKey: client.logoKey,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }
}
