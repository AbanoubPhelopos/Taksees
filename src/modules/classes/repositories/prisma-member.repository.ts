import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Member } from '../domain/entities/member.entity';
import {
  CreateMemberInput,
  IMemberRepository,
  ListMembersFilter,
  PageInfo,
  Paginated,
  UpdateMemberInput,
} from '../domain/interfaces/repositories.interface';

@Injectable()
export class PrismaMemberRepository implements IMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Member | null> {
    const row = await this.prisma.member.findUnique({ where: { id } });
    return row ? Member.fromPrisma(row) : null;
  }

  async listByClass(
    classId: string,
    filter: ListMembersFilter,
    page: PageInfo,
  ): Promise<Paginated<Member>> {
    const where = {
      classId,
      ...(filter.isActive !== undefined ? { isActive: filter.isActive } : {}),
      ...(filter.q ? { fullName: { contains: filter.q, mode: 'insensitive' as const } } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.member.findMany({
        where,
        orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }],
        skip: (page.page - 1) * page.limit,
        take: page.limit,
      }),
      this.prisma.member.count({ where }),
    ]);

    return {
      data: rows.map(Member.fromPrisma),
      meta: { page: page.page, limit: page.limit, total },
    };
  }

  async create(input: CreateMemberInput): Promise<Member> {
    const row = await this.prisma.member.create({
      data: {
        classId: input.classId,
        fullName: input.fullName,
        phone: input.phone ? input.phone.value : null,
        userId: input.userId ?? null,
      },
    });
    return Member.fromPrisma(row);
  }

  async createMany(inputs: CreateMemberInput[]): Promise<number> {
    const data = inputs.map((input) => ({
      classId: input.classId,
      fullName: input.fullName,
      phone: input.phone ? input.phone.value : null,
      userId: input.userId ?? null,
    }));
    const result = await this.prisma.member.createMany({ data, skipDuplicates: true });
    return result.count;
  }

  async update(id: string, input: UpdateMemberInput): Promise<Member> {
    const data: Record<string, unknown> = {};
    if (input.fullName !== undefined) data.fullName = input.fullName;
    if (input.phone !== undefined) data.phone = input.phone ? input.phone.value : null;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    const row = await this.prisma.member.update({ where: { id }, data });
    return Member.fromPrisma(row);
  }

  async setActive(id: string, isActive: boolean): Promise<Member> {
    const row = await this.prisma.member.update({
      where: { id },
      data: { isActive },
    });
    return Member.fromPrisma(row);
  }
}
