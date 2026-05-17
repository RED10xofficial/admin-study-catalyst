import { sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import { examTypes } from './exam-types';
import { users } from './users';

export const studentExamTypes = sqliteTable(
  'student_exam_types',
  {
    id: text('id').primaryKey(),
    studentId: text('student_id')
      .notNull()
      .references(() => users.id),
    examTypeId: text('exam_type_id')
      .notNull()
      .references(() => examTypes.id),
    createdAt: text('created_at').notNull(),
  },
  (t) => [unique().on(t.studentId, t.examTypeId)],
);
