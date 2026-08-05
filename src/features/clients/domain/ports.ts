export interface ClientEntity {
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
}

export interface CreateClientData {
  name: string;
  email: string;
  phone?: string | null;
  pan?: string | null;
  address?: string | null;
}

export type UpdateClientData = Partial<
  Pick<
    ClientEntity,
    'name' | 'email' | 'phone' | 'pan' | 'address' | 'isActive' | 'logoKey'
  >
>;

export interface ClientRepository {
  create(data: CreateClientData): Promise<ClientEntity>;
  findById(id: string): Promise<ClientEntity | null>;
  findByEmail(email: string): Promise<ClientEntity | null>;
  findAll(): Promise<ClientEntity[]>;
  update(id: string, data: UpdateClientData): Promise<ClientEntity>;
  remove(id: string): Promise<void>;
}

export const CLIENT_REPOSITORY = Symbol('CLIENT_REPOSITORY');
