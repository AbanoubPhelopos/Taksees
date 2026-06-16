import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins';
import { APIError } from 'better-auth/api';
import { PrismaClient } from '@prisma/client';

/**
 * Better Auth instance for Taksees.
 *
 * RBAC model:
 *   - 4 roles: super_admin, leader, servant, member
 *   - default role on any signup: member
 *   - admin plugin's /admin/* endpoints are reachable only by
 *     users with role in adminRoles (i.e. super_admin)
 *   - promotion to super_admin is REJECTED at the database
 *     layer — a before-hook on `user.update` throws when the
 *     new role is 'super_admin'. New super_admins are created
 *     only by direct Prisma writes (the seed, or the
 *     scripts/create-super-admin.ts recovery CLI).
 *   - account lock = user.banned = true (admin plugin sets it).
 *     Better Auth's global AuthGuard rejects every request from
 *     a banned user before any other check.
 *
 * Sign-up flow:
 *   - email/password: DISABLED — humans sign in with Google only
 *   - google oauth: enabled when GOOGLE_CLIENT_ID is set
 *   - accountLinking: enabled so the same email across
 *     providers ends up on the same user row
 *
 * Session storage:
 *   - HttpOnly cookies, SameSite=Lax, 1-week expiry
 *   - 5-minute in-memory cache (cookieCache) to keep the
 *     request-per-DB-user-hit low
 */
const prisma = new PrismaClient();

const isProd = process.env.NODE_ENV === 'production';

// Cast the result so the inferred type (which leaks zod v4
// internals via the databaseHooks signature) doesn't break
// downstream code that compiles with zod v3.
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  // No email/password sign-in. Humans sign in with Google.
  // The seed bypasses this by writing the first SUPER_ADMIN
  // via Prisma directly; subsequent SUPER_ADMINs are also
  // created via Prisma (the databaseHooks.user.update hook
  // refuses to promote anyone to super_admin).
  emailAndPassword: { enabled: false },

  // Account linking: same email across providers → same user.
  accountLinking: {
    enabled: true,
    trustedProviders: ['google'],
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirectURI: process.env.GOOGLE_REDIRECT_URI,
      // Workspace-only sign-in if the church is on Workspace.
      hd: process.env.GOOGLE_WORKSPACE_HD || undefined,
      scope: ['openid', 'email', 'profile'],
    },
  },

  plugins: [
    admin({
      // Every new user (including Google sign-ups) lands as member.
      defaultRole: 'member',
      // Only these roles grant access to /admin/* endpoints.
      adminRoles: ['super_admin'],
      // Message the AuthGuard returns for banned users.
      bannedUserMessage: 'Your account has been suspended. Contact a Taksees administrator.',
    }),
  ],

  // phone is the only domain-specific additional field we keep
  // — the role column is provided by the admin plugin schema
  // and must NOT be settable by the client at signup time.
  user: {
    additionalFields: {
      phone: { type: 'string', required: false, input: false },
    },
  },

  // Defense-in-depth: refuse to promote any user to super_admin
  // through the API. The admin plugin's set-role endpoint calls
  // user.update; this hook runs first and throws if the new
  // role is 'super_admin'. This works regardless of which
  // user-update path is taken (admin API, custom endpoint, or
  // even a plugin bug), so it's the strongest guard we can add
  // without forking the admin plugin.
  databaseHooks: {
    user: {
      update: {
        async before(user) {
          if ((user as { role?: string }).role === 'super_admin') {
            throw new APIError('FORBIDDEN', {
              message:
                'SUPER_ADMIN role can only be assigned via direct ' +
                'Prisma writes (prisma/seed.ts or ' +
                'scripts/create-super-admin.ts). API-based ' +
                'promotion is disabled for security.',
            });
          }
        },
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 1 week
    updateAge: 60 * 60 * 24, // sliding refresh every 24h
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5-minute in-memory cache
    },
  },

  advanced: {
    cookiePrefix: 'taksees',
    // originCheck rejects any state-changing request from an
    // origin not in trustedOrigins. CSRF protection lives here.
    useSecureCookies: isProd,
  },

  rateLimit: {
    // Tighter limits on auth endpoints than the global
    // /api/* limit (which is 100 req/min/IP).
    enabled: true,
    storage: 'database',
    customRules: {
      '/sign-in/social': { window: 60, max: 10 },
      '/sign-out': { window: 60, max: 30 },
    },
  },

  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost:5173',
    // production origins added via env in app.module.ts
  ],
}) as unknown as ReturnType<typeof betterAuth>;

// Type export — kept as a type alias so consumers (the seed,
// the admin scripts) can refer to it.
export type Auth = typeof auth;
