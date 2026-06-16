import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainError } from '../exceptions/domain.error';
import { randomUUID } from 'node:crypto';

/**
 * Maps every exception to an RFC 7807 ProblemDetails response.
 *
 * - `DomainError` subclasses use their own `code` and `context`.
 * - `HttpException` uses its status and message.
 * - Unknown errors are sanitized to a 500 with a traceId.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const traceId = (request.headers['x-request-id'] as string) || randomUUID();

    const problem = this.toProblemDetails(exception, request.url, traceId);
    const status = (problem.status as number) ?? HttpStatus.INTERNAL_SERVER_ERROR;

    // Log unexpected (5xx) with stack; expected (4xx) at debug.
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status} ${problem.title ?? ''}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.debug(
        `${request.method} ${request.url} → ${status} ${problem.title ?? ''}: ${problem.detail ?? ''}`,
      );
    }

    response.setHeader('X-Request-Id', traceId);
    response.status(status).json(problem);
  }

  private toProblemDetails(
    exception: unknown,
    instance: string,
    traceId: string,
  ): Record<string, unknown> {
    if (exception instanceof DomainError) {
      return exception.toProblemDetails(instance, traceId);
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const body: Record<string, unknown> =
        typeof response === 'string' ? {} : (response as Record<string, unknown>);
      const message = (body.message as string | string[] | undefined) ?? exception.message;
      // Preserve structured extras (e.g. `errors` from the Zod pipe).
      const extras: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(body)) {
        if (k !== 'message' && k !== 'statusCode' && k !== 'error') {
          extras[k] = v;
        }
      }
      return {
        type: `https://taksees.app/errors/http-${status}`,
        title: HttpStatus[status] ?? 'Error',
        status,
        detail: Array.isArray(message) ? message.join('; ') : message,
        instance,
        traceId,
        ...extras,
      };
    }

    return {
      type: 'https://taksees.app/errors/internal',
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'An unexpected error occurred.',
      instance,
      traceId,
    };
  }
}
