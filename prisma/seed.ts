/**
 * Seed the database with deterministic fixture data for local
 * development and integration tests.
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
import { PrismaClient, Role, ClassLevel } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Wipe in dependency order. We do NOT delete users that own
  // historical data — but for the dev seed we nuke everything.
  await prisma.servantClass.deleteMany();
  await prisma.member.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();

  // ── Users ──────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      email: 'admin@taksees.app',
      name: 'System Admin',
      role: Role.SUPER_ADMIN,
    },
  });

  const leaderA = await prisma.user.create({
    data: { email: 'leader.primary1@taksees.app', name: 'Lina A.', role: Role.LEADER },
  });
  const leaderB = await prisma.user.create({
    data: { email: 'leader.primary2@taksees.app', name: 'Peter B.', role: Role.LEADER },
  });
  const leaderC = await prisma.user.create({
    data: { email: 'leader.secondary@taksees.app', name: 'Mona C.', role: Role.LEADER },
  });

  const servants = await Promise.all(
    [1, 2, 3, 4, 5].map((n) =>
      prisma.user.create({
        data: { email: `servant${n}@taksees.app`, name: `Servant ${n}`, role: Role.SERVANT },
      }),
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
    [1, classA.id],
    [1, classB.id],
    [2, classB.id],
    [3, classC.id],
    [4, classA.id],
    [4, classC.id],
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
    'Mariam',
    'John',
    'Sara',
    'David',
    'Nour',
    'Anton',
    'Lara',
    'Youssef',
    'Salma',
    'Mark',
    'Hala',
    'Kareem',
    'Lina',
    'Tomas',
    'Reem',
    'Hany',
    'Maya',
    'Adel',
    'Jana',
    'Fady',
    'Heba',
    'Nabil',
    'Rana',
    'Sami',
    'Dina',
    'Gaber',
    'Hagar',
    'Khalil',
    'Nada',
    'Wael',
  ];

  function makePhone(i: number): string {
    // 201234567890..201234567919 — deterministic 30-number rotation.
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
