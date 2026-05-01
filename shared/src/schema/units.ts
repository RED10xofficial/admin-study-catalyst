import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { examTypes } from './exam-types';

export const units = sqliteTable('units', {
  id: text('id').primaryKey(),
  unitName: text('unit_name').notNull(),
  imageUrl: text('image_url'),
  examTypeId: text('exam_type_id')
    .notNull()
    .references(() => examTypes.id),
  tags: text('tags'), // JSON array stored as TEXT
  accessType: text('access_type', { enum: ['free', 'premium'] })
    .notNull()
    .default('free'),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
