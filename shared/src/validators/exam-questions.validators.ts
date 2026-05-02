import { z } from 'zod';

export const createExamQuestionSchema = z.object({
  question: z.string().min(1),
  option1: z.string().min(1),
  option2: z.string().min(1),
  option3: z.string().min(1),
  option4: z.string().min(1),
  correctAnswer: z.string().min(1),
  shortDescription: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  unitId: z.string(),
  accessType: z.enum(['free', 'premium']).optional(),
});

export const updateExamQuestionSchema = createExamQuestionSchema.partial().omit({ unitId: true });

export const examQuestionListSchema = z.object({
  unitId: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateExamQuestionInput = z.infer<typeof createExamQuestionSchema>;
export type UpdateExamQuestionInput = z.infer<typeof updateExamQuestionSchema>;
