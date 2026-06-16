/**
 * ClassLevel is a value object that wraps the Prisma enum to keep
 * the domain free of framework concerns.
 */
export const CLASS_LEVELS = [
  'PRIMARY_1',
  'PRIMARY_2',
  'PRIMARY_3',
  'PRIMARY_4',
  'PRIMARY_5',
  'PRIMARY_6',
  'SECONDARY',
  'COLLEGE',
] as const;

export type ClassLevel = (typeof CLASS_LEVELS)[number];

export function isClassLevel(value: unknown): value is ClassLevel {
  return typeof value === 'string' && (CLASS_LEVELS as readonly string[]).includes(value);
}
