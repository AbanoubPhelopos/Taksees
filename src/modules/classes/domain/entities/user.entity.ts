import { Prisma, Role } from '@prisma/client';

/**
 * User — the identity row. The `classIds` set the auth service stamps
 * onto req.user is derived from the ServantClass mapping and from
 * any class the user leads.
 */
export class User {
  private constructor(
    public readonly id: string,
    public readonly email: string,
    public name: string,
    public phone: string | null,
    public role: Role,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  static fromPrisma(row: Prisma.UserGetPayload<true>): User {
    return new User(
      row.id,
      row.email,
      row.name,
      row.phone ?? null,
      row.role,
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
}
