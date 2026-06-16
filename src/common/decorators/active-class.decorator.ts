import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Extracts the verified `classId` attached to the request by the
 * `ClassTenantGuard`. The guard runs first; the value is guaranteed
 * to be a valid UUID belonging to the calling user.
 *
 * Usage:
 *   @ActiveClassId() classId: string
 */
export const ActiveClassId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request & { activeClassId: string }>();
    return request.activeClassId;
  },
);
