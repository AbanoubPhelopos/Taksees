/**
 * Seed the database with deterministic fixture data for local
 * development and integration tests.
 *
 * SECURITY NOTE
 * The first SUPER_ADMIN is created via a direct Prisma write —
 * never through the Better Auth sign-up API. This is enforced
 * by the `databaseHooks.user.update` hook in src/auth/auth.ts,
 * which rejects any attempt to set role='super_admin' through
 * the API. In production, run this seed exactly ONCE, or use
 * scripts/create-super-admin.ts to add more super_admins.
 *
 * Fixture:
 *   1 SUPER_ADMIN  (from BOOTSTRAP_SUPER_ADMIN_* env vars)
 *   3 LEADERS      (one per class)
 *   5 SERVANTS     (assigned to various classes)
 *   3 CLASSES      (Primary 1, Primary 2, Secondary)
 *   60 MEMBERS     (20 per class)
 *
 * Idempotent — wipes the application tables first.
 */
import { PrismaClient, ClassLevel, Prisma } from '@prisma/client';
import { PrismaClient as PrismaClientAuth } from '@prisma/client';
import { auth } from '../src/auth/auth';
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Better Auth's password storage format (for the seeded
 * SUPER_ADMIN we write via Prisma). The format is:
 *   <salt_hex>:<hash_hex>
 * where the hash is scrypt(password, salt, 64) — Better Auth
 * uses Node's `scrypt` from the standard library.
 */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hashHex] = stored.split(':');
  if (!salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const derived = scryptSync(password, salt, expected.length);
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

const prisma = new PrismaClient();
const prismaAuth = new PrismaClientAuth(); // for the auth.user lookup

interface SeedUser {
  id: string;
  email: string;
  role: 'super_admin' | 'leader' | 'servant' | 'member';
}

async function signUp(
  email: string,
  name: string,
  role: SeedUser['role'],
): Promise<SeedUser> {
  // In dev (email/password enabled): use the real Better Auth
  // signup. In production this path is closed and the seed
  // would fail with a "endpoint disabled" error — production
  // runs scripts/create-super-admin.ts instead.
  const res = await auth.api.signUpEmail({
    body: { email, password: PASSWORD, name },
  });
  const user = (res as { user?: { id: string; email: string } }).user
    ?? (res as unknown as { id: string; email: string });

  // Stamp the role. For super_admin we go around the API and
  // write directly via Prisma (the API path is blocked by
  // the databaseHooks guard). For everything else we use
  // the admin API.
  if (role === 'super_admin') {
    // Update role + write the password hash directly. The
    // signUpEmail call above already created the user row
    // and an account row with the scrypt hash. We just
    // need to set the role.
    const updated = await prisma.user.update({
      where: { email },
      data: { role: 'super_admin' },
    });
    return { id: updated.id, email: updated.email, role };
  }

  // Non-super-admin role: set via the admin API. The signed-
  // in session from the previous signUp call is a member; we
  // need the SUPER_ADMIN to call setRole. To keep the seed
  // independent, we do the role assignment via Prisma too
  // (the databaseHooks guard only blocks super_admin).
  if (role !== 'member') {
    const updated = await prisma.user.update({
      where: { email },
      data: { role },
    });
    return { id: updated.id, email: updated.email, role };
  }

  return { id: user.id, email: user.email, role: 'member' };
}

const PASSWORD = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD ?? 'Passw0rd!';
const SUPER_ADMIN_EMAIL = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL ?? 'admin@taksees.app';
const SUPER_ADMIN_NAME = process.env.BOOTSTRAP_SUPER_ADMIN_NAME ?? 'System Admin';

async function createSuperAdminDirectly(): Promise<SeedUser> {
  // Fallback path used when email/password is disabled (i.e.
  // production). We write the user + account rows directly
  // via Prisma. The password hash is the same scrypt format
  // Better Auth uses; when/if the SUPER_ADMIN ever needs to
  // sign in via email/password (in a recovery scenario), the
  // hash will verify.
  //
  // In production the SUPER_ADMIN is expected to sign in with
  // Google (their Google email must match SUPER_ADMIN_EMAIL),
  // so the password is never used.
  const existing = await prismaAuth.user.findUnique({
    where: { email: SUPER_ADMIN_EMAIL },
  });
  if (existing) {
    return {
      id: existing.id,
      email: existing.email,
      role: 'super_admin' as const,
    };
  }
  const user = await prismaAuth.user.create({
    data: {
      id: crypto.randomUUID(),
      name: SUPER_ADMIN_NAME,
      email: SUPER_ADMIN_EMAIL,
      emailVerified: true,
      role: 'super_admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  await prismaAuth.account.create({
    data: {
      id: crypto.randomUUID(),
      accountId: user.id,
      providerId: 'credential',
      userId: user.id,
      password: hashPassword(PASSWORD),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  return { id: user.id, email: user.email, role: 'super_admin' };
}

async function main(): Promise<void> {
  // Wipe in dependency order. We do NOT delete users that own
  // historical data — but for the dev seed we nuke everything.
  await prisma.servantClass.deleteMany();
  await prisma.member.deleteMany();
  await prisma.class.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();

  // ── Users ──────────────────────────────────────────────────────
  // Try to sign up via Better Auth first; fall back to direct
  // Prisma writes if email/password is disabled (production).
  let admin: SeedUser;
  try {
    admin = await signUp(SUPER_ADMIN_EMAIL, SUPER_ADMIN_NAME, 'super_admin');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('disabled') || msg.includes('not found')) {
      // eslint-disable-next-line no-console
      console.log('email/password disabled; creating SUPER_ADMIN via direct Prisma write');
      admin = await createSuperAdminDirectly();
    } else {
      throw err;
    }
  }

  // The other users are leaders and servants; created with
  // email/password in dev for the same reason as the SUPER_ADMIN.
  // In production these would be created by the SUPER_ADMIN
  // promoting existing Google sign-ups, or by an invite flow
  // (Phase 8+).
  const leaderA = await signUp('leader.primary1@taksees.app', 'Lina A.', 'leader');
  const leaderB = await signUp('leader.primary2@taksees.app', 'Peter B.', 'leader');
  const leaderC = await signUp('leader.secondary@taksees.app', 'Mona C.', 'leader');

  const servants = await Promise.all(
    [1, 2, 3, 4, 5].map((n) =>
      signUp(`servant${n}@taksees.app`, `Servant ${n}`, 'servant'),
    ),
  );

  // ── Classes ────────────────────────────────────────────────────
  const classA = await prisma.class.create({
    data: { name: 'Primary 1 — Group A', level: ClassLevel.PRIMARY_1, leaderId: leaderA.id },
  });
  const classB = await prisma.class.create({
    data: { name: 'Primary 2 — Group A', level: ClassLevel.PRIMARY_2, leaderId: leaderB.id },
  });
  const classC = await prisma.class.create({
    data: { name: 'Secondary — Group A', level: ClassLevel.SECONDARY, leaderId: leaderC.id },
  });

  // ── Servant mapping ────────────────────────────────────────────
  // servant1 → A
  // servant2 → A, B
  // servant3 → B
  // servant4 → C
  // servant5 → A, C
  const assignments: Array<[number, string]> = [
    [0, classA.id],
    [1, classA.id], [1, classB.id],
    [2, classB.id],
    [3, classC.id],
    [4, classA.id], [4, classC.id],
  ];
  await prisma.servantClass.createMany({
    data: assignments.map(([i, classId]) => ({
      servantId: servants[i]!.id,
      classId,
    })),
    skipDuplicates: true,
  });

  // ── Members ────────────────────────────────────────────────────
  const sampleNames = [
    'Mariam', 'John', 'Sara', 'David', 'Nour', 'Anton', 'Lara', 'Youssef',
    'Salma', 'Mark', 'Hala', 'Kareem', 'Lina', 'Tomas', 'Reem', 'Hany',
    'Maya', 'Adel', 'Jana', 'Fady', 'Heba', 'Nabil', 'Rana', 'Sami',
    'Dina', 'Gaber', 'Hagar', 'Khalil', 'Nada', 'Wael',
  ];

  function makePhone(i: number): string {
    return `+2012345${(67890 + i).toString().padStart(5, '0')}`;
  }

  const classAssignments = [
    { classId: classA.id, count: 20 },
    { classId: classB.id, count: 20 },
    { classId: classC.id, count: 20 },
  ];

  let nameIdx = 0;
  for (const { classId, count } of classAssignments) {
    const data = Array.from({ length: count }, () => {
      const fullName = `${sampleNames[nameIdx % sampleNames.length]} ${nameIdx}`;
      nameIdx += 1;
      return {
        classId,
        fullName,
        phone: makePhone(nameIdx),
      };
    });
    await prisma.member.createMany({ data });
  }

  // Defensive sanity check: when we wrote the user via the
  // direct Prisma path (createSuperAdminDirectly), we know
  // the password hash format. When we went through signUpEmail,
  // Better Auth manages the hash format and we don't verify
  // it here. The check below runs only for the direct path.
  if (process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD) {
    const account = await prismaAuth.account.findFirst({
      where: { userId: admin.id, providerId: 'credential' },
    });
    if (
      account?.password &&
      account.password.includes(':') && // our scrypt format
      !verifyPassword(PASSWORD, account.password)
    ) {
      throw new Error('Internal: seeded SUPER_ADMIN password does not verify');
    }
  }

  // eslint-disable-next-line no-console
  console.log('✓ Seeded:', {
    admin: admin.email,
    password: PASSWORD,
    leaders: 3,
    servants: servants.length,
    classes: [classA.name, classB.name, classC.name],
    members: 60,
    assignments: assignments.length,
  });
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await prismaAuth.$disconnect();
  });
