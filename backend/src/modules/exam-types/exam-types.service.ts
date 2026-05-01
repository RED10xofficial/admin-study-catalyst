import { count, eq, like } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { examTypes, units } from '@admin-study-catalyst/shared/schema';
import type {
  CreateExamTypeInput,
  UpdateExamTypeInput,
} from '@admin-study-catalyst/shared/validators';
import { conflict, notFound } from '../../lib/errors';
import { generateId, now } from '../../lib/id';

export async function createExamType(db: Db, input: CreateExamTypeInput) {
  const existing = await db
    .select({ id: examTypes.id })
    .from(examTypes)
    .where(eq(examTypes.examName, input.examName))
    .get();
  if (existing) throw conflict('Exam type name already exists');

  const [et] = await db
    .insert(examTypes)
    .values({
      id: generateId(),
      examName: input.examName,
      tags: JSON.stringify(input.tags ?? []),
      examQuestionCount: input.examQuestionCount,
      createdAt: now(),
      updatedAt: now(),
    })
    .returning();
  return et;
}

export async function listExamTypes(
  db: Db,
  query: { search?: string; page: number; limit: number },
) {
  const offset = (query.page - 1) * query.limit;
  const search = query.search?.trim();
  const rows = await db
    .select()
    .from(examTypes)
    .where(search ? like(examTypes.examName, `%${search}%`) : undefined)
    .limit(query.limit)
    .offset(offset);
  return rows;
}

export async function getExamType(db: Db, id: string) {
  const et = await db.select().from(examTypes).where(eq(examTypes.id, id)).get();
  if (!et) throw notFound('Exam type not found');
  return et;
}

export async function updateExamType(db: Db, id: string, input: UpdateExamTypeInput) {
  const existing = await db
    .select({ id: examTypes.id })
    .from(examTypes)
    .where(eq(examTypes.id, id))
    .get();
  if (!existing) throw notFound('Exam type not found');

  const [updated] = await db
    .update(examTypes)
    .set({
      ...(input.examName !== undefined && { examName: input.examName }),
      ...(input.tags !== undefined && { tags: JSON.stringify(input.tags) }),
      ...(input.examQuestionCount !== undefined && {
        examQuestionCount: input.examQuestionCount,
      }),
      updatedAt: now(),
    })
    .where(eq(examTypes.id, id))
    .returning();
  return updated;
}

export async function deleteExamType(db: Db, id: string) {
  const existing = await db
    .select({ id: examTypes.id })
    .from(examTypes)
    .where(eq(examTypes.id, id))
    .get();
  if (!existing) throw notFound('Exam type not found');

  const [{ linkedUnits }] = await db
    .select({ linkedUnits: count() })
    .from(units)
    .where(eq(units.examTypeId, id));
  if ((linkedUnits ?? 0) > 0) {
    throw conflict(`Cannot delete: ${linkedUnits} unit(s) are linked to this exam type`);
  }

  await db.delete(examTypes).where(eq(examTypes.id, id));
}
