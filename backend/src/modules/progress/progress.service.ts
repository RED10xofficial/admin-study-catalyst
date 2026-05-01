import { and, eq } from 'drizzle-orm';
import type { KVNamespace } from '@cloudflare/workers-types';
import { questions, studentQuestionProgress } from '@admin-study-catalyst/shared/schema';
import type { SubmitProgressInput } from '@admin-study-catalyst/shared/validators';
import type { Db } from '../../db/client';
import { forbidden, notFound, unprocessable } from '../../lib/errors';
import { generateId, now } from '../../lib/id';
import { kvGet, kvKeys, kvSet, TTL_30S } from '../../lib/kv';

export async function submitProgress(
  db: Db,
  kv: KVNamespace,
  studentId: string,
  input: SubmitProgressInput,
) {
  const question = await db
    .select()
    .from(questions)
    .where(and(eq(questions.id, input.questionId), eq(questions.isDeleted, false)))
    .get();
  if (!question) throw notFound('Question not found');

  if (question.accessType === 'premium') {
    let membership = await kvGet(kv, kvKeys.userMembership(studentId));
    if (membership === null) {
      const { users } = await import('@admin-study-catalyst/shared/schema');
      const user = await db
        .select({ membershipType: users.membershipType })
        .from(users)
        .where(eq(users.id, studentId))
        .get();
      membership = user?.membershipType ?? 'normal';
      await kvSet(kv, kvKeys.userMembership(studentId), membership, TTL_30S);
    }
    if (membership !== 'premium') {
      throw forbidden('Premium membership required to access this question');
    }
  }

  if (question.sequenceOrder > 0) {
    const prevQuestion = await db
      .select({ id: questions.id })
      .from(questions)
      .where(
        and(
          eq(questions.unitId, question.unitId),
          eq(questions.sequenceOrder, question.sequenceOrder - 1),
          eq(questions.isDeleted, false),
        ),
      )
      .get();

    if (prevQuestion) {
      const prevProgress = await db
        .select({ id: studentQuestionProgress.id })
        .from(studentQuestionProgress)
        .where(
          and(
            eq(studentQuestionProgress.studentId, studentId),
            eq(studentQuestionProgress.questionId, prevQuestion.id),
          ),
        )
        .get();

      if (!prevProgress) {
        throw unprocessable(
          'You must complete the previous question before answering this one',
          'SEQUENTIAL_GATE',
        );
      }
    }
  }

  await db
    .insert(studentQuestionProgress)
    .values({
      id: generateId(),
      studentId,
      questionId: input.questionId,
      status: 'answered',
      answeredAt: now(),
    })
    .onConflictDoNothing();

  return { success: true };
}

export async function getUnitProgress(db: Db, studentId: string, unitId: string) {
  const allQuestions = await db
    .select({ id: questions.id, sequenceOrder: questions.sequenceOrder })
    .from(questions)
    .where(and(eq(questions.unitId, unitId), eq(questions.isDeleted, false)));

  const answeredRows = await db
    .select({ questionId: studentQuestionProgress.questionId })
    .from(studentQuestionProgress)
    .where(eq(studentQuestionProgress.studentId, studentId));

  const answeredIds = new Set(answeredRows.map((r) => r.questionId));
  const totalQuestions = allQuestions.length;
  const answeredCount = allQuestions.filter((q) => answeredIds.has(q.id)).length;

  return {
    unitId,
    totalQuestions,
    answeredCount,
    isComplete: totalQuestions > 0 && answeredCount === totalQuestions,
  };
}
