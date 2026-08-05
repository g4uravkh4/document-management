import { SetMetadata } from '@nestjs/common';
import { Role } from '@ca-firm/shared';

export const ROLES_KEY = 'roles';

/** Restricts a route to the given roles. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
