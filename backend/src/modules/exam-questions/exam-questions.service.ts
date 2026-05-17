import { and, count, eq, sql } from 'drizzle-orm';
import type { Db } from '../../db/client';
import {
  examQuestions,
  questionStatistics,
  studentExamAnswers,
  studentExams,
  units,
} from '@admin-study-catalyst/shared/schema';
import {
  QUESTION_DIFFICULTY_VALUES,
  type QuestionDifficulty,
  type QuestionDifficultyValue,
} from '@admin-study-catalyst/shared';
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
    difficulty?: QuestionDifficulty;
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

  const activeRow = await db
    .select({ activeCount: count() })
    .from(studentExamAnswers)
    .innerJoin(studentExams, eq(studentExamAnswers.examId, studentExams.id))
    .where(and(eq(studentExamAnswers.questionId, id), eq(studentExams.status, 'active')))
    .get();

  if ((activeRow?.activeCount ?? 0) > 0) {
    throw conflict('Cannot delete: question is part of an active exam');
  }

  const histRow = await db
    .select({ histCount: count() })
    .from(studentExamAnswers)
    .where(eq(studentExamAnswers.questionId, id))
    .get();

  if ((histRow?.histCount ?? 0) > 0) {
    await db.update(examQuestions).set({ isDeleted: true }).where(eq(examQuestions.id, id));
  } else {
    await db.delete(examQuestions).where(eq(examQuestions.id, id));
  }
}

// ---------------------------------------------------------------------------
// Bulk import
// ---------------------------------------------------------------------------

export type ParsedBulkExamQuestionRow = {
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correctAnswer: string;
  shortDescription?: string;
  /** Lowercase difficulty from Excel row, or empty to use form default */
  difficulty: string;
};

export async function bulkUploadExamQuestions(
  db: Db,
  params: {
    unitId: string;
    defaultDifficulty: QuestionDifficultyValue;
    defaultAccessType?: 'free' | 'premium' | null;
    rows: ParsedBulkExamQuestionRow[];
  },
): Promise<{ inserted: number; skipped: number; rowErrors: { row: number; message: string }[] }> {
  const unitRow = await db
    .select({ id: units.id })
    .from(units)
    .where(and(eq(units.id, params.unitId), eq(units.isDeleted, false)))
    .get();
  if (!unitRow) throw notFound('Unit not found');

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

    const cellDifficulty = row.difficulty?.trim();
    let difficulty: QuestionDifficultyValue = params.defaultDifficulty;
    if (cellDifficulty) {
      if (!QUESTION_DIFFICULTY_VALUES.includes(cellDifficulty as QuestionDifficultyValue)) {
        rowErrors.push({ row: i + 2, message: 'invalid difficulty' });
        skipped++;
        continue;
      }
      difficulty = cellDifficulty as QuestionDifficultyValue;
    }

    await db.insert(examQuestions).values({
      id: generateId(),
      question: row.question,
      option1: row.option1,
      option2: row.option2,
      option3: row.option3,
      option4: row.option4,
      correctAnswer: row.correctAnswer,
      shortDescription: row.shortDescription ?? null,
      difficulty,
      unitId: params.unitId,
      accessType: params.defaultAccessType ?? null,
      isDeleted: false,
      createdAt: ts,
    });
    inserted++;
  }

  return { inserted, skipped, rowErrors };
}
