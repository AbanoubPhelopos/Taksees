import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './indicators/prisma.indicator';
import { RedisHealthIndicator } from './indicators/redis.indicator';
import { QueueHealthIndicator } from './indicators/queue.indicator';
import { DiskHealthIndicator } from './indicators/disk.indicator';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [
    PrismaHealthIndicator,
    RedisHealthIndicator,
    QueueHealthIndicator,
    DiskHealthIndicator,
  ],
})
export class HealthModule {}
