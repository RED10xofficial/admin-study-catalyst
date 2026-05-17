import { and, asc, count, eq, max } from 'drizzle-orm';
import type { R2Bucket } from '@cloudflare/workers-types';
import type { Db } from '../../db/client';
import { questions, studentQuestionProgress, units } from '@admin-study-catalyst/shared/schema';
import type {
  CreateQuestionInput,
  UpdateQuestionInput,
} from '@admin-study-catalyst/shared/validators';
import { conflict, notFound, badRequest } from '../../lib/errors';
import { generateId, now } from '../../lib/id';
import { sanitizeHtml } from '../../lib/sanitize';
import { objectExists, deleteObject, validateMimeFromBytes, putR2Object } from '../../lib/r2';

function assertUpdateOptionsConsistent(input: UpdateQuestionInput) {
  const opts = [input.option1, input.option2, input.option3, input.option4];
  if (input.correctAnswer === undefined) return;
  const defined = opts.filter((o) => o !== undefined);
  if (defined.length === 0) return;
  if (defined.length < 4) return;
  if (!opts.includes(input.correctAnswer)) {
    throw badRequest('correctAnswer must match one of the four options', 'INVALID_CORRECT_ANSWER');
  }
}

export async function createQuestion(db: Db, r2: R2Bucket, input: CreateQuestionInput) {
  let audioUrl: string | undefined;
  if (input.audioKey) {
    const exists = await objectExists(r2, input.audioKey);
    if (!exists) throw badRequest('Audio key does not exist in R2', 'INVALID_AUDIO_KEY');
    const declaredMime = input.mimeType ?? 'audio/mpeg';
    await validateMimeFromBytes(r2, input.audioKey, declaredMime);
    audioUrl = input.audioKey;
  }

  let imageUrl: string | undefined;
  if (input.imageKey) {
    const exists = await objectExists(r2, input.imageKey);
    if (!exists) throw badRequest('Image key does not exist in R2', 'INVALID_IMAGE_KEY');
    const declaredMime = input.imageMimeType ?? 'image/jpeg';
    await validateMimeFromBytes(r2, input.imageKey, declaredMime);
    imageUrl = input.imageKey;
  }

  const description = input.description ? sanitizeHtml(input.description) : undefined;

  try {
    const [q] = await db
      .insert(questions)
      .values({
        id: generateId(),
        question: input.question,
        option1: input.option1,
        option2: input.option2,
        option3: input.option3,
        option4: input.option4,
        correctAnswer: input.correctAnswer,
        description,
        imageUrl: imageUrl ?? null,
        audioUrl: audioUrl ?? null,
        unitId: input.unitId,
        accessType: input.accessType,
        sequenceOrder: input.sequenceOrder,
        isDeleted: false,
        createdAt: now(),
      })
      .returning();
    return q;
  } catch (e) {
    if (audioUrl) await deleteObject(r2, audioUrl).catch(() => {});
    if (imageUrl) await deleteObject(r2, imageUrl).catch(() => {});
    throw e;
  }
}

export async function listQuestions(
  db: Db,
  query: { unitId: string; page: number; limit: number },
) {
  return db
    .select()
    .from(questions)
    .where(and(eq(questions.unitId, query.unitId), eq(questions.isDeleted, false)))
    .orderBy(asc(questions.sequenceOrder))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);
}

export async function getQuestion(db: Db, id: string) {
  const q = await db
    .select()
    .from(questions)
    .where(and(eq(questions.id, id), eq(questions.isDeleted, false)))
    .get();
  if (!q) throw notFound('Question not found');
  return q;
}

export async function updateQuestion(db: Db, r2: R2Bucket, id: string, input: UpdateQuestionInput) {
  assertUpdateOptionsConsistent(input);

  const existing = await db.select().from(questions).where(eq(questions.id, id)).get();
  if (!existing || existing.isDeleted) throw notFound('Question not found');

  let audioUrl = existing.audioUrl;
  if (input.audioKey !== undefined) {
    if (input.audioKey) {
      const exists = await objectExists(r2, input.audioKey);
      if (!exists) throw badRequest('Audio key does not exist in R2', 'INVALID_AUDIO_KEY');
      const declaredMime = input.mimeType ?? 'audio/mpeg';
      await validateMimeFromBytes(r2, input.audioKey, declaredMime);
      audioUrl = input.audioKey;
    } else {
      audioUrl = null;
    }
  }

  let imageUrl = existing.imageUrl;
  if (input.imageKey !== undefined) {
    if (input.imageKey) {
      const exists = await objectExists(r2, input.imageKey);
      if (!exists) throw badRequest('Image key does not exist in R2', 'INVALID_IMAGE_KEY');
      const declaredMime = input.imageMimeType ?? 'image/jpeg';
      await validateMimeFromBytes(r2, input.imageKey, declaredMime);
      imageUrl = input.imageKey;
    } else {
      imageUrl = null;
    }
  }

  const description =
    input.description !== undefined
      ? input.description
        ? sanitizeHtml(input.description)
        : null
      : undefined;

  const [updated] = await db
    .update(questions)
    .set({
      ...(input.question !== undefined && { question: input.question }),
      ...(input.option1 !== undefined && { option1: input.option1 }),
      ...(input.option2 !== undefined && { option2: input.option2 }),
      ...(input.option3 !== undefined && { option3: input.option3 }),
      ...(input.option4 !== undefined && { option4: input.option4 }),
      ...(input.correctAnswer !== undefined && {
        correctAnswer: input.correctAnswer,
      }),
      ...(description !== undefined && { description }),
      ...(input.accessType !== undefined && { accessType: input.accessType }),
      ...(input.sequenceOrder !== undefined && {
        sequenceOrder: input.sequenceOrder,
      }),
      audioUrl,
      imageUrl,
    })
    .where(eq(questions.id, id))
    .returning();
  return updated;
}

