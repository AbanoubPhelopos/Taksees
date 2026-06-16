import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Class } from '../domain/entities/class.entity';
import {
  CreateClassInput,
  IClassRepository,
  ListClassesFilter,
  PageInfo,
  Paginated,
  UpdateClassInput,
} from '../domain/interfaces/repositories.interface';

@Injectable()
export class PrismaClassRepository implements IClassRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Class | null> {
    const row = await this.prisma.class.findUnique({ where: { id } });
    return row ? Class.fromPrisma(row) : null;
  }

  async findByLeaderId(leaderId: string): Promise<Class | null> {
    const row = await this.prisma.class.findUnique({ where: { leaderId } });
    return row ? Class.fromPrisma(row) : null;
  }

  async list(filter: ListClassesFilter, page: PageInfo): Promise<Paginated<Class>> {
    const where = {
      ...(filter.level ? { level: filter.level } : {}),
      ...(filter.leaderId ? { leaderId: filter.leaderId } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.class.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page.page - 1) * page.limit,
        take: page.limit,
      }),
      this.prisma.class.count({ where }),
    ]);

    return {
      data: rows.map(Class.fromPrisma),
      meta: { page: page.page, limit: page.limit, total },
    };
  }

  async create(input: CreateClassInput): Promise<Class> {
    const row = await this.prisma.class.create({ data: input });
    return Class.fromPrisma(row);
  }

  async update(id: string, input: UpdateClassInput): Promise<Class> {
    const row = await this.prisma.class.update({ where: { id }, data: input });
    return Class.fromPrisma(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.class.delete({ where: { id } });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.class.count({ where: { id } });
    return count > 0;
  }
}
