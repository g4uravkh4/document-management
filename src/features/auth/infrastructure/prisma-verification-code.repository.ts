import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CreateVerificationCodeData,
  VerificationCodeEntity,
  VerificationCodePurpose,
  VerificationCodeRepository,
} from '../domain/ports';

@Injectable()
export class PrismaVerificationCodeRepository implements VerificationCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateVerificationCodeData,
  ): Promise<VerificationCodeEntity> {
    const code = await this.prisma.verificationCode.create({
      data: {
        email: data.email,
        purpose: data.purpose,
        code: data.code,
        expiresAt: data.expiresAt,
      },
    });
    return this.toEntity(code);
  }

  async findLatestByEmailAndPurpose(
    email: string,
    purpose: VerificationCodePurpose,
  ): Promise<VerificationCodeEntity | null> {
    const code = await this.prisma.verificationCode.findFirst({
      where: { email, purpose },
      orderBy: { createdAt: 'desc' },
    });
    return code ? this.toEntity(code) : null;
  }

  async markUsed(id: string): Promise<void> {
    await this.prisma.verificationCode.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async markAllUsedFor(
    email: string,
    purpose: VerificationCodePurpose,
  ): Promise<void> {
    await this.prisma.verificationCode.updateMany({
      where: { email, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  private toEntity(code: {
    id: string;
    email: string;
    purpose: string;
    code: string;
    expiresAt: Date;
    usedAt: Date | null;
    createdAt: Date;
  }): VerificationCodeEntity {
    return {
      id: code.id,
      email: code.email,
      purpose: code.purpose as VerificationCodePurpose,
      code: code.code,
      expiresAt: code.expiresAt,
      usedAt: code.usedAt,
      createdAt: code.createdAt,
    };
  }
}
