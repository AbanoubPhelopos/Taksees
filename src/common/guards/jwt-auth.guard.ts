import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthUser } from '../types/auth-user';

/**
 * JwtAuthGuard — placeholders for the upstream auth service.
 *
 * This service does NOT issue or verify JWTs (see ADR 0006).
 * When the real upstream auth is wired in, this guard will be
 * replaced (or extended) to:
 *   1. extract the bearer token from the Authorization header
 *   2. verify it against the upstream auth service's public key
 *   3. attach the typed AuthUser to req.user
 *
 * For now the guard is a pass-through that only verifies
 * `req.user` is set. It throws 401 if it's not, ensuring
 * downstream guards can rely on the type.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    if (!req.user) {
      throw new UnauthorizedException('Authentication required.');
    }
    return true;
  }
}
