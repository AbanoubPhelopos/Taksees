import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthUser, UserRole } from '../types/auth-user';
import { ROLES_METADATA_KEY } from '../decorators/roles.decorator';
import { auth } from '../../auth/auth';

/**
 * RolesGuard — checks the caller's role against the @Roles(...)
 * set on the route handler (or controller class).
 *
 * Composition with other guards (top to bottom):
 *   1. Better Auth's global AuthGuard  (sets req.user / req.session)
 *   2. RolesGuard                       (this one)
 *   3. ClassTenantGuard                 (X-Class-Id access check)
 *
 * The guard short-circuits to true when no @Roles is set, so it's
 * safe to register globally. When a role set IS declared, the
 * user must be in that set to proceed.
 *
 * Role names are normalised to the typed UserRole before
 * comparison. Better Auth stores role strings lowercase
 * ('super_admin') in the database; our UserRole enum uses
 * the uppercase form ('SUPER_ADMIN'). Unknown / missing role
 * values default to MEMBER (the least-privileged role) so a
 * stale or hand-edited row can never grant higher privileges
 * than expected.
 *
 * Fallback path: if the integration's AuthGuard didn't attach
 * req.user (which happens on some state-changing requests),
 * we call Better Auth's getSession directly. The fallback
 * costs one DB roundtrip per request, so the AuthGuard is
 * still the fast path.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: { id: string; role?: string } }>();

    // 1. Fast path: use the user the integration's AuthGuard
    //    already attached. This works for GET and most other
    //    methods.
    let rawUser: { id: string; role?: string } | undefined = req.user;

    // 2. Fallback: ask Better Auth for the session directly.
    //    Some state-changing requests don't get req.user set
    //    by the integration (see phase-2 ADR).
    if (!rawUser?.id) {
      const headers: Array<[string, string]> = [];
      for (const [k, v] of Object.entries(req.headers ?? {})) {
        if (typeof v === 'string') headers.push([k, v]);
        else if (Array.isArray(v)) headers.push([k, v.join(', ')]);
      }
      const session = await auth.api.getSession({ headers: new Headers(headers) });
      rawUser = session?.user as { id: string; role?: string } | undefined;
    }

    if (!rawUser?.id) {
      throw new UnauthorizedException('Authentication required for role check.');
    }

    const user: AuthUser = {
      id: rawUser.id,
      role: normaliseRole(rawUser.role),
      classIds: [],
    };

    if (!required.includes(user.role)) {
      throw new ForbiddenException(
        `Role '${user.role}' is not in the required set [${required.join(', ')}].`,
      );
    }
    return true;
  }
}

/**
 * Coerces a Better Auth role string to the typed UserRole.
 * Unknown values default to MEMBER (the least-privileged
 * role) so a stale or hand-edited row can never grant higher
 * privileges than expected.
 */
function normaliseRole(raw: string | undefined | null): UserRole {
  const r = (raw ?? '').toString().toLowerCase();
  if (r === 'super_admin') return 'SUPER_ADMIN';
  if (r === 'leader') return 'LEADER';
  if (r === 'servant') return 'SERVANT';
  if (r === 'member') return 'MEMBER';
  return 'MEMBER';
}
