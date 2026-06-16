import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuthUser, isUserRole } from '../types/auth-user';

/**
 * ClassTenantGuard — enforces that the calling user is allowed to
 * operate in the class identified by the `X-Class-Id` request header.
 *
 * Composition (set globally / per-controller in this order):
 *   1. Better Auth's AuthGuard (sets req.session + req.user)
 *   2. RolesGuard (optional — checks @Roles metadata)
 *   3. ClassTenantGuard (this one — checks class membership)
 *
 * Branches:
 *   - Missing X-Class-Id header  → 403 Forbidden
 *   - Missing req.user           → 401 Unauthorized (shouldn't happen
 *                                  since the global AuthGuard runs first)
 *   - SUPER_ADMIN                → bypass (can act on any class)
 *   - Servant / Member           → 403 unless they appear in
 *                                  servant_classes for that classId
 *                                  (DB lookup; one query, no transaction)
 *   - Class leader               → bypass (matches all classes they
 *                                  lead via Class.leaderId)
 *
 * On success, attaches `req.activeClassId` for the @ActiveClassId
 * decorator and any downstream consumer.
 */
@Injectable()
export class ClassTenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser; activeClassId?: string }>();

    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }

    const classId = (request.headers['x-class-id'] as string | undefined)?.trim();
    if (!classId) {
      throw new ForbiddenException('Missing X-Class-Id tenant context header.');
    }

    // SUPER_ADMIN short-circuits the DB check.
    if (user.role === 'SUPER_ADMIN') {
      request.activeClassId = classId;
      return true;
    }

    // Class leader: any user with `classId` set as their leaderId
    // gets the same access as a servant. One indexed lookup.
    const classRow = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { leaderId: true },
    });
    if (!classRow) {
      throw new ForbiddenException('Class not found.');
    }
    if (classRow.leaderId === user.id) {
      request.activeClassId = classId;
      return true;
    }

    // Servant mapping: composite PK (servantId, classId). One lookup.
    const assignment = await this.prisma.servantClass.findUnique({
      where: { servantId_classId: { servantId: user.id, classId } },
      select: { servantId: true },
    });
    if (!assignment) {
      throw new ForbiddenException('No access to this class context.');
    }

    request.activeClassId = classId;
    return true;
  }
}

/**
 * Re-export the type guard for use in services that need to coerce
 * a raw user.role into the typed UserRole enum.
 */
export { isUserRole };
