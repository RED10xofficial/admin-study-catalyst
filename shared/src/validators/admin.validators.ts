import { z } from 'zod';

export const studentListSchema = z.object({
  membershipType: z.enum(['normal', 'premium']).optional(),
  membershipSource: z.enum(['direct_registration', 'book_qr', 'manual_upgrade']).optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateStudentSchema = z.object({
  isActive: z.boolean().optional(),
  membershipType: z.enum(['normal', 'premium']).optional(),
  membershipSource: z.enum(['manual_upgrade']).optional(),
});

export type StudentListQuery = z.infer<typeof studentListSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
