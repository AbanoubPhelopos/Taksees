import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

/**
 * ioredis wrapper exposed as a Nest service.
 *
 * Used by:
 * - BullMQ (consumes the connection for queues/workers)
 * - Application code (cache, ZSET, idempotency keys, etc.)
 *
 * Multiple connections can be created later (e.g., a separate
 * subscriber connection) by binding the `REDIS_CLIENT` token to
 * a different factory.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private _client: Redis;

  constructor(@Inject(REDIS_CLIENT) client: Redis) {
    this._client = client;
  }

  /** Underlying ioredis client. */
  get client(): Redis {
    return this._client;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this._client.ping();
      this.logger.log('Connected to Redis.');
    } catch (err) {
      this.logger.error('Failed to connect to Redis.', err as Error);
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this._client.quit();
    this.logger.log('Disconnected from Redis.');
  }

  /** Health check helper used by the `/health` indicator. */
  async ping(): Promise<string> {
    return this._client.ping();
  }
}
