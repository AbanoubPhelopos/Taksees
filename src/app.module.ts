import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule, Public as BetterAuthPublic } from '@thallesp/nestjs-better-auth';

import configuration, { AppConfig } from './config/configuration';
import { validateEnv } from './config/env.validation';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { RolesGuard } from './common/guards/roles.guard';

import { PrismaModule } from './infrastructure/database/prisma.module';
import { RedisModule } from './infrastructure/cache/redis.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { PushModule } from './infrastructure/push/push.module';

import { HealthModule } from './health/health.module';
import { ClassesModule } from './modules/classes/classes.module';

import { auth } from './auth/auth';

@Module({
  imports: [
    // Structured logging via pino. Pretty-print in dev, JSON in prod.
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const isDev =
          config.get('nodeEnv', { infer: true }) === 'development' ||
          config.get('nodeEnv', { infer: true }) === 'test';
        return {
          pinoHttp: {
            level: config.get('logLevel', { infer: true }),
            transport: isDev
              ? {
                  target: 'pino-pretty',
                  options: { singleLine: true, translateTime: 'SYS:HH:MM:ss.l' },
                }
              : undefined,
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.password',
                'req.body.token',
                '*.passwordHash',
              ],
              remove: true,
            },
            autoLogging: true,
            customProps: () => ({ service: 'taksees-api' }),
          },
        };
      },
    }),

    // Config — load + validate .env at boot. Fail-fast on missing vars.
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
      cache: true,
    }),

    // Cron / scheduled jobs
    ScheduleModule.forRoot(),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      useFactory: () => [
        {
          ttl: Number(process.env.THROTTLE_TTL ?? 60) * 1000,
          limit: Number(process.env.THROTTLE_LIMIT ?? 100),
        },
      ],
    }),

    // Better Auth — registers the global AuthGuard (req.session/req.user)
    // and the /api/auth/* handler routes. disableGlobalAuthGuard stays
    // false (default) so protected routes get the auth check for free.
    AuthModule.forRoot({ auth, isGlobal: true }),

    // Infrastructure
    PrismaModule,
    RedisModule,
    QueueModule,
    StorageModule,
    PushModule,

    // Health
    HealthModule,

    // Feature modules (added per phase)
    ClassesModule,
  ],
  providers: [
    // Global filters (order matters: Prisma first, then generic)
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },

    // Global interceptors
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useFactory: () => new TimeoutInterceptor(30_000) },

    // Global throttler
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // RolesGuard is global so any controller can opt-in via @Roles(...)
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

// Re-export the Public marker so any module that needs to opt out
// of the global AuthGuard can `import { Public } from '../app.module'`
// without taking a dependency on the better-auth package.
export const Public = BetterAuthPublic;

// Re-export for type-safe ConfigService consumers.
export type { AppConfig };
