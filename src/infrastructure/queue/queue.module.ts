import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import { DEFAULT_JOB_OPTIONS, QUEUE_NAMES } from './queue.constants';

/**
 * Wires up BullMQ with the Redis URL from config and pre-registers
 * every known queue. Feature modules that need to add jobs simply
 * `@InjectQueue(<NAME>)` the constant.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const redisUrl = config.get('redisUrl', { infer: true });
        return {
          connection: { url: redisUrl },
          defaultJobOptions: DEFAULT_JOB_OPTIONS,
        };
      },
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.ABSENCE_GENERATE },
      { name: QUEUE_NAMES.NOTIFICATIONS_PUSH },
      { name: QUEUE_NAMES.LEADERBOARD_UPDATE },
      { name: QUEUE_NAMES.ANALYTICS_PROCESS },
      { name: QUEUE_NAMES.NOTIFICATIONS_PUSH_DLQ },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
