import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IUserDirectory } from '../domain/interfaces/repositories.interface';
import { UserRole, isUserRole } from '../../../common/types/auth-user';

/**
 * Prisma-backed implementation of IUserDirectory.
 *
 * Reads from Better Auth's `users` table. The `role` column is
 * the additional church-specific field added to the Better Auth
 * user schema. Unknown values are coerced to 'SERVANT' so a stale
 * claim can never grant higher permissions than expected.
 */
@Injectable()
export class PrismaUserDirectory implements IUserDirectory {
  constructor(private readonly prisma: PrismaService) {}

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { id } });
    return count > 0;
  }

  async existsMany(ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const rows = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  }

  async countServants(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    return this.prisma.user.count({
      where: { id: { in: ids }, role: 'SERVANT' },
    });
  }

  /** Convenience helper for ClassTenantGuard — read a user's role. */
  async getRole(id: string): Promise<UserRole | null> {
    const row = await this.prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!row) return null;
    return isUserRole(row.role) ? row.role : 'SERVANT';
  }
}
