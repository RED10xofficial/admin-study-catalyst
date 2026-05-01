import { z } from 'zod';

export const generateCodeSchema = z.object({
  expiresAt: z.string().datetime().optional(),
});

export const bulkGenerateSchema = z.object({
  count: z.number().int().min(1).max(10_000),
  expiresAt: z.string().datetime().optional(),
});

export const updateCodeSchema = z.object({
  status: z.enum(['blocked', 'unused', 'expired']),
});

export const codeListSchema = z.object({
  status: z.enum(['unused', 'used', 'expired', 'blocked']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type GenerateCodeInput = z.infer<typeof generateCodeSchema>;
export type BulkGenerateInput = z.infer<typeof bulkGenerateSchema>;
