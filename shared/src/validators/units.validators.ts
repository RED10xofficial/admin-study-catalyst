import { z } from 'zod';

export const createUnitSchema = z.object({
  unitName: z.string().min(1).max(200),
  examTypeId: z.string(),
  tags: z.array(z.string()).optional().default([]),
  accessType: z.enum(['free', 'premium']).default('free'),
  imageKey: z.string().optional(),
  mimeType: z.string().optional(),
});

export const updateUnitSchema = createUnitSchema.partial();

export const unitListSchema = z.object({
  examTypeId: z.string().optional(),
  accessType: z.enum(['free', 'premium']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
