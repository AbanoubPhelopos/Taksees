import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { randomUUID } from 'node:crypto';

/**
 * Maps Prisma errors to RFC 7807 responses.
 *
 * - `P2002` (unique violation) → 409
 * - `P2025` (record not found) → 404
 * - `P2003` (FK violation) → 400
 * - everything else → 500
 *
 * Registered BEFORE the generic `HttpExceptionFilter` so it has
 * priority for Prisma errors.
 */
@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const traceId = (request.headers['x-request-id'] as string) || randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Database Error';
    let detail = 'A database error occurred.';
    let code = 'DATABASE_ERROR';

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          status = HttpStatus.CONFLICT;
          title = 'Conflict';
          const target = (exception.meta?.target as string[] | undefined) ?? ['field'];
          detail = `A record with this ${target.join(', ')} already exists.`;
          code = 'UNIQUE_VIOLATION';
          break;
        }
        case 'P2025': {
          status = HttpStatus.NOT_FOUND;
          title = 'Not Found';
          detail = 'The requested record was not found.';
          code = 'RECORD_NOT_FOUND';
          break;
        }
        case 'P2003': {
          status = HttpStatus.BAD_REQUEST;
          title = 'Bad Request';
          detail = 'A referenced record does not exist.';
          code = 'FOREIGN_KEY_VIOLATION';
          break;
        }
        default: {
          this.logger.error(`Unhandled Prisma error code: ${exception.code}`, exception.stack);
        }
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      title = 'Validation Error';
      detail = 'Invalid input passed to the database client.';
      code = 'PRISMA_VALIDATION';
      this.logger.error('Prisma validation error', exception.message);
    }

    response.setHeader('X-Request-Id', traceId);
    response.status(status).json({
      type: `https://taksees.app/errors/${code.toLowerCase().replace(/_/g, '-')}`,
      title,
      status,
      detail,
      code,
      instance: request.url,
      traceId,
    });
  }
}
