import { Injectable, Logger } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from '../../infrastructure/database/prisma.service';

/**
 * Checks that Prisma can execute a trivial query (`SELECT 1`).
 */
@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(PrismaHealthIndicator.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (err) {
      this.logger.error('Prisma health check failed.', err as Error);
      throw new HealthCheckError(
        'Prisma check failed',
        this.getStatus(key, false, { message: (err as Error).message }),
      );
    }
  }
}
