import { and, desc, eq, inArray } from 'drizzle-orm';
import {
  examQuestions,
  examTypes,
  questionStatistics,
  questions,
  studentExams,
  studentExamAnswers,
  studentQuestionProgress,
  units,
  users,
} from '@admin-study-catalyst/shared/schema';
import type { CreateExamInput, SubmitExamInput } from '@admin-study-catalyst/shared/validators';
import type { Db } from '../../db/client';
import { conflict, forbidden, notFound, unprocessable } from '../../lib/errors';
import { generateId, now } from '../../lib/id';

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = result[i];
    const b = result[j];
    if (a !== undefined && b !== undefined) {
      result[i] = b;
      result[j] = a;
    }
  }
  return result;
}

export async function createExam(db: Db, studentId: string, input: CreateExamInput) {
  const user = await db
    .select({ membershipType: users.membershipType })
    .from(users)
    .where(eq(users.id, studentId))
    .get();
  if (!user) throw notFound('User not found');
  if (user.membershipType !== 'premium') throw forbidden('Exams require premium membership');

  const unit = await db
    .select({ id: units.id, examTypeId: units.examTypeId })
    .from(units)
    .where(and(eq(units.id, input.unitId), eq(units.isDeleted, false)))
    .get();
  if (!unit) throw notFound('Unit not found');

  const existingExam = await db
    .select({ id: studentExams.id })
    .from(studentExams)
    .where(and(eq(studentExams.studentId, studentId), eq(studentExams.unitId, input.unitId)))
    .get();
  if (existingExam) throw conflict('You have already attempted or started this exam');

  const allQs = await db
    .select({ id: questions.id })
    .from(questions)
    .where(and(eq(questions.unitId, input.unitId), eq(questions.isDeleted, false)));

  if (allQs.length === 0) throw unprocessable('No learning questions in this unit', 'NO_QUESTIONS');

  const answeredInUnit = await db
    .select({ questionId: studentQuestionProgress.questionId })
    .from(studentQuestionProgress)
    .where(eq(studentQuestionProgress.studentId, studentId));

  const answeredSet = new Set(answeredInUnit.map((r) => r.questionId));
  const allAnswered = allQs.every((q) => answeredSet.has(q.id));

  if (!allAnswered) {
    throw unprocessable(
      'Complete all learning questions in this unit before taking the exam',
      'UNIT_INCOMPLETE',
    );
  }

  const examType = await db
    .select({ examQuestionCount: examTypes.examQuestionCount })
    .from(examTypes)
    .where(eq(examTypes.id, unit.examTypeId))
    .get();
  if (!examType) throw notFound('Exam type not found');

  const available = await db
    .select()
    .from(examQuestions)
    .where(
      and(
        eq(examQuestions.unitId, input.unitId),
        eq(examQuestions.difficulty, input.difficulty),
        eq(examQuestions.isDeleted, false),
      ),
    );

  if (available.length < examType.examQuestionCount) {
    throw unprocessable(
      `Not enough exam questions: need ${examType.examQuestionCount}, only ${available.length} available`,
      'INSUFFICIENT_QUESTIONS',
    );
  }

  const selected = shuffle(available).slice(0, examType.examQuestionCount);

  const examId = generateId();
  const ts = now();

  await db.batch([
    db.insert(studentExams).values({
      id: examId,
      studentId,
      unitId: input.unitId,
      difficulty: input.difficulty,
      totalQuestions: selected.length,
      status: 'active',
      startedAt: ts,
    }),
    ...selected.map((q) =>
      db.insert(studentExamAnswers).values({
        id: generateId(),
        examId,
        questionId: q.id,
        selectedAnswer: null,
        isCorrect: false,
        answeredAt: ts,
      }),
    ),
  ]);

  return db.select().from(studentExams).where(eq(studentExams.id, examId)).get();
}

