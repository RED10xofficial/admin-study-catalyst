import { z } from 'zod';

const questionFieldsSchema = z.object({
  question: z.string().min(1),
  option1: z.string().min(1),
  option2: z.string().min(1),
  option3: z.string().min(1),
  option4: z.string().min(1),
  correctAnswer: z.string().min(1),
  description: z.string().optional(),
  audioKey: z.string().optional(),
  mimeType: z.string().optional(),
  unitId: z.string().uuid(),
  accessType: z.enum(['free', 'premium']).default('free'),
  sequenceOrder: z.number().int().min(0),
});

const optionsRefinement = (data: {
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correctAnswer: string;
}) => [data.option1, data.option2, data.option3, data.option4].includes(data.correctAnswer);

export const createQuestionSchema = questionFieldsSchema.refine(optionsRefinement, {
  message: 'correctAnswer must match one of the four options',
  path: ['correctAnswer'],
});

export const updateQuestionSchema = questionFieldsSchema.partial().omit({ unitId: true });

export const reorderQuestionSchema = z.object({
  questions: z.array(z.object({ id: z.string().uuid(), sequenceOrder: z.number().int().min(0) })),
});

export const questionListSchema = z.object({
  unitId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
