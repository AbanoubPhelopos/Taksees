/**
 * Centralized list of BullMQ queue names and job names.
 *
 * Use these constants instead of string literals throughout the
 * codebase. This is the single source of truth for queue topology.
 */
export const QUEUE_NAMES = {
  ABSENCE_GENERATE: 'absence.generate',
  NOTIFICATIONS_PUSH: 'notifications.push',
  LEADERBOARD_UPDATE: 'leaderboard.update',
  ANALYTICS_PROCESS: 'analytics.process',
  NOTIFICATIONS_PUSH_DLQ: 'notifications.push.dlq',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/** Default retry policy: 3 attempts, exponential backoff. */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5_000 },
  removeOnComplete: { age: 24 * 3600, count: 1000 },
  removeOnFail: { age: 7 * 24 * 3600 },
} as const;
