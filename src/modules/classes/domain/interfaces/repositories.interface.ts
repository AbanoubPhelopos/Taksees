import { Class } from '../entities/class.entity';
import { Member } from '../entities/member.entity';
import { ClassLevel } from '../value-objects/class-level.vo';
import { Phone } from '../value-objects/phone.vo';

export interface CreateClassInput {
  name: string;
  level: ClassLevel;
  leaderId: string;
}

export interface UpdateClassInput {
  name?: string;
  level?: ClassLevel;
  leaderId?: string;
}

export interface ListClassesFilter {
  level?: ClassLevel;
  leaderId?: string;
}

export interface PageInfo {
  page: number;
  limit: number;
  total: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageInfo;
}

export interface CreateMemberInput {
  classId: string;
  fullName: string;
  phone?: Phone | null;
  userId?: string | null;
}

export interface BulkCreateMembersInput {
  classId: string;
  members: Array<{ fullName: string; phone?: string | null; userId?: string | null }>;
}

export interface UpdateMemberInput {
  fullName?: string;
  phone?: Phone | null;
  isActive?: boolean;
}

export interface ListMembersFilter {
  q?: string;
  isActive?: boolean;
}

export interface IClassRepository {
  findById(id: string): Promise<Class | null>;
  findByLeaderId(leaderId: string): Promise<Class | null>;
  list(filter: ListClassesFilter, page: PageInfo): Promise<Paginated<Class>>;
  create(input: CreateClassInput): Promise<Class>;
  update(id: string, input: UpdateClassInput): Promise<Class>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

export interface IMemberRepository {
  findById(id: string): Promise<Member | null>;
  listByClass(
    classId: string,
    filter: ListMembersFilter,
    page: PageInfo,
  ): Promise<Paginated<Member>>;
  create(input: CreateMemberInput): Promise<Member>;
  createMany(inputs: CreateMemberInput[]): Promise<number>;
  update(id: string, input: UpdateMemberInput): Promise<Member>;
  setActive(id: string, isActive: boolean): Promise<Member>;
}

export interface IServantClassRepository {
  isAssigned(servantId: string, classId: string): Promise<boolean>;
  assign(servantId: string, classId: string): Promise<void>;
  unassign(servantId: string, classId: string): Promise<void>;
  listByClass(classId: string): Promise<{ userId: string }[]>;
  listByUser(userId: string): Promise<{ classId: string }[]>;
}

export interface IUserDirectory {
  exists(id: string): Promise<boolean>;
  existsMany(ids: string[]): Promise<Set<string>>;
  countServants(ids: string[]): Promise<number>;
}
