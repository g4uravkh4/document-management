import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CreateUserData,
  UpdateUserData,
  UserEntity,
  UserRepository,
} from '../domain/ports';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserData): Promise<UserEntity> {
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        role: data.role,
        clientId: data.clientId ?? null,
        isActive: data.isActive ?? true,
      },
    });
    return this.toEntity(user);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.toEntity(user) : null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toEntity(user) : null;
  }

  async findAll(): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => this.toEntity(u));
  }

  async update(id: string, data: UpdateUserData): Promise<UserEntity> {
    const user = await this.prisma.user.update({ where: { id }, data });
    return this.toEntity(user);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  private toEntity(user: {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    role: string;
    clientId: string | null;
    isActive: boolean;
    avatarKey: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): UserEntity {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
      role: user.role as UserEntity['role'],
      clientId: user.clientId,
      isActive: user.isActive,
      avatarKey: user.avatarKey,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
