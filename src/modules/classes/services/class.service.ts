import { Inject, Injectable } from '@nestjs/common';
import {
  CreateClassInput,
  IClassRepository,
  IUserDirectory,
  ListClassesFilter,
  PageInfo,
  Paginated,
  UpdateClassInput,
} from '../domain/interfaces/repositories.interface';
import { Class } from '../domain/entities/class.entity';
import { ClassNotFoundError, LeaderMustBeAUserError } from '../domain/errors/classes.errors';

export const CLASS_REPOSITORY = Symbol('CLASS_REPOSITORY');
export const USER_DIRECTORY = Symbol('USER_DIRECTORY');

@Injectable()
export class ClassService {
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly repo: IClassRepository,
    @Inject(USER_DIRECTORY) private readonly users: IUserDirectory,
  ) {}

  async list(filter: ListClassesFilter, page: PageInfo): Promise<Paginated<Class>> {
    return this.repo.list(filter, page);
  }

  async getById(id: string): Promise<Class> {
    const klass = await this.repo.findById(id);
    if (!klass) throw new ClassNotFoundError(id);
    return klass;
  }

  async create(input: CreateClassInput): Promise<Class> {
    if (!(await this.users.exists(input.leaderId))) {
      throw new LeaderMustBeAUserError(input.leaderId);
    }
    return this.repo.create(input);
  }

  async update(id: string, input: UpdateClassInput): Promise<Class> {
    // Ensure the class exists first so we get a clean 404 vs FK error.
    await this.getById(id);
    if (input.leaderId && !(await this.users.exists(input.leaderId))) {
      throw new LeaderMustBeAUserError(input.leaderId);
    }
    return this.repo.update(id, input);
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await this.repo.delete(id);
  }
}
