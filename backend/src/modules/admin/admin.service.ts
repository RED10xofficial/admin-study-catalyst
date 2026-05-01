import { and, asc, eq } from 'drizzle-orm';
import type { KVNamespace } from '@cloudflare/workers-types';
import {
  examQuestions,
  questionStatistics,
  studentExams,
  users,
} from '@admin-study-catalyst/shared/schema';
import type { StudentListQuery, UpdateStudentInput } from '@admin-study-catalyst/shared/validators';
import type { Db } from '../../db/client';
import { forbidden, notFound } from '../../lib/errors';
import { now } from '../../lib/id';
import { invalidateUserCache } from '../../lib/kv';

export async function listStudents(db: Db, query: StudentListQuery) {
  const conditions = [eq(users.role, 'student')];
  if (query.membershipType) conditions.push(eq(users.membershipType, query.membershipType));
  if (query.membershipSource) conditions.push(eq(users.membershipSource, query.membershipSource));
  if (query.isActive !== undefined) conditions.push(eq(users.isActive, query.isActive));

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      membershipType: users.membershipType,
      membershipSource: users.membershipSource,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(...conditions))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);
}

export async function updateStudent(
  db: Db,
  kv: KVNamespace,
  adminId: string,
  targetId: string,
  input: UpdateStudentInput,
) {
  if (targetId === adminId) throw forbidden('Admins cannot modify their own account this way');

  const existing = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, targetId))
    .get();
  if (!existing) throw notFound('User not found');

  const [updated] = await db
    .update(users)
    .set({
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.membershipType !== undefined && {
        membershipType: input.membershipType,
      }),
      ...(input.membershipSource !== undefined && {
        membershipSource: input.membershipSource,
      }),
      updatedAt: now(),
    })
    .where(eq(users.id, targetId))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      isActive: users.isActive,
      membershipType: users.membershipType,
    });

  await invalidateUserCache(kv, targetId);

  return updated;
}

export async function getStudentExamHistory(db: Db, studentId: string) {
  return db
    .select()
    .from(studentExams)
    .where(eq(studentExams.studentId, studentId))
    .orderBy(asc(studentExams.startedAt));
}

export async function getMembershipAnalytics(db: Db) {
  const allStudents = await db
    .select({
      membershipType: users.membershipType,
      membershipSource: users.membershipSource,
    })
    .from(users)
    .where(eq(users.role, 'student'));

  const total = allStudents.length;
  const normal = allStudents.filter((u) => u.membershipType === 'normal').length;
  const premium = allStudents.filter((u) => u.membershipType === 'premium').length;
  const qrRegistrations = allStudents.filter((u) => u.membershipSource === 'book_qr').length;
  const manualUpgrades = allStudents.filter((u) => u.membershipSource === 'manual_upgrade').length;

  return { total, normal, premium, qrRegistrations, manualUpgrades };
}

export async function getQuestionAnalytics(db: Db) {
  const stats = await db
    .select({
      questionId: questionStatistics.questionId,
      question: examQuestions.question,
      totalAttempts: questionStatistics.totalAttempts,
      correctAttempts: questionStatistics.correctAttempts,
      wrongAttempts: questionStatistics.wrongAttempts,
    })
    .from(questionStatistics)
    .innerJoin(examQuestions, eq(questionStatistics.questionId, examQuestions.id))
    .orderBy(asc(questionStatistics.totalAttempts));

  return stats.map((s) => ({
    ...s,
    accuracy: s.totalAttempts > 0 ? Math.round((s.correctAttempts / s.totalAttempts) * 100) : null,
  }));
}
