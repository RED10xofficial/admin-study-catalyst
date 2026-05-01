import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { examQuestions } from './exam-questions';

export const questionStatistics = sqliteTable('question_statistics', {
  questionId: text('question_id')
    .primaryKey()
    .references(() => examQuestions.id),
  totalAttempts: integer('total_attempts').notNull().default(0),
  correctAttempts: integer('correct_attempts').notNull().default(0),
  wrongAttempts: integer('wrong_attempts').notNull().default(0),
});
