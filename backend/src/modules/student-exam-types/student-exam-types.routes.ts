import { Hono } from 'hono';
import { z } from 'zod';
import type { Bindings } from '../../env';
import { getDb } from '../../db/client';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { STUDENT_EXAM_TYPE_MESSAGES } from '@admin-study-catalyst/shared/messages';
import { zValidate } from '../../lib/validated';
import { ok } from '../../lib/response';
import { getStudentExamTypesWithDetails, setStudentExamTypes } from './student-exam-types.service';

const studentExamTypesBodySchema = z.object({
  examTypeIds: z.array(z.string().min(1)),
});

const studentExamTypesApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

studentExamTypesApp.use('*', authMiddleware, requireRole('student'));

studentExamTypesApp.get('/', async (c) => {
  const examTypesList = await getStudentExamTypesWithDetails(getDb(c.env.DB), c.get('userId'));
  return ok(c, { examTypes: examTypesList }, STUDENT_EXAM_TYPE_MESSAGES.LISTED);
});

studentExamTypesApp.put('/', zValidate('json', studentExamTypesBodySchema), async (c) => {
  const { examTypeIds } = c.req.valid('json');
  await setStudentExamTypes(getDb(c.env.DB), c.get('userId'), examTypeIds);
  const examTypesList = await getStudentExamTypesWithDetails(getDb(c.env.DB), c.get('userId'));
  return ok(c, { examTypes: examTypesList }, STUDENT_EXAM_TYPE_MESSAGES.UPDATED);
});

export { studentExamTypesApp };
