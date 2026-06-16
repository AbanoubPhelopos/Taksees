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

  // Google OAuth (Better Auth)
  // All four are optional in dev so the seed and test suites can
  // boot without real Google credentials. In production they
  // are required.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z
    .string()
    .url()
    .default('http://localhost:3000/api/auth/callback/google'),
  GOOGLE_WORKSPACE_HD: z.string().optional(),

  // Bootstrap (seed only — never set in production)
  BOOTSTRAP_SUPER_ADMIN_EMAIL: z.string().email().optional(),
  BOOTSTRAP_SUPER_ADMIN_NAME: z.string().optional(),
  BOOTSTRAP_SUPER_ADMIN_PASSWORD: z.string().min(8).optional(),
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
