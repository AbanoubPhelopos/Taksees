import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

import { AppModule, AppConfig } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // ─── Logging ──────────────────────────────────────────────────
  app.useLogger(app.get(PinoLogger));

  // ─── Security ─────────────────────────────────────────────────
  app.use(helmet());

  const config = app.get(ConfigService) as ConfigService<AppConfig, true>;

  // ─── CORS ─────────────────────────────────────────────────────
  const origins = config.get('corsOrigins', { infer: true }) ?? [];
  app.enableCors({
    origin: origins.length > 0 ? origins : true,
    credentials: true,
  });

  // ─── Body parsing ─────────────────────────────────────────────
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (!req.headers['x-request-id']) {
      req.headers['x-request-id'] = `req_${randomUUID()}`;
    }
    next();
  });
  app.useBodyParser('json', { limit: '1mb' });

  // ─── Global validation pipe (fallback for class-validator DTOs).
  //    Zod-validated routes use ZodValidationPipe at the controller level.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // ─── API versioning via global prefix ─────────────────────────
  app.setGlobalPrefix('api', {
    exclude: ['health', 'docs', 'docs-json'],
  });

  // ─── Swagger / OpenAPI ────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Taksees API')
    .setDescription('Multi-class Sunday-school management backend.')
    .setVersion('0.1.0')
    .addApiKey({ type: 'apiKey', name: 'X-Class-Id', in: 'header' }, 'X-Class-Id')
    .addApiKey({ type: 'apiKey', name: 'Idempotency-Key', in: 'header' }, 'Idempotency-Key')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // ─── Graceful shutdown ────────────────────────────────────────
  app.enableShutdownHooks();

  const port = config.get('port', { infer: true });
  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`Taksees API listening on http://0.0.0.0:${port}`);
  logger.log(`Swagger UI:   http://0.0.0.0:${port}/docs`);
  logger.log(`Health:       http://0.0.0.0:${port}/health`);
  logger.log(`Environment:  ${config.get('nodeEnv', { infer: true })}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal: failed to bootstrap NestJS application.', err);
  process.exit(1);
});
