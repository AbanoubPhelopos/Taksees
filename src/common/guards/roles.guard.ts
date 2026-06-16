import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthUser, UserRole } from '../types/auth-user';
import { ROLES_METADATA_KEY } from '../decorators/roles.decorator';

/**
 * RolesGuard — checks req.user.role against the @Roles(...) set
 * on the route handler (or controller class).
 *
 * Order of composition with other guards:
 *   JwtAuthGuard  → sets req.user
 *   RolesGuard    → checks the role
 *   ClassTenantGuard → checks class access
 *
 * The guard short-circuits (returns true) when no @Roles is set,
 * so it's safe to apply globally. When a role set IS declared,
 * the user must be in that set to proceed.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Authentication required for role check.');
    }
    if (!required.includes(user.role)) {
      throw new ForbiddenException(
        `Role '${user.role}' is not in the required set [${required.join(', ')}].`,
      );
    }
    return true;
  }
}
