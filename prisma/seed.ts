/**
 * Seed the database with deterministic fixture data for local
 * development and integration tests.
 *
 * Users are created via Better Auth's signUpEmail API so the
 * account/password rows are written exactly as Better Auth expects.
 * The class-specific `role` is set via Better Auth's additional
 * field at signup time.
 *
 * Fixture (matches docs/phases/phase-1-classes.md):
 *   1 SUPER_ADMIN  (admin@taksees.app)
 *   3 LEADERS      (one per class)
 *   5 SERVANTS     (assigned to various classes)
 *   3 CLASSES      (Primary 1, Primary 2, Secondary)
 *   60 MEMBERS     (20 per class)
 *
 * Run with:  pnpm prisma:seed
 * Idempotent — wipes the application tables first.
 */
import { PrismaClient, ClassLevel } from '@prisma/client';
import { auth } from '../src/auth/auth';
import { UserRole } from '../src/common/types/auth-user';

const prisma = new PrismaClient();

const PASSWORD = 'Passw0rd!';

interface SeedUser {
  id: string;
  email: string;
  role: UserRole;
}

async function signUp(email: string, name: string, role: UserRole): Promise<SeedUser> {
  const res = await auth.api.signUpEmail({
    body: {
      email,
      password: PASSWORD,
      name,
      // role is the additional field on the user schema
      role,
    },
  });
  // Better Auth returns the user on the response; in some versions
  // it's nested under .user.
  const user = (res as { user?: { id: string; email: string } }).user
    ?? (res as unknown as { id: string; email: string });
  return { id: user.id, email: user.email, role };
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

  // ── Users via Better Auth ──────────────────────────────────────
  const admin = await signUp('admin@taksees.app', 'System Admin', 'SUPER_ADMIN');

  const leaderA = await signUp('leader.primary1@taksees.app', 'Lina A.', 'LEADER');
  const leaderB = await signUp('leader.primary2@taksees.app', 'Peter B.', 'LEADER');
  const leaderC = await signUp('leader.secondary@taksees.app', 'Mona C.', 'LEADER');

  const servants = await Promise.all(
    [1, 2, 3, 4, 5].map((n) =>
      signUp(`servant${n}@taksees.app`, `Servant ${n}`, 'SERVANT'),
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
  });
