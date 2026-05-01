import { and, asc, count, eq } from 'drizzle-orm';
import type { Db } from '../../db/client';
import type { R2Bucket } from '@cloudflare/workers-types';
import { questions, studentQuestionProgress } from '@admin-study-catalyst/shared/schema';
import type {
  CreateQuestionInput,
  UpdateQuestionInput,
} from '@admin-study-catalyst/shared/validators';
import { conflict, notFound, badRequest } from '../../lib/errors';
import { generateId, now } from '../../lib/id';
import { sanitizeHtml } from '../../lib/sanitize';
import { objectExists, deleteObject, validateMimeFromBytes } from '../../lib/r2';

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
