import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { units } from './units';

export const questions = sqliteTable('questions', {
  id: text('id').primaryKey(),
  question: text('question').notNull(),
  option1: text('option1').notNull(),
  option2: text('option2').notNull(),
  option3: text('option3').notNull(),
  option4: text('option4').notNull(),
  correctAnswer: text('correct_answer').notNull(),
  description: text('description'), // sanitized HTML
  audioUrl: text('audio_url'),
  unitId: text('unit_id')
    .notNull()
    .references(() => units.id),
  accessType: text('access_type', { enum: ['free', 'premium'] })
    .notNull()
    .default('free'),
  sequenceOrder: integer('sequence_order').notNull(),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});
