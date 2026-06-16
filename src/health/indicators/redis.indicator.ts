import { Injectable, Logger } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { RedisService } from '../../infrastructure/cache/redis.service';

/**
 * Checks that Redis answers `PING` with `PONG`.
 */
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(RedisHealthIndicator.name);

  constructor(private readonly redis: RedisService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const reply = await this.redis.ping();
      const ok = reply === 'PONG';
      const result = this.getStatus(key, ok, { reply });
      if (!ok) {
        throw new HealthCheckError('Redis did not reply PONG', result);
      }
      return result;
    } catch (err) {
      if (err instanceof HealthCheckError) throw err;
      this.logger.error('Redis health check failed.', err as Error);
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, { message: (err as Error).message }),
      );
    }
  }
}
