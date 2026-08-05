import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { RefreshTokenEntity, RefreshTokenRepository } from '../domain/ports';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshTokenEntity> {
    const token = await this.prisma.refreshToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
    return this.toEntity(token);
  }

  async findValid(
    tokenHash: string,
    now: Date,
  ): Promise<RefreshTokenEntity | null> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!token || token.expiresAt < now) {
      return null;
    }
    return this.toEntity(token);
  }

  async removeByTokenHash(tokenHash: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }

  async removeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  private toEntity(token: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
  }): RefreshTokenEntity {
    return {
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
    };
  }
}
