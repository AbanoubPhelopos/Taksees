import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import { AuthUser } from '../types/auth-user';

/**
 * Extracts the authenticated user attached to `req.user` by the
 * upstream JwtAuthGuard. Returns the typed AuthUser contract.
 *
 * Usage:
 *   @CurrentUser() user: AuthUser
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<Request & { user: AuthUser }>();
    return request.user;
  },
);
