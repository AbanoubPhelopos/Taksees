import { Env } from './env.validation';

/**
 * Typed configuration factory.
 *
 * Registered WITHOUT a namespace (no `registerAs`) so the
 * ConfigService is keyed by the top-level property names
 * (`nodeEnv`, `port`, etc.) — which makes `config.get('nodeEnv', { infer: true })`
 * infer the correct type.
 */
export interface AppConfig {
  nodeEnv: Env['NODE_ENV'];
  port: Env['PORT'];
  logLevel: Env['LOG_LEVEL'];
  databaseUrl: string;
  redisUrl: string;
  storageDir: string;
  corsOrigins: string[];
  throttler: { ttl: number; limit: number };
  vapid: {
    publicKey?: string;
    privateKey?: string;
    subject?: string;
  };
  fileSigningSecret: string;
}

export default (): AppConfig => {
  const env = process.env as unknown as Env;
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
    storageDir: env.STORAGE_DIR,
    corsOrigins: env.CORS_ORIGINS
      ? env.CORS_ORIGINS.split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    throttler: {
      ttl: env.THROTTLE_TTL,
      limit: env.THROTTLE_LIMIT,
    },
    vapid: {
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY,
      subject: env.VAPID_SUBJECT,
    },
    fileSigningSecret: env.FILE_SIGNING_SECRET,
  };
};
