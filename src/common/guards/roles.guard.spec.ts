import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { AuthUser } from '../types/auth-user';

// Mock the auth module so the test doesn't try to load
// better-auth's ESM bundle in a CommonJS test runner.
jest.mock('../../auth/auth', () => ({
  auth: {
    api: {
      getSession: jest.fn().mockResolvedValue(null),
    },
  },
}));
import { Roles } from '../decorators/roles.decorator';

/**
 * A real handler with @Roles metadata. Tests build a fake
 * ExecutionContext whose getHandler / getClass point to this
 * class so Reflector can read the metadata.
 */
class NoRolesProbe {
  handler() {}
}
class RolesProbe {
  @Roles('SUPER_ADMIN', 'LEADER')
  handler() {}
}
class SuperAdminOnlyProbe {
  @Roles('SUPER_ADMIN')
  handler() {}
}

function buildCtx(
  probe: { handler: () => unknown },
  req: Record<string, unknown>,
): ExecutionContext {
  return {
    // getHandler must return the function that carries the
    // @Roles metadata. For class methods that's the unbound
    // prototype method; for our probes we pass it through
    // the probe instance's prototype so the reflector finds
    // the metadata key set by SetMetadata.
    getHandler: () => probe.handler,
    getClass: () => probe.constructor,
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
  } as unknown as ExecutionContext;
}

const SUPER_ADMIN: AuthUser = { id: '1', role: 'SUPER_ADMIN', classIds: [] };
const LEADER: AuthUser = { id: '2', role: 'LEADER', classIds: [] };
const SERVANT: AuthUser = { id: '3', role: 'SERVANT', classIds: [] };
const MEMBER: AuthUser = { id: '4', role: 'MEMBER', classIds: [] };

describe('RolesGuard', () => {
  let guard: RolesGuard;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();
    guard = mod.get(RolesGuard);
  });

  describe('no @Roles metadata', () => {
    it('passes for any authenticated user', async () => {
      const probe = new NoRolesProbe();
      const c = buildCtx(probe, { user: MEMBER });
      await expect(guard.canActivate(c)).resolves.toBe(true);
    });

    it("passes even without a user (defence in depth is the AuthGuard's job)", async () => {
      const probe = new NoRolesProbe();
      const c = buildCtx(probe, {});
      await expect(guard.canActivate(c)).resolves.toBe(true);
    });
  });

  describe('@Roles metadata present', () => {
    it('SUPER_ADMIN passes a SUPER_ADMIN | LEADER set', async () => {
      const probe = new RolesProbe();
      const c = buildCtx(probe, { user: SUPER_ADMIN });
      await expect(guard.canActivate(c)).resolves.toBe(true);
    });

    it('LEADER passes a SUPER_ADMIN | LEADER set', async () => {
      const probe = new RolesProbe();
      const c = buildCtx(probe, { user: LEADER });
      await expect(guard.canActivate(c)).resolves.toBe(true);
    });

    it('SERVANT rejects a SUPER_ADMIN | LEADER set', async () => {
      const probe = new RolesProbe();
      const c = buildCtx(probe, { user: SERVANT });
      await expect(guard.canActivate(c)).rejects.toThrow(ForbiddenException);
    });

    it('MEMBER rejects a SUPER_ADMIN | LEADER set', async () => {
      const probe = new RolesProbe();
      const c = buildCtx(probe, { user: MEMBER });
      await expect(guard.canActivate(c)).rejects.toThrow(ForbiddenException);
    });

    it('SUPER_ADMIN alone passes a SUPER_ADMIN-only set', async () => {
      const probe = new SuperAdminOnlyProbe();
      const c = buildCtx(probe, { user: SUPER_ADMIN });
      await expect(guard.canActivate(c)).resolves.toBe(true);
    });

    it('LEADER rejects a SUPER_ADMIN-only set', async () => {
      const probe = new SuperAdminOnlyProbe();
      const c = buildCtx(probe, { user: LEADER });
      await expect(guard.canActivate(c)).rejects.toThrow(ForbiddenException);
    });

    it('no user attached throws 401 (the AuthGuard should have rejected first)', async () => {
      const probe = new SuperAdminOnlyProbe();
      const c = buildCtx(probe, {});
      await expect(guard.canActivate(c)).rejects.toThrow(UnauthorizedException);
    });
  });
});
