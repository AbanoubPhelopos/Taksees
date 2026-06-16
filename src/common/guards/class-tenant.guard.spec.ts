import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClassTenantGuard } from './class-tenant.guard';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuthUser } from '../types/auth-user';

describe('ClassTenantGuard', () => {
  let guard: ClassTenantGuard;
  let prisma: {
    class: { findUnique: jest.Mock };
    servantClass: { findUnique: jest.Mock };
  };

  const SUPER_ADMIN: AuthUser = {
    id: '00000000-0000-0000-0000-000000000001',
    role: 'SUPER_ADMIN',
    classIds: [],
  };
  const SERVANT: AuthUser = {
    id: '00000000-0000-0000-0000-000000000002',
    role: 'SERVANT',
    classIds: [],
  };
  const LEADER: AuthUser = {
    id: '00000000-0000-0000-0000-000000000003',
    role: 'LEADER',
    classIds: [],
  };
  const TARGET_CLASS = '11111111-1111-1111-1111-111111111111';

  function buildCtx(req: Record<string, unknown>): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(async () => {
    prisma = {
      class: { findUnique: jest.fn() },
      servantClass: { findUnique: jest.fn() },
    };

    const mod = await Test.createTestingModule({
      providers: [ClassTenantGuard, { provide: PrismaService, useValue: prisma }],
    }).compile();

    guard = mod.get(ClassTenantGuard);
  });

  describe('branches', () => {
    it('throws 401 when req.user is missing', async () => {
      const req: Record<string, unknown> = {
        headers: { 'x-class-id': TARGET_CLASS },
        user: undefined,
      };
      await expect(guard.canActivate(buildCtx(req))).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.class.findUnique).not.toHaveBeenCalled();
      expect(prisma.servantClass.findUnique).not.toHaveBeenCalled();
    });

    it('throws 403 when X-Class-Id header is missing', async () => {
      const req: Record<string, unknown> = { headers: {}, user: SERVANT };
      await expect(guard.canActivate(buildCtx(req))).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws 403 when X-Class-Id is whitespace only', async () => {
      const req: Record<string, unknown> = {
        headers: { 'x-class-id': '   ' },
        user: SERVANT,
      };
      await expect(guard.canActivate(buildCtx(req))).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('SUPER_ADMIN bypass: accepts any classId, no DB call', async () => {
      const req: Record<string, unknown> = {
        headers: { 'x-class-id': TARGET_CLASS },
        user: SUPER_ADMIN,
      };
      const result = await guard.canActivate(buildCtx(req));
      expect(result).toBe(true);
      expect(req.activeClassId).toBe(TARGET_CLASS);
      expect(prisma.class.findUnique).not.toHaveBeenCalled();
      expect(prisma.servantClass.findUnique).not.toHaveBeenCalled();
    });

    it('class leader: accepted when Class.leaderId === user.id', async () => {
      prisma.class.findUnique.mockResolvedValue({ leaderId: LEADER.id });
      const req: Record<string, unknown> = {
        headers: { 'x-class-id': TARGET_CLASS },
        user: LEADER,
      };
      const result = await guard.canActivate(buildCtx(req));
      expect(result).toBe(true);
      expect(req.activeClassId).toBe(TARGET_CLASS);
      expect(prisma.class.findUnique).toHaveBeenCalledWith({
        where: { id: TARGET_CLASS },
        select: { leaderId: true },
      });
      expect(prisma.servantClass.findUnique).not.toHaveBeenCalled();
    });

    it('servant with assignment: accepted via servantClass lookup', async () => {
      prisma.class.findUnique.mockResolvedValue({ leaderId: 'someone-else' });
      prisma.servantClass.findUnique.mockResolvedValue({ servantId: SERVANT.id });
      const req: Record<string, unknown> = {
        headers: { 'x-class-id': TARGET_CLASS },
        user: SERVANT,
      };
      const result = await guard.canActivate(buildCtx(req));
      expect(result).toBe(true);
      expect(req.activeClassId).toBe(TARGET_CLASS);
      expect(prisma.servantClass.findUnique).toHaveBeenCalledWith({
        where: {
          servantId_classId: { servantId: SERVANT.id, classId: TARGET_CLASS },
        },
        select: { servantId: true },
      });
    });

    it('class does not exist: 403', async () => {
      prisma.class.findUnique.mockResolvedValue(null);
      const req: Record<string, unknown> = {
        headers: { 'x-class-id': TARGET_CLASS },
        user: SERVANT,
      };
      await expect(guard.canActivate(buildCtx(req))).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.servantClass.findUnique).not.toHaveBeenCalled();
    });

    it('class exists, not the leader, no servant assignment: 403', async () => {
      prisma.class.findUnique.mockResolvedValue({ leaderId: 'someone-else' });
      prisma.servantClass.findUnique.mockResolvedValue(null);
      const req: Record<string, unknown> = {
        headers: { 'x-class-id': TARGET_CLASS },
        user: SERVANT,
      };
      await expect(guard.canActivate(buildCtx(req))).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
