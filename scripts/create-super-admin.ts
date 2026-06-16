/**
 * Create or promote a user to SUPER_ADMIN via direct Prisma writes.
 *
 * Why this script exists:
 *   The Better Auth admin plugin's /admin/set-role endpoint is
 *   blocked from promoting anyone to 'super_admin' by a
 *   databaseHooks.user.update before-hook. This is by design —
 *   the security policy says "the super leader will be manually
 *   mapped from the db for security purposes". So creating or
 *   promoting a SUPER_ADMIN requires this script + direct DB
 *   access.
 *
 * Usage:
 *   pnpm ts-node scripts/create-super-admin.ts \
 *     --email admin@taksees.app \
 *     --name "System Admin" \
 *     --google-id admin@taksees.app
 *
 *   --email       The user's email (also the Google account email
 *                 they'll sign in with)
 *   --name        The display name shown in the PWA
 *   --google-id   The Google account email (defaults to --email)
 *   --promote     If the user already exists, just bump their
 *                 role to super_admin. Defaults to false (refuses
 *                 to mutate existing rows; explicit opt-in for
 *                 promotion)
 *   --dry-run     Print what would happen without writing
 *
 * Production runbook:
 *   1. SSH to the production host
 *   2. cd /srv/taksees
 *   3. export $(grep -v '^#' .env | xargs)
 *   4. pnpm ts-node scripts/create-super-admin.ts --email ...
 *
 * The script requires direct DB credentials (DATABASE_URL). It
 * will not work via the API — the user.update hook is enforced
 * by the application code, not the DB layer.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseArgs(argv: string[]): {
  email: string | undefined;
  name: string | undefined;
  googleId: string | undefined;
  promote: boolean;
  dryRun: boolean;
} {
  const args: Record<string, string | boolean> = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--promote') args.promote = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg?.startsWith('--')) {
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[arg.slice(2)] = next;
        i += 1;
      } else {
        args[arg.slice(2)] = true;
      }
    }
  }
  return {
    email: args.email as string | undefined,
    name: args.name as string | undefined,
    googleId: (args['google-id'] ?? args.email) as string | undefined,
    promote: Boolean(args.promote),
    dryRun: Boolean(args['dry-run']),
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  if (!args.email || !args.name) {
    throw new Error(
      'Usage: create-super-admin.ts --email <email> --name "<display name>" ' +
        '[--google-id <google email>] [--promote] [--dry-run]',
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: args.email } });

  if (existing) {
    if (!args.promote) {
      throw new Error(
        `User ${args.email} already exists with role='${existing.role}'. ` +
          'Re-run with --promote to bump them to super_admin.',
      );
    }
    if (args.dryRun) {
      // eslint-disable-next-line no-console
      console.log(
        `[dry-run] Would promote user ${args.email} ` +
          `from role='${existing.role}' to role='super_admin'`,
      );
      return;
    }
    const updated = await prisma.user.update({
      where: { email: args.email },
      data: { role: 'super_admin' },
    });
    // eslint-disable-next-line no-console
    console.log(`✓ Promoted ${updated.email} to super_admin`);
    return;
  }

  if (args.dryRun) {
    // eslint-disable-next-line no-console
    console.log(
      `[dry-run] Would create user ${args.email} as super_admin ` +
        `(Google account: ${args.googleId ?? args.email})`,
    );
    return;
  }

  // Create the user. No password is set — the SUPER_ADMIN signs
  // in with Google only (in production). Their Google email
  // must match args.email, otherwise accountLinking creates a
  // separate user row.
  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name: args.name,
      email: args.email,
      emailVerified: true,
      role: 'super_admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // eslint-disable-next-line no-console
  console.log(`✓ Created SUPER_ADMIN user:`);
  // eslint-disable-next-line no-console
  console.log(`    id          ${user.id}`);
  // eslint-disable-next-line no-console
  console.log(`    email       ${user.email}`);
  // eslint-disable-next-line no-console
  console.log(`    name        ${user.name}`);
  // eslint-disable-next-line no-console
  console.log(`    role        ${user.role}`);
  // eslint-disable-next-line no-console
  console.log(
    `    google email  must be ${user.email} to sign in via Google OAuth`,
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
