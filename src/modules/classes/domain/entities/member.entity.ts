import { Prisma } from '@prisma/client';
import { Phone } from '../value-objects/phone.vo';

export class Member {
  private constructor(
    public readonly id: string,
    public readonly classId: string,
    public readonly userId: string | null,
    public fullName: string,
    public phone: Phone | null,
    public isActive: boolean,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  static fromPrisma(row: Prisma.MemberGetPayload<true>): Member {
    return new Member(
      row.id,
      row.classId,
      row.userId ?? null,
      row.fullName,
      row.phone ? Phone.parse(row.phone) : null,
      row.isActive,
      row.createdAt,
      row.updatedAt,
    );
  }

  updateContact(fullName: string, phone: Phone | null): void {
    this.fullName = fullName;
    this.phone = phone;
  }

  deactivate(): void {
    this.isActive = false;
  }

  reactivate(): void {
    this.isActive = true;
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      classId: this.classId,
      userId: this.userId,
      fullName: this.fullName,
      phone: this.phone?.value ?? null,
      isActive: this.isActive,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
