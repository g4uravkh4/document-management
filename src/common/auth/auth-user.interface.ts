import { Role } from '@ca-firm/shared';

/** Authenticated user, attached to the request by JwtAuthGuard. */
export interface AuthUser {
  /** User id */
  sub: string;
  email: string;
  role: Role;
  /** Present for CLIENT users */
  clientId?: string | null;
}
