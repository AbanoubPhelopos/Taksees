import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IUserDirectory } from '../domain/interfaces/repositories.interface';

/**
 * Thin Prisma-backed implementation of IUserDirectory.
 * Lives here (not in users/) because users/ is out of scope for
 * Phase 1. Will move to its own module in a later phase.
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
}
