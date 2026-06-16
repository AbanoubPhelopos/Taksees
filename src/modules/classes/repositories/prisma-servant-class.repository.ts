import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IServantClassRepository } from '../domain/interfaces/repositories.interface';

@Injectable()
export class PrismaServantClassRepository implements IServantClassRepository {
  constructor(private readonly prisma: PrismaService) {}

  async isAssigned(servantId: string, classId: string): Promise<boolean> {
    const count = await this.prisma.servantClass.count({
      where: { servantId, classId },
    });
    return count > 0;
  }

  async assign(servantId: string, classId: string): Promise<void> {
    await this.prisma.servantClass.create({ data: { servantId, classId } });
  }

  async unassign(servantId: string, classId: string): Promise<void> {
    await this.prisma.servantClass.delete({
      where: { servantId_classId: { servantId, classId } },
    });
  }

  async listByClass(classId: string): Promise<{ userId: string }[]> {
    return this.prisma.servantClass
      .findMany({
        where: { classId },
        select: { servantId: true },
      })
      .then((rows) => rows.map((r) => ({ userId: r.servantId })));
  }

  async listByUser(userId: string): Promise<{ classId: string }[]> {
    return this.prisma.servantClass
      .findMany({
        where: { servantId: userId },
        select: { classId: true },
      })
      .then((rows) => rows.map((r) => ({ classId: r.classId })));
  }
}
