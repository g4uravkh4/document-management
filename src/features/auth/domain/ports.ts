export interface RefreshTokenEntity {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface RefreshTokenRepository {
  create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshTokenEntity>;
  findValid(tokenHash: string, now: Date): Promise<RefreshTokenEntity | null>;
  removeByTokenHash(tokenHash: string): Promise<void>;
  removeAllForUser(userId: string): Promise<void>;
}

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export type VerificationCodePurpose = 'SIGNUP' | 'RESET_PASSWORD';

export interface VerificationCodeEntity {
  id: string;
  email: string;
  purpose: VerificationCodePurpose;
  code: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface CreateVerificationCodeData {
  email: string;
  purpose: VerificationCodePurpose;
  code: string;
  expiresAt: Date;
}

export interface VerificationCodeRepository {
  create(data: CreateVerificationCodeData): Promise<VerificationCodeEntity>;
  findLatestByEmailAndPurpose(
    email: string,
    purpose: VerificationCodePurpose,
  ): Promise<VerificationCodeEntity | null>;
  markUsed(id: string): Promise<void>;
  markAllUsedFor(
    email: string,
    purpose: VerificationCodePurpose,
  ): Promise<void>;
}

export const VERIFICATION_CODE_REPOSITORY = Symbol(
  'VERIFICATION_CODE_REPOSITORY',
);
