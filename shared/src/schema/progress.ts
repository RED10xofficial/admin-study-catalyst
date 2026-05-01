import { sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { questions } from './questions';

export const studentQuestionProgress = sqliteTable(
  'student_question_progress',
  {
    id: text('id').primaryKey(),
    studentId: text('student_id')
      .notNull()
      .references(() => users.id),
    questionId: text('question_id')
      .notNull()
      .references(() => questions.id),
    status: text('status', { enum: ['answered'] })
      .notNull()
      .default('answered'),
    answeredAt: text('answered_at').notNull(),
  },
  (t) => [unique().on(t.studentId, t.questionId)],
);
