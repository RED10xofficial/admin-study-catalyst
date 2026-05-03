import { and, count, eq, sql } from 'drizzle-orm';
import type { Db } from '../../db/client';
import {
  examQuestions,
  questionStatistics,
  studentExamAnswers,
  studentExams,
} from '@admin-study-catalyst/shared/schema';
import type {
  CreateExamQuestionInput,
  UpdateExamQuestionInput,
} from '@admin-study-catalyst/shared/validators';
import { conflict, notFound } from '../../lib/errors';
import { generateId, now } from '../../lib/id';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Shared select shape that includes LEFT-JOINed analytics columns.
 * COALESCE ensures 0 is returned even when no statistics row exists yet.
 */
const questionWithStatsSelect = {
  id: examQuestions.id,
  question: examQuestions.question,
  option1: examQuestions.option1,
  option2: examQuestions.option2,
  option3: examQuestions.option3,
  option4: examQuestions.option4,
  correctAnswer: examQuestions.correctAnswer,
  shortDescription: examQuestions.shortDescription,
  difficulty: examQuestions.difficulty,
  unitId: examQuestions.unitId,
  accessType: examQuestions.accessType,
  isDeleted: examQuestions.isDeleted,
  createdAt: examQuestions.createdAt,
  totalAttempts: sql<number>`COALESCE(${questionStatistics.totalAttempts}, 0)`,
  correctAttempts: sql<number>`COALESCE(${questionStatistics.correctAttempts}, 0)`,
  wrongAttempts: sql<number>`COALESCE(${questionStatistics.wrongAttempts}, 0)`,
} as const;

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createExamQuestion(db: Db, input: CreateExamQuestionInput) {
  const [q] = await db
    .insert(examQuestions)
    .values({
      id: generateId(),
      question: input.question,
      option1: input.option1,
      option2: input.option2,
      option3: input.option3,
      option4: input.option4,
      correctAnswer: input.correctAnswer,
      shortDescription: input.shortDescription ?? null,
      difficulty: input.difficulty,
      unitId: input.unitId,
      accessType: input.accessType ?? null,
      isDeleted: false,
      createdAt: now(),
    })
    .returning();
  return q;
}

export async function listExamQuestions(
  db: Db,
  query: {
    unitId?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    page: number;
    limit: number;
  },
) {
  const conditions = [eq(examQuestions.isDeleted, false)];
  if (query.unitId) conditions.push(eq(examQuestions.unitId, query.unitId));
  if (query.difficulty) conditions.push(eq(examQuestions.difficulty, query.difficulty));

  return db
    .select(questionWithStatsSelect)
    .from(examQuestions)
    .leftJoin(questionStatistics, eq(examQuestions.id, questionStatistics.questionId))
    .where(and(...conditions))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);
}

export async function getExamQuestion(db: Db, id: string) {
  const q = await db
    .select(questionWithStatsSelect)
    .from(examQuestions)
    .leftJoin(questionStatistics, eq(examQuestions.id, questionStatistics.questionId))
    .where(and(eq(examQuestions.id, id), eq(examQuestions.isDeleted, false)))
    .get();
  if (!q) throw notFound('Exam question not found');
  return q;
}

export async function updateExamQuestion(db: Db, id: string, input: UpdateExamQuestionInput) {
  const existing = await db
    .select({ id: examQuestions.id })
    .from(examQuestions)
    .where(eq(examQuestions.id, id))
    .get();
  if (!existing) throw notFound('Exam question not found');

  const [updated] = await db
    .update(examQuestions)
    .set({
      ...(input.question !== undefined && { question: input.question }),
      ...(input.option1 !== undefined && { option1: input.option1 }),
      ...(input.option2 !== undefined && { option2: input.option2 }),
      ...(input.option3 !== undefined && { option3: input.option3 }),
      ...(input.option4 !== undefined && { option4: input.option4 }),
      ...(input.correctAnswer !== undefined && {
        correctAnswer: input.correctAnswer,
      }),
      ...(input.shortDescription !== undefined && {
        shortDescription: input.shortDescription,
      }),
      ...(input.difficulty !== undefined && { difficulty: input.difficulty }),
      ...(input.accessType !== undefined && { accessType: input.accessType }),
    })
    .where(eq(examQuestions.id, id))
    .returning();
  return updated;
}

export async function deleteExamQuestion(db: Db, id: string) {
  const existing = await db
    .select({ id: examQuestions.id })
    .from(examQuestions)
    .where(eq(examQuestions.id, id))
    .get();
  if (!existing) throw notFound('Exam question not found');

  const [{ activeCount }] = await db
    .select({ activeCount: count() })
    .from(studentExamAnswers)
    .innerJoin(studentExams, eq(studentExamAnswers.examId, studentExams.id))
    .where(and(eq(studentExamAnswers.questionId, id), eq(studentExams.status, 'active')));

  if ((activeCount ?? 0) > 0) {
    throw conflict('Cannot delete: question is part of an active exam');
  }

  const [{ histCount }] = await db
    .select({ histCount: count() })
    .from(studentExamAnswers)
    .where(eq(studentExamAnswers.questionId, id));

  if ((histCount ?? 0) > 0) {
    await db.update(examQuestions).set({ isDeleted: true }).where(eq(examQuestions.id, id));
  } else {
    await db.delete(examQuestions).where(eq(examQuestions.id, id));
  }
}
