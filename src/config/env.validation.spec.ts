import { envSchema, validateEnv } from './env.validation';

describe('envSchema', () => {
  const minimal = {
    DATABASE_URL: 'postgresql://x:y@localhost:5432/db',
    REDIS_URL: 'redis://localhost:6379',
  };

  it('accepts the minimal required variables', () => {
    const result = envSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe('development');
      expect(result.data.PORT).toBe(3000);
      expect(result.data.LOG_LEVEL).toBe('info');
    }
  });

  it('coerces PORT from string', () => {
    const result = envSchema.safeParse({ ...minimal, PORT: '8080' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.PORT).toBe(8080);
  });

  it('rejects an out-of-range PORT', () => {
    const result = envSchema.safeParse({ ...minimal, PORT: '70000' });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown LOG_LEVEL', () => {
    const result = envSchema.safeParse({ ...minimal, LOG_LEVEL: 'silly' });
    expect(result.success).toBe(false);
  });

  it('rejects when DATABASE_URL is missing', () => {
    const result = envSchema.safeParse({ REDIS_URL: 'redis://localhost' });
    expect(result.success).toBe(false);
  });

  it('accepts VAPID optional fields', () => {
    const result = envSchema.safeParse({
      ...minimal,
      VAPID_PUBLIC_KEY: 'pub',
      VAPID_PRIVATE_KEY: 'priv',
      VAPID_SUBJECT: 'mailto:admin@taksees.app',
    });
    expect(result.success).toBe(true);
  });
});

describe('validateEnv', () => {
  it('returns a typed Env on success', () => {
    const env = validateEnv({
      DATABASE_URL: 'postgresql://x:y@localhost:5432/db',
      REDIS_URL: 'redis://localhost:6379',
    });
    expect(env.PORT).toBe(3000);
    expect(env.STORAGE_DIR).toBe('./storage');
  });

  it('throws a readable error on failure', () => {
    expect(() => validateEnv({ REDIS_URL: 'redis://x' })).toThrow(/DATABASE_URL/);
  });
});
