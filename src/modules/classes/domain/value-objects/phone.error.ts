import { HttpStatus } from '@nestjs/common';
import { DomainError } from '../../../../common/exceptions/domain.error';

/**
 * Thrown when a phone number cannot be normalized to E.164.
 * Maps to 422.
 */
export class InvalidPhoneError extends DomainError {
  readonly code = 'INVALID_PHONE';
  readonly context: Record<string, unknown>;

  constructor(input: string) {
    super(`Phone number "${input}" is not a valid E.164 number.`, HttpStatus.UNPROCESSABLE_ENTITY);
    this.context = { input };
  }
}
