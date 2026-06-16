import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma/client';

/**
 * Better Auth instance for Taksees.
 *
 * This module owns a dedicated PrismaClient. Better Auth manages
 * its own connection pool through the prismaAdapter — sharing the
 * app's PrismaService (a Nest injectable) isn't possible because
 * Better Auth needs a static client at module-load time, before
 * the Nest DI container exists.
 *
 * Schema lives in prisma/schema.prisma. The two additional fields
 * `phone` and `role` are exposed to the signup flow so the seed
 * (and any other client) can set them in one round trip.
 */
const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },

  user: {
    additionalFields: {
      // phone is optional; not editable via the signup form by default
      // (admins can update it later through the Better Auth admin API
      // or directly via Prisma).
      phone: {
        type: 'string',
        required: false,
        input: false,
      },
      // Church-specific role: SUPER_ADMIN | LEADER | SERVANT | MEMBER.
      // Default is SERVANT for every new signup; SUPER_ADMIN is set
      // by hand via Prisma or the admin plugin's setRole API.
      role: {
        type: 'string',
        required: false,
        defaultValue: 'SERVANT',
        input: true,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 1 week
    updateAge: 60 * 60 * 24, // refresh sliding window every 24h
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5-minute in-memory cache
    },
  },

  advanced: {
    cookiePrefix: 'taksees',
  },

  trustedOrigins: ['http://localhost:3000', 'http://localhost:5173'],
});

export type Auth = typeof auth;
