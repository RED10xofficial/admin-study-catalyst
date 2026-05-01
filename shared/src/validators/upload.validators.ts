import { z } from 'zod';

export const presignSchema = z.object({
  type: z.enum(['unit-image', 'question-audio']),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
});

export type PresignInput = z.infer<typeof presignSchema>;
