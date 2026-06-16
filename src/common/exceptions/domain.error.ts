import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base class for all domain errors.
 *
 * Subclasses set a stable `code` (used in logs and 4xx response bodies)
 * and an HTTP `status` (defaults to 400 for client errors, 500 for
 * unexpected). Mapped to RFC 7807 ProblemDetails by
 * `HttpExceptionFilter`.
 *
 * Use this for **expected** business failures (validation, not found,
 * conflict, forbidden). Reserve plain `Error` for unexpected
 * programmer/runtime errors.
 */
export abstract class DomainError extends HttpException {
  /** Stable machine-readable code (e.g., `CLASS_NOT_FOUND`). */
  public abstract readonly code: string;

  /** Optional structured context. Safe to log. */
  public abstract readonly context?: Record<string, unknown>;

  protected constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super({ statusCode: status, message }, status);
  }

  /**
   * Convert to a ProblemDetails body.
   */
  toProblemDetails(instance?: string, traceId?: string): Record<string, unknown> {
    return {
      type: `https://taksees.app/errors/${this.code.toLowerCase().replace(/_/g, '-')}`,
      title: this.constructor.name.replace(/Error$/, ''),
      status: this.getStatus(),
      detail: this.message,
      code: this.code,
      ...(this.context ? { context: this.context } : {}),
      ...(instance ? { instance } : {}),
      ...(traceId ? { traceId } : {}),
    };
  }
}
