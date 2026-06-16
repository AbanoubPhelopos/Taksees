import { z } from 'zod';
import { CLASS_LEVELS } from '../domain/value-objects/class-level.vo';

export const ClassLevelSchema = z.enum(CLASS_LEVELS);

export const CreateClassSchema = z.object({
  name: z.string().min(2).max(120),
  level: ClassLevelSchema,
  // Better Auth uses non-UUID user ids (base64-like strings).
  // We accept any non-empty string and let the service layer
  // verify it against the actual user.
  leaderId: z.string().min(1),
});
export type CreateClassDto = z.infer<typeof CreateClassSchema>;

export const UpdateClassSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    level: ClassLevelSchema.optional(),
    leaderId: z.string().min(1).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update.' });
export type UpdateClassDto = z.infer<typeof UpdateClassSchema>;

export const ListClassesQuerySchema = z.object({
  level: ClassLevelSchema.optional(),
  leaderId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListClassesQueryDto = z.infer<typeof ListClassesQuerySchema>;

const SingleMemberSchema = z.object({
  fullName: z.string().min(2).max(120),
  phone: z.string().min(7).max(20).optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
});

export const AddMemberSchema = z.union([
  SingleMemberSchema,
  z.object({ members: z.array(SingleMemberSchema).min(1).max(200) }),
]);
export type AddMemberDto = z.infer<typeof AddMemberSchema>;

export const UpdateMemberSchema = z
  .object({
    fullName: z.string().min(2).max(120).optional(),
    phone: z.string().min(7).max(20).optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update.' });
export type UpdateMemberDto = z.infer<typeof UpdateMemberSchema>;

export const ListMembersQuerySchema = z.object({
  q: z.string().max(120).optional(),
  isActive: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => (typeof v === 'boolean' ? v : v === 'true'))
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListMembersQueryDto = z.infer<typeof ListMembersQuerySchema>;

export const AssignServantSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(50),
});
export type AssignServantDto = z.infer<typeof AssignServantSchema>;

export const ClassIdParamSchema = z.object({ id: z.string().uuid() });
export type ClassIdParamDto = z.infer<typeof ClassIdParamSchema>;
export const ClassIdPathParamSchema = z.object({ classId: z.string().uuid() });
export type ClassIdPathParamDto = z.infer<typeof ClassIdPathParamSchema>;
export const MemberIdParamSchema = z.object({ id: z.string().uuid() });
export type MemberIdParamDto = z.infer<typeof MemberIdParamSchema>;
export const ServantParamSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
});
export type ServantParamDto = z.infer<typeof ServantParamSchema>;
