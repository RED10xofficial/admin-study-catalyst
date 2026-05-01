import { z } from 'zod';

export const createExamTypeSchema = z.object({
  examName: z.string().min(1).max(200),
  tags: z.array(z.string()).optional().default([]),
  examQuestionCount: z.number().int().min(1).default(10),
});

export const updateExamTypeSchema = createExamTypeSchema.partial();

export const examTypeListSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateExamTypeInput = z.infer<typeof createExamTypeSchema>;
export type UpdateExamTypeInput = z.infer<typeof updateExamTypeSchema>;
