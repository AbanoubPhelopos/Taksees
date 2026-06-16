import { z } from 'zod';

/**
 * Environment variable schema.
 *
 * Validated at boot via `ConfigModule({ validate: envSchema, validateOnStart: true })`.
 * Adding a new env var? Add it here first, then expose via `configuration.ts`.
 */
export const envSchema = z.object({
  // Runtime
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Redis
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // Storage
  STORAGE_DIR: z.string().min(1).default('./storage'),

  // CORS — comma-separated
  CORS_ORIGINS: z.string().optional(),

  // Throttler
  THROTTLE_TTL: z.coerce.number().int().min(1).default(60),
  THROTTLE_LIMIT: z.coerce.number().int().min(1).default(100),

  // VAPID (browser push)
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().email().or(z.string().startsWith('mailto:')).optional(),

  // File signing
  FILE_SIGNING_SECRET: z.string().min(16).default('change-me-in-production-please'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Helper: parse and return a typed env object.
 * Throws a human-readable error if validation fails.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${formatted}`);
  }
  return result.data;
}
