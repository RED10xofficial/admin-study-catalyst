import { eq, inArray } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { examTypes, studentExamTypes } from '@admin-study-catalyst/shared/schema';
import { badRequest } from '../../lib/errors';
import { generateId, now } from '../../lib/id';

export async function setStudentExamTypes(db: Db, studentId: string, examTypeIds: string[]) {
  const unique = [...new Set(examTypeIds)];
  if (unique.length === 0) {
    await db.delete(studentExamTypes).where(eq(studentExamTypes.studentId, studentId));
    return;
  }

  const existing = await db
    .select({ id: examTypes.id })
    .from(examTypes)
    .where(inArray(examTypes.id, unique));
  if (existing.length !== unique.length) {
    throw badRequest('One or more exam type ids are invalid', 'INVALID_EXAM_TYPE_IDS');
  }

  await db.delete(studentExamTypes).where(eq(studentExamTypes.studentId, studentId));

  const ts = now();
  for (const examTypeId of unique) {
    await db.insert(studentExamTypes).values({
      id: generateId(),
      studentId,
      examTypeId,
      createdAt: ts,
    });
  }
}

export async function getStudentExamTypesWithDetails(db: Db, studentId: string) {
  return db
    .select({
      id: examTypes.id,
      examName: examTypes.examName,
      tags: examTypes.tags,
      examQuestionCount: examTypes.examQuestionCount,
      createdAt: examTypes.createdAt,
      updatedAt: examTypes.updatedAt,
    })
    .from(studentExamTypes)
    .innerJoin(examTypes, eq(studentExamTypes.examTypeId, examTypes.id))
    .where(eq(studentExamTypes.studentId, studentId));
}

export async function getStudentExamTypeIds(db: Db, studentId: string): Promise<string[]> {
  const rows = await db
    .select({ examTypeId: studentExamTypes.examTypeId })
    .from(studentExamTypes)
    .where(eq(studentExamTypes.studentId, studentId));
  return rows.map((r) => r.examTypeId);
}
