import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma client wrapped as a Nest service.
 *
 * - Calls `enableShutdownHooks` on init so Prisma receives
 *   `beforeExit` and cleans up gracefully.
 * - Logs lifecycle events.
 *
 * Repositories should depend on this service (or a sub-client) instead
 * of importing `@prisma/client` directly in business code.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    // Best-effort ping so a wrong DATABASE_URL fails fast.
    try {
      await this.$connect();
      this.logger.log('Connected to database.');
    } catch (err) {
      this.logger.error('Failed to connect to database.', err as Error);
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Disconnected from database.');
  }
}
