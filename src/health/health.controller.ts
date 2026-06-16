import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckResult, HealthCheckService } from '@nestjs/terminus';
import { ApiTags } from '@nestjs/swagger';
import { PrismaHealthIndicator } from './indicators/prisma.indicator';
import { RedisHealthIndicator } from './indicators/redis.indicator';
import { QueueHealthIndicator } from './indicators/queue.indicator';
import { DiskHealthIndicator } from './indicators/disk.indicator';

/**
 * Liveness + readiness probe endpoint.
 *
 * Returns 200 with all indicators green, 503 if any fail.
 * Safe to expose on a public path because the indicators reveal
 * no secrets.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly queues: QueueHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.prisma.isHealthy('database'),
      () => this.redis.isHealthy('redis'),
      () => this.queues.isHealthy('queues'),
      () => this.disk.isHealthy('disk'),
    ]);
  }
}
