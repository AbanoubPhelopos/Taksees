import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AppConfig } from '../../config/configuration';
import { REDIS_CLIENT, RedisService } from './redis.service';

/**
 * Provides a single shared ioredis client.
 *
 * BullMQ gets its own connection from the same factory (see
 * `QueueModule`); we intentionally don't share the client with
 * BullMQ's blocking commands to avoid stalls.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const redisUrl = config.get('redisUrl', { infer: true });
        return new Redis(redisUrl, {
          maxRetriesPerRequest: null, // required for BullMQ
          enableReadyCheck: true,
        });
      },
    },
    RedisService,
  ],
  exports: [RedisService, REDIS_CLIENT],
})
export class RedisModule {}
