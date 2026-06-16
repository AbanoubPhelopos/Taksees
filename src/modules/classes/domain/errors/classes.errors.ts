import { HttpStatus } from '@nestjs/common';
import { DomainError } from '../../../../common/exceptions/domain.error';

/**
 * Thrown when a business rule is violated. Maps to 422.
 */
export abstract class ClassesDomainError extends DomainError {
  protected constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class ClassNotFoundError extends ClassesDomainError {
  constructor(classId: string) {
    super(`Class ${classId} not found.`, 'CLASS_NOT_FOUND', { classId });
  }
}

export class MemberNotFoundError extends ClassesDomainError {
  constructor(memberId: string) {
    super(`Member ${memberId} not found.`, 'MEMBER_NOT_FOUND', { memberId });
  }
}

export class ServantAssignmentExistsError extends ClassesDomainError {
  constructor(servantId: string, classId: string) {
    super(
      `Servant ${servantId} is already assigned to class ${classId}.`,
      'SERVANT_ALREADY_ASSIGNED',
      { servantId, classId },
    );
  }
}

export class LeaderMustBeAUserError extends ClassesDomainError {
  constructor(leaderId: string) {
    super(`Leader user ${leaderId} does not exist.`, 'LEADER_USER_NOT_FOUND', { leaderId });
  }
}

export class ServantMustBeAUserError extends ClassesDomainError {
  constructor(servantId: string) {
    super(`Servant user ${servantId} does not exist.`, 'SERVANT_USER_NOT_FOUND', { servantId });
  }
}
