import { Inject, Injectable } from '@nestjs/common';
import {
  IClassRepository,
  IServantClassRepository,
  IUserDirectory,
} from '../domain/interfaces/repositories.interface';
import { ClassNotFoundError, ServantMustBeAUserError } from '../domain/errors/classes.errors';
import { CLASS_REPOSITORY } from './class.service';
import { USER_DIRECTORY } from './class.service';

export const SERVANT_CLASS_REPOSITORY = Symbol('SERVANT_CLASS_REPOSITORY');

export interface AssignResult {
  assigned: number;
  alreadyAssigned: number;
}

@Injectable()
export class ServantClassService {
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classes: IClassRepository,
    @Inject(SERVANT_CLASS_REPOSITORY) private readonly mapping: IServantClassRepository,
    @Inject(USER_DIRECTORY) private readonly users: IUserDirectory,
  ) {}

  async list(classId: string): Promise<{ userId: string }[]> {
    if (!(await this.classes.exists(classId))) throw new ClassNotFoundError(classId);
    return this.mapping.listByClass(classId);
  }

  async assign(classId: string, userIds: string[]): Promise<AssignResult> {
    if (!(await this.classes.exists(classId))) throw new ClassNotFoundError(classId);

    // Verify all users exist in one round trip.
    const known = await this.users.existsMany(userIds);
    const missing = userIds.filter((id) => !known.has(id));
    if (missing.length > 0) {
      throw new ServantMustBeAUserError(missing[0]!);
    }

    // Skip duplicates — the unique composite PK will reject re-inserts.
    const existing = await Promise.all(userIds.map((id) => this.mapping.isAssigned(id, classId)));

    let assigned = 0;
    let alreadyAssigned = 0;
    for (let i = 0; i < userIds.length; i += 1) {
      if (existing[i]) {
        alreadyAssigned += 1;
        continue;
      }
      try {
        await this.mapping.assign(userIds[i]!, classId);
        assigned += 1;
      } catch (err) {
        // Re-throw only on non-duplicate errors.
        const code = (err as { code?: string }).code;
        if (code === 'P2002') {
          alreadyAssigned += 1;
        } else {
          throw err;
        }
      }
    }
    return { assigned, alreadyAssigned };
  }

  async unassign(classId: string, userId: string): Promise<void> {
    if (!(await this.classes.exists(classId))) throw new ClassNotFoundError(classId);
    if (!(await this.mapping.isAssigned(userId, classId))) {
      // Idempotent unassign — nothing to do.
      return;
    }
    await this.mapping.unassign(userId, classId);
  }
}
