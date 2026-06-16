import { Injectable, Logger } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { QUEUE_NAMES, QueueName } from '../../infrastructure/queue/queue.constants';

/**
 * Inspects every registered BullMQ queue's depth.
 *
 * Reports:
 * - waiting
 * - active
 * - failed
 * - delayed
 *
 * Throws if any queue has more than `warningThreshold` failed jobs.
 */
@Injectable()
export class QueueHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(QueueHealthIndicator.name);
  private readonly warningThreshold = 100;

  constructor(
    @InjectQueue(QUEUE_NAMES.ABSENCE_GENERATE) private readonly absenceQ: Queue,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS_PUSH) private readonly pushQ: Queue,
    @InjectQueue(QUEUE_NAMES.LEADERBOARD_UPDATE) private readonly lbQ: Queue,
    @InjectQueue(QUEUE_NAMES.ANALYTICS_PROCESS) private readonly analyticsQ: Queue,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const queues: Array<[string, Queue]> = [
      ['absence', this.absenceQ],
      ['notifications', this.pushQ],
      ['leaderboard', this.lbQ],
      ['analytics', this.analyticsQ],
    ];

    const details: Record<string, unknown> = {};
    let anyFailing = false;

    for (const [name, q] of queues) {
      try {
        const counts = await q.getJobCounts('waiting', 'active', 'failed', 'delayed', 'completed');
        details[name] = counts;
        if ((counts.failed ?? 0) > this.warningThreshold) {
          anyFailing = true;
        }
      } catch (err) {
        this.logger.error(`Queue ${name} health check failed.`, err as Error);
        details[name] = { error: (err as Error).message };
        anyFailing = true;
      }
    }

    const result = this.getStatus(key, !anyFailing, details);
    if (anyFailing) {
      throw new HealthCheckError('One or more queues are unhealthy', result);
    }
    return result;
  }
}

// Re-export so the symbol is unambiguous.
export type { QueueName };
