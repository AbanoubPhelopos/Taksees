/**
 * Shape of the authenticated user attached to `req.user`
 * by an upstream auth service or proxy (see ADR 0006).
 *
 * This service NEVER issues or verifies JWTs. It only consumes
 * this typed object.
 */
export type UserRole = 'SUPER_ADMIN' | 'LEADER' | 'SERVANT' | 'MEMBER';

export interface AuthUser {
  /** UUID of the authenticated user. */
  id: string;

  /** Global role. A user may be LEADER of one class and SERVANT of many. */
  role: UserRole;

  /**
   * Pre-resolved set of class IDs the user has access to.
   * Populated by the upstream auth service from the
   * `ServantClass` mapping and `Class.leaderId`.
   */
  classIds: string[];
}
