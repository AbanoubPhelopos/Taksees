import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../types/auth-user';

/**
 * Metadata key for the @Roles decorator.
 */
export const ROLES_METADATA_KEY = 'taksees:roles';

/**
 * Mark a route handler as requiring one of the given roles.
 * Pair with `RolesGuard` (which uses `Reflector` to read the metadata).
 *
 * Usage:
 *   @Roles('SUPER_ADMIN', 'LEADER')
 *   @Post('classes')
 *   create(...) { ... }
 */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_METADATA_KEY, roles);
