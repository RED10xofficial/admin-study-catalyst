import { z } from 'zod';
import { QuestionDifficulty } from '../constants/question-difficulty';

export const createExamSchema = z.object({
  unitId: z.string(),
  difficulty: z.nativeEnum(QuestionDifficulty),
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
