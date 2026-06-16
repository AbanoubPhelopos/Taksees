import { PrismaService } from './prisma.service';

/**
 * Minimal model delegate shape used by repository helpers.
 * Repositories cast their Prisma delegate to this for shared helpers.
 */
export interface ModelDelegate {
  findUnique: (args: { where: { id: string } }) => Promise<unknown>;
  findFirst: (args: Record<string, unknown>) => Promise<unknown>;
  count: (args: Record<string, unknown>) => Promise<number>;
}

/**
 * Shared findById helper for repositories operating on a single
 * Prisma model. Repositories call this instead of writing boilerplate.
 */
export async function findById(model: ModelDelegate, id: string): Promise<unknown> {
  return model.findUnique({ where: { id } });
}

/**
 * Shared exists helper for repositories operating on a single
 * Prisma model.
 */
export async function exists(model: ModelDelegate, id: string): Promise<boolean> {
  const count = await model.count({ where: { id } });
  return count > 0;
}

/**
 * Convenience type for repositories that need a PrismaService.
 */
export type RepositoryContext = { prisma: PrismaService };
