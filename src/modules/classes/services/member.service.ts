import { Inject, Injectable } from '@nestjs/common';
import { Phone } from '../domain/value-objects/phone.vo';
import {
  CreateMemberInput,
  IClassRepository,
  IMemberRepository,
  ListMembersFilter,
  PageInfo,
  Paginated,
  UpdateMemberInput,
} from '../domain/interfaces/repositories.interface';
import { Member } from '../domain/entities/member.entity';
import { ClassNotFoundError, MemberNotFoundError } from '../domain/errors/classes.errors';
import { CLASS_REPOSITORY } from './class.service';

export const MEMBER_REPOSITORY = Symbol('MEMBER_REPOSITORY');

export interface BulkAddResult {
  created: number;
  items: Member[];
}

@Injectable()
export class MemberService {
  constructor(
    @Inject(MEMBER_REPOSITORY) private readonly members: IMemberRepository,
    @Inject(CLASS_REPOSITORY) private readonly classes: IClassRepository,
  ) {}

  async list(
    classId: string,
    filter: ListMembersFilter,
    page: PageInfo,
  ): Promise<Paginated<Member>> {
    if (!(await this.classes.exists(classId))) throw new ClassNotFoundError(classId);
    return this.members.listByClass(classId, filter, page);
  }

  async getById(id: string): Promise<Member> {
    const member = await this.members.findById(id);
    if (!member) throw new MemberNotFoundError(id);
    return member;
  }

  async addOne(
    classId: string,
    raw: { fullName: string; phone?: string | null; userId?: string | null },
  ): Promise<Member> {
    if (!(await this.classes.exists(classId))) throw new ClassNotFoundError(classId);
    const input: CreateMemberInput = {
      classId,
      fullName: raw.fullName,
      phone: raw.phone ? Phone.parse(raw.phone) : null,
      userId: raw.userId ?? null,
    };
    return this.members.create(input);
  }

  async addBulk(
    classId: string,
    rows: Array<{ fullName: string; phone?: string | null; userId?: string | null }>,
  ): Promise<BulkAddResult> {
    if (!(await this.classes.exists(classId))) throw new ClassNotFoundError(classId);
    const inputs: CreateMemberInput[] = rows.map((row) => ({
      classId,
      fullName: row.fullName,
      phone: row.phone ? Phone.parse(row.phone) : null,
      userId: row.userId ?? null,
    }));
    const created = await this.members.createMany(inputs);
    // Re-fetch the latest batch for the response — bounded by the request size.
    const page: PageInfo = { page: 1, limit: inputs.length, total: created };
    const { data } = await this.members.listByClass(classId, {}, page);
    return { created, items: data };
  }

  async update(
    id: string,
    input: { fullName?: string; phone?: string | null; isActive?: boolean },
  ): Promise<Member> {
    await this.getById(id);
    const dto: UpdateMemberInput = {
      ...input,
      phone:
        input.phone === undefined
          ? undefined
          : input.phone === null
            ? null
            : Phone.parse(input.phone),
    };
    return this.members.update(id, dto);
  }

  async setActive(id: string, isActive: boolean): Promise<Member> {
    await this.getById(id);
    return this.members.setActive(id, isActive);
  }
}
