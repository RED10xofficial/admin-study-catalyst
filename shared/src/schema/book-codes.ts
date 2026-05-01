import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';

export const bookCodes = sqliteTable('book_codes', {
  id: text('id').primaryKey(),
  code: text('code').unique().notNull(),
  qrUrl: text('qr_url').notNull(),
  status: text('status', { enum: ['unused', 'used', 'expired', 'blocked'] })
    .notNull()
    .default('unused'),
  usedByUserId: text('used_by_user_id')
    .unique()
    .references(() => users.id),
  usedAt: text('used_at'),
  expiresAt: text('expires_at'),
  createdAt: text('created_at').notNull(),
});
