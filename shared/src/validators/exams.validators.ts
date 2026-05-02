import { z } from 'zod';

export const createExamSchema = z.object({
  unitId: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

export const submitExamSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedAnswer: z.string().nullable(),
    }),
  ),
});

export type CreateExamInput = z.infer<typeof createExamSchema>;
export type SubmitExamInput = z.infer<typeof submitExamSchema>;
