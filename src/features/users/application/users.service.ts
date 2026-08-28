import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../../../generated/prisma/client';
import { MediaService } from '../../../common/media/media.service';
import { AuthUser } from '../../../common/auth/auth-user.interface';
import { USER_SETTING_REPOSITORY } from '../../settings/domain/ports';
import type { UserSettingRepository } from '../../settings/domain/ports';
import {
  PublicUser,
  UpdateUserData,
  USER_REPOSITORY,
  UserEntity,
} from '../domain/ports';
import type { UserRepository } from '../domain/ports';
import { CreateUserDto } from '../presentation/dto/create-user.dto';
import { UpdateProfileDto } from '../presentation/dto/update-profile.dto';
import { UpdateUserDto } from '../presentation/dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(USER_SETTING_REPOSITORY)
    private readonly settings: UserSettingRepository,
    private readonly media: MediaService,
  ) {}

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.users.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
      role: dto.role ?? 'CLIENT',
      clientId: dto.clientId ?? null,
    });

    await this.settings.upsert(user.id, {});
    return this.toPublic(user);
  }

  async findAll(): Promise<PublicUser[]> {
    const users = await this.users.findAll();
    return users.map((u) => this.toPublic(u));
  }

  async findById(id: string): Promise<PublicUser> {
    const user = await this.getUserOrThrow(id);
    return this.toPublic(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<PublicUser> {
    await this.getUserOrThrow(id);

    const data: UpdateUserData = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.clientId !== undefined) data.clientId = dto.clientId;
    if (dto.password !== undefined) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    const user = await this.users.update(id, data);
    return this.toPublic(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<PublicUser> {
    const user = await this.getUserOrThrow(userId);

    const data: UpdateUserData = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.newPassword !== undefined) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required');
      }
      const valid = await bcrypt.compare(
        dto.currentPassword,
        user.passwordHash,
      );
      if (!valid) {
        throw new BadRequestException('Current password is incorrect');
      }
      data.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    }

    const updated = await this.users.update(userId, data);
    return this.toPublic(updated);
  }

  async remove(id: string): Promise<void> {
    const user = await this.getUserOrThrow(id);
    try {
      await this.users.remove(id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Cannot delete a user who has uploaded documents',
        );
      }
      throw error;
    }
    if (user.avatarKey) {
      await this.media.remove(user.avatarKey);
    }
  }

  async setAvatar(
    actor: AuthUser,
    userId: string,
    key: string,
  ): Promise<PublicUser> {
    const user = await this.getUserOrThrow(userId);
    this.assertCanEditAvatar(actor, user);

    const updated = await this.users.update(userId, { avatarKey: key });
    if (user.avatarKey && user.avatarKey !== key) {
      await this.media.remove(user.avatarKey);
    }
    return this.toPublic(updated);
  }

  async getAvatarKey(actor: AuthUser, userId: string): Promise<string | null> {
    const user = await this.getUserOrThrow(userId);
    this.assertCanView(actor, user);
    return user.avatarKey;
  }

  private assertCanEditAvatar(actor: AuthUser, user: UserEntity): void {
    if (actor.role === 'ADMIN') {
      return;
    }
    if (actor.sub !== user.id) {
      throw new ForbiddenException('You can only update your own avatar');
    }
  }

  private assertCanView(actor: AuthUser, user: UserEntity): void {
    if (actor.role === 'ADMIN') {
      return;
    }
    if (actor.sub !== user.id) {
      throw new ForbiddenException('Access denied');
    }
  }

  private async getUserOrThrow(id: string): Promise<UserEntity> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private toPublic(user: UserEntity): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      clientId: user.clientId,
      isActive: user.isActive,
      avatarKey: user.avatarKey,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
