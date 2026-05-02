import { z } from 'zod';

export const submitProgressSchema = z.object({
  questionId: z.string(),
  answer: z.string().min(1),
});

export type SubmitProgressInput = z.infer<typeof submitProgressSchema>;
