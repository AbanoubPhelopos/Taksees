/**
 * Shape of the authenticated user attached to `req.user` by the
 * Better Auth global AuthGuard (provided by
 * `@thallesp/nestjs-better-auth`).
 *
 * This service never issues or verifies sessions. It only consumes
 * the typed object that the integration sets on every request.
 */
export type UserRole = 'SUPER_ADMIN' | 'LEADER' | 'SERVANT' | 'MEMBER';

export const USER_ROLES: readonly UserRole[] = [
  'SUPER_ADMIN',
  'LEADER',
  'SERVANT',
  'MEMBER',
] as const;

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}

export interface AuthUser {
  /** UUID of the authenticated user (Better Auth user.id). */
  id: string;

  /** Global church role, sourced from the additional `role` field. */
  role: UserRole;

  /**
   * Pre-resolved set of class IDs the user has access to.
   *
   * NOTE: Better Auth sessions don't carry a classIds claim by
   * default. The ClassTenantGuard resolves the user's classes
   * on demand from the `ServantClass` table (and from
   * `Class.leaderId`). This field is reserved for a future
   * session-level optimisation; today it's always empty.
   */
  classIds: string[];
}
