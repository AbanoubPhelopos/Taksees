import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

/**
 * Adds an `X-Request-Id` header to every response and logs request
 * duration. The id is also attached to the request object so other
 * filters and interceptors can use it.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const requestId = (req.headers['x-request-id'] as string | undefined) ?? `req_${randomUUID()}`;
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-Id', requestId);

    const start = process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Number((process.hrtime.bigint() - start) / 1_000_000n);
          this.logger.log(
            `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms [${requestId}]`,
          );
        },
        error: () => {
          const durationMs = Number((process.hrtime.bigint() - start) / 1_000_000n);
          this.logger.warn(`${req.method} ${req.originalUrl} ERR ${durationMs}ms [${requestId}]`);
        },
      }),
    );
  }
}
