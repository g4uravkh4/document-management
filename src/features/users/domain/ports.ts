import { Role } from '@ca-firm/shared';

export interface UserEntity {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
  clientId: string | null;
  isActive: boolean;
  avatarKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Public user shape (password hash stripped). */
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  clientId: string | null;
  isActive: boolean;
  avatarKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
  clientId?: string | null;
  isActive?: boolean;
}

export type UpdateUserData = Partial<
  Pick<
    UserEntity,
    'name' | 'isActive' | 'role' | 'clientId' | 'passwordHash' | 'avatarKey'
  >
>;

export interface UserRepository {
  create(data: CreateUserData): Promise<UserEntity>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  findAll(): Promise<UserEntity[]>;
  update(id: string, data: UpdateUserData): Promise<UserEntity>;
  remove(id: string): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
