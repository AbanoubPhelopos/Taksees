import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';

/**
 * Worker entrypoint.
 *
 * Runs the same Nest application as `main.ts` but does NOT bind a
 * HTTP port. It hosts:
 * - BullMQ Workers (producers and consumers)
 * - Cron jobs (auto-close, cleanup)
 *
 * To run: `node dist/worker.js`
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(PinoLogger));
  app.enableShutdownHooks();

  const logger = new Logger('Worker');
  logger.log('Taksees worker context initialised.');

  // Keep the process alive. Nest closes the context on SIGTERM / SIGINT.
  process.on('SIGTERM', () => {
    logger.log('SIGTERM received. Shutting down…');
    app.close().then(() => process.exit(0));
  });
  process.on('SIGINT', () => {
    logger.log('SIGINT received. Shutting down…');
    app.close().then(() => process.exit(0));
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal: failed to start worker context.', err);
  process.exit(1);
});
