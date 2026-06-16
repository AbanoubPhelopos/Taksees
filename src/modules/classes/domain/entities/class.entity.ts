import { Prisma } from '@prisma/client';
import { ClassLevel } from '../value-objects/class-level.vo';

/**
 * Class — pure domain entity reconstructed from a Prisma row.
 *
 * The entity is the only place business invariants live. Services
 * and controllers must always operate on `Class`, never on raw
 * Prisma shapes.
 */
export class Class {
  private constructor(
    public readonly id: string,
    public name: string,
    public level: ClassLevel,
    public readonly leaderId: string,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  static fromPrisma(row: Prisma.ClassGetPayload<true>): Class {
    return new Class(
      row.id,
      row.name,
      row.level as ClassLevel,
      row.leaderId,
      row.createdAt,
      row.updatedAt,
    );
  }

  rename(name: string): void {
    this.name = name;
  }

  changeLevel(level: ClassLevel): void {
    this.level = level;
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      level: this.level,
      leaderId: this.leaderId,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
