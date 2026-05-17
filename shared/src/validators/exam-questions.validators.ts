import { z } from 'zod';
import { QuestionDifficulty } from '../constants/question-difficulty';

export const createExamQuestionSchema = z.object({
  question: z.string().min(1),
  option1: z.string().min(1),
  option2: z.string().min(1),
  option3: z.string().min(1),
  option4: z.string().min(1),
  correctAnswer: z.string().min(1),
  shortDescription: z.string().optional(),
  difficulty: z.nativeEnum(QuestionDifficulty),
  unitId: z.string(),
  accessType: z.enum(['free', 'premium']).optional(),
});

export const updateExamQuestionSchema = createExamQuestionSchema.partial().omit({ unitId: true });

export const examQuestionListSchema = z.object({
  unitId: z.string().optional(),
  difficulty: z.nativeEnum(QuestionDifficulty).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/** Metadata fields parsed from multipart exam-question bulk-upload forms. */
export const bulkExamQuestionUploadMetaSchema = z.object({
  unitId: z.string().min(1),
  difficulty: z.nativeEnum(QuestionDifficulty),
  accessType: z.enum(['free', 'premium']).optional(),
});

export type CreateExamQuestionInput = z.infer<typeof createExamQuestionSchema>;
export type UpdateExamQuestionInput = z.infer<typeof updateExamQuestionSchema>;
export type BulkExamQuestionUploadMeta = z.infer<typeof bulkExamQuestionUploadMetaSchema>;
