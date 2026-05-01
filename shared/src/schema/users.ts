import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  phone: text('phone'),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'student'] }).notNull(),
  membershipType: text('membership_type', { enum: ['normal', 'premium'] })
    .notNull()
    .default('normal'),
  membershipSource: text('membership_source', {
    enum: ['direct_registration', 'book_qr', 'manual_upgrade'],
  }),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const passwordResetTokens = sqliteTable('password_reset_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  tokenHash: text('token_hash').unique().notNull(),
  expiresAt: text('expires_at').notNull(),
  consumed: integer('consumed', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});