export async function submitExam(
  db: Db,
  studentId: string,
  examId: string,
  input: SubmitExamInput,
) {
  const exam = await db
    .select()
    .from(studentExams)
    .where(and(eq(studentExams.id, examId), eq(studentExams.studentId, studentId)))
    .get();
  if (!exam) throw notFound('Exam not found');
  if (exam.status !== 'active') {
    throw conflict('Exam has already been submitted or abandoned');
  }

  const assignedAnswers = await db
    .select({ questionId: studentExamAnswers.questionId })
    .from(studentExamAnswers)
    .where(eq(studentExamAnswers.examId, examId));
  const assignedIds = new Set(assignedAnswers.map((a) => a.questionId));

  for (const answer of input.answers) {
    if (!assignedIds.has(answer.questionId)) {
      throw unprocessable(
        `Question ${answer.questionId} does not belong to this exam`,
        'INVALID_QUESTION',
      );
    }
  }

  const ids = [...assignedIds];
  const examQs = await db
    .select({
      id: examQuestions.id,
      correctAnswer: examQuestions.correctAnswer,
    })
    .from(examQuestions)
    .where(inArray(examQuestions.id, ids));

  if (examQs.length !== assignedIds.size) {
    throw notFound('Exam questions not found');
  }

  const correctAnswerMap = new Map(examQs.map((q) => [q.id, q.correctAnswer]));
  const submittedMap = new Map(input.answers.map((a) => [a.questionId, a.selectedAnswer]));

  const statRows = await db
    .select()
    .from(questionStatistics)
    .where(inArray(questionStatistics.questionId, ids));
  const statsByQ = new Map(statRows.map((s) => [s.questionId, s]));

  let correctCount = 0;
  const batchOps = [];
  const ts = now();

  for (const questionId of assignedIds) {
    const selected = submittedMap.get(questionId) ?? null;
    const correctAns = correctAnswerMap.get(questionId);
    if (correctAns === undefined) throw notFound('Exam questions not found');
    const isCorrect = selected !== null && selected === correctAns;
    if (isCorrect) correctCount++;

    batchOps.push(
      db
        .update(studentExamAnswers)
        .set({ selectedAnswer: selected, isCorrect, answeredAt: ts })
        .where(
          and(eq(studentExamAnswers.examId, examId), eq(studentExamAnswers.questionId, questionId)),
        ),
    );

    const existing = statsByQ.get(questionId);
    if (existing) {
      batchOps.push(
        db
          .update(questionStatistics)
          .set({
            totalAttempts: existing.totalAttempts + 1,
            correctAttempts: existing.correctAttempts + (isCorrect ? 1 : 0),
            wrongAttempts: existing.wrongAttempts + (isCorrect ? 0 : 1),
          })
          .where(eq(questionStatistics.questionId, questionId)),
      );
    } else {
      batchOps.push(
        db.insert(questionStatistics).values({
          questionId,
          totalAttempts: 1,
          correctAttempts: isCorrect ? 1 : 0,
          wrongAttempts: isCorrect ? 0 : 1,
        }),
      );
    }

    const updatedStats = existing
      ? {
          totalAttempts: existing.totalAttempts + 1,
          correctAttempts: existing.correctAttempts + (isCorrect ? 1 : 0),
        }
      : { totalAttempts: 1, correctAttempts: isCorrect ? 1 : 0 };

    const accuracy =
      updatedStats.totalAttempts > 0
        ? updatedStats.correctAttempts / updatedStats.totalAttempts
        : null;

    if (accuracy !== null) {
      const newDifficulty: 'easy' | 'medium' | 'hard' =
        accuracy > 0.8 ? 'easy' : accuracy >= 0.5 ? 'medium' : 'hard';
      batchOps.push(
        db
          .update(examQuestions)
          .set({ difficulty: newDifficulty })
          .where(eq(examQuestions.id, questionId)),
      );
    }
  }

  const score = Math.round((correctCount / assignedIds.size) * 100);

  batchOps.push(
    db
      .update(studentExams)
      .set({
        score,
        correctAnswers: correctCount,
        status: 'submitted',
        submittedAt: ts,
      })
      .where(eq(studentExams.id, examId)),
  );

  await db.batch(batchOps as [(typeof batchOps)[number], ...(typeof batchOps)[number][]]);

  return db.select().from(studentExams).where(eq(studentExams.id, examId)).get();
}

export async function listExams(db: Db, studentId: string) {
  return db
    .select()
    .from(studentExams)
    .where(eq(studentExams.studentId, studentId))
    .orderBy(desc(studentExams.startedAt));
}

export async function getExamQuestions(db: Db, studentId: string, examId: string) {
  const exam = await db
    .select({ id: studentExams.id, studentId: studentExams.studentId })
    .from(studentExams)
    .where(and(eq(studentExams.id, examId), eq(studentExams.studentId, studentId)))
    .get();
  if (!exam) throw notFound('Exam not found');

  const answers = await db
    .select({
      questionId: studentExamAnswers.questionId,
      selectedAnswer: studentExamAnswers.selectedAnswer,
      isCorrect: studentExamAnswers.isCorrect,
    })
    .from(studentExamAnswers)
    .where(eq(studentExamAnswers.examId, examId));

  const questionIds = answers.map((a) => a.questionId);
  if (questionIds.length === 0) return [];

  const questionRows = await db
    .select({
      id: examQuestions.id,
      question: examQuestions.question,
      option1: examQuestions.option1,
      option2: examQuestions.option2,
      option3: examQuestions.option3,
      option4: examQuestions.option4,
      shortDescription: examQuestions.shortDescription,
      difficulty: examQuestions.difficulty,
    })
    .from(examQuestions)
    .where(inArray(examQuestions.id, questionIds));

  const answerMap = new Map(answers.map((a) => [a.questionId, a]));

  return questionRows.map((q) => {
    const studentAnswer = answerMap.get(q.id);
    return {
      ...q,
      selectedAnswer: studentAnswer?.selectedAnswer ?? null,
      isCorrect: studentAnswer?.isCorrect ?? false,
    };
  });
}
