import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const examTypes = sqliteTable('exam_types', {
  id: text('id').primaryKey(),
  examName: text('exam_name').unique().notNull(),
  tags: text('tags'), // JSON array stored as TEXT
  examQuestionCount: integer('exam_question_count').notNull().default(10),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
