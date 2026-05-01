import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { units } from './units';

export const examQuestions = sqliteTable('exam_questions', {
  id: text('id').primaryKey(),
  question: text('question').notNull(),
  option1: text('option1').notNull(),
  option2: text('option2').notNull(),
  option3: text('option3').notNull(),
  option4: text('option4').notNull(),
  correctAnswer: text('correct_answer').notNull(),
  shortDescription: text('short_description'),
  difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard'] }).notNull(),
  unitId: text('unit_id')
    .notNull()
    .references(() => units.id),
  accessType: text('access_type', { enum: ['free', 'premium'] }),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});