export async function deleteQuestion(db: Db, id: string) {
  const existing = await db
    .select({ id: questions.id })
    .from(questions)
    .where(eq(questions.id, id))
    .get();
  if (!existing) throw notFound('Question not found');

  const [{ progressCount }] = await db
    .select({ progressCount: count() })
    .from(studentQuestionProgress)
    .where(eq(studentQuestionProgress.questionId, id));

  if ((progressCount ?? 0) > 0) {
    throw conflict('Cannot delete question: students have answered it. Use soft-delete.');
  }

  await db.update(questions).set({ isDeleted: true }).where(eq(questions.id, id));
}

export async function reorderQuestions(db: Db, updates: { id: string; sequenceOrder: number }[]) {
  for (const { id, sequenceOrder } of updates) {
    await db.update(questions).set({ sequenceOrder }).where(eq(questions.id, id));
  }
}

export type ParsedBulkLearningRow = {
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correctAnswer: string;
  description?: string;
  assetId?: string;
};

export async function bulkUploadLearningQuestions(
  db: Db,
  r2: R2Bucket,
  params: {
    unitId: string;
    accessType: 'free' | 'premium';
    rows: ParsedBulkLearningRow[];
    imageFiles: Map<string, { buffer: ArrayBuffer; contentType: string; storageFileName: string }>;
    audioFiles: Map<string, { buffer: ArrayBuffer; contentType: string; storageFileName: string }>;
  },
): Promise<{ inserted: number; skipped: number; rowErrors: { row: number; message: string }[] }> {
  const unit = await db
    .select()
    .from(units)
    .where(and(eq(units.id, params.unitId), eq(units.isDeleted, false)))
    .get();
  if (!unit) throw notFound('Unit not found');
  if (!unit.unitSlug) {
    throw badRequest('Unit must have a unit_slug before bulk upload', 'MISSING_UNIT_SLUG');
  }

  const slug = unit.unitSlug;
  const assetKeys: Record<string, { imageUrl?: string; audioUrl?: string }> = {};

  for (const [assetId, file] of params.imageFiles) {
    const key = `${slug}/images/${file.storageFileName}`;
    await putR2Object(r2, key, file.buffer, file.contentType);
    await validateMimeFromBytes(r2, key, file.contentType);
    if (!assetKeys[assetId]) assetKeys[assetId] = {};
    assetKeys[assetId].imageUrl = key;
  }

  for (const [assetId, file] of params.audioFiles) {
    const key = `${slug}/audio/${file.storageFileName}`;
    await putR2Object(r2, key, file.buffer, file.contentType);
    await validateMimeFromBytes(r2, key, file.contentType);
    if (!assetKeys[assetId]) assetKeys[assetId] = {};
    assetKeys[assetId].audioUrl = key;
  }

  const [{ maxOrder }] = await db
    .select({ maxOrder: max(questions.sequenceOrder) })
    .from(questions)
    .where(and(eq(questions.unitId, params.unitId), eq(questions.isDeleted, false)));

  let sequence = (maxOrder ?? -1) + 1;
  let inserted = 0;
  let skipped = 0;
  const rowErrors: { row: number; message: string }[] = [];

  const ts = now();

  for (let i = 0; i < params.rows.length; i++) {
    const row = params.rows[i];
    const opts = [row.option1, row.option2, row.option3, row.option4];
    if (!opts.includes(row.correctAnswer)) {
      rowErrors.push({ row: i + 2, message: 'correctAnswer must match one of the four options' });
      skipped++;
      continue;
    }

    const assets = row.assetId ? assetKeys[row.assetId] : undefined;
    const description = row.description ? sanitizeHtml(row.description) : null;

    await db.insert(questions).values({
      id: generateId(),
      question: row.question,
      option1: row.option1,
      option2: row.option2,
      option3: row.option3,
      option4: row.option4,
      correctAnswer: row.correctAnswer,
      description,
      imageUrl: assets?.imageUrl ?? null,
      audioUrl: assets?.audioUrl ?? null,
      unitId: params.unitId,
      accessType: params.accessType,
      sequenceOrder: sequence++,
      isDeleted: false,
      createdAt: ts,
    });
    inserted++;
  }

  return { inserted, skipped, rowErrors };
}
