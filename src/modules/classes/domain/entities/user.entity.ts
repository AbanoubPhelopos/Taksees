import { Prisma, User } from '@prisma/client';
import { UserRole, isUserRole } from '../../../../common/types/auth-user';

/**
 * User — thin domain wrapper around the Better Auth user row.
 * `role` is the church-specific additional field; it's coerced
 * to the typed UserRole at the boundary so the rest of the
 * codebase never sees the raw string.
 */
export class UserEntity {
  private constructor(
    public readonly id: string,
    public readonly email: string,
    public name: string,
    public phone: string | null,
    public role: UserRole,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  static fromPrisma(row: Prisma.UserGetPayload<true>): UserEntity {
    return new UserEntity(
      row.id,
      row.email,
      row.name,
      row.phone ?? null,
      isUserRole(row.role) ? row.role : 'SERVANT',
      row.createdAt,
      row.updatedAt,
    );
  }

  rename(name: string): void {
    this.name = name;
  }

  setPhone(phone: string | null): void {
    this.phone = phone;
  }

  /** Used by the seed; not part of the public API. */
  static readonly typeMarker: User = undefined as unknown as User;
}
