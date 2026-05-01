import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { units } from './units';
import { examQuestions } from './exam-questions';

export const studentExams = sqliteTable(
  'student_exams',
  {
    id: text('id').primaryKey(),
    studentId: text('student_id')
      .notNull()
      .references(() => users.id),
    unitId: text('unit_id')
      .notNull()
      .references(() => units.id),
    difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard'] }).notNull(),
    score: integer('score'),
    totalQuestions: integer('total_questions').notNull(),
    correctAnswers: integer('correct_answers'),
    status: text('status', { enum: ['active', 'submitted', 'abandoned'] })
      .notNull()
      .default('active'),
    startedAt: text('started_at').notNull(),
    submittedAt: text('submitted_at'),
  },
  (t) => [unique().on(t.studentId, t.unitId)],
);

export const studentExamAnswers = sqliteTable(
  'student_exam_answers',
  {
    id: text('id').primaryKey(),
    examId: text('exam_id')
      .notNull()
      .references(() => studentExams.id),
    questionId: text('question_id')
      .notNull()
      .references(() => examQuestions.id),
    selectedAnswer: text('selected_answer'),
    isCorrect: integer('is_correct', { mode: 'boolean' }).notNull().default(false),
    answeredAt: text('answered_at').notNull(),
  },
  (t) => [unique().on(t.examId, t.questionId)],
);
