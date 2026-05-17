import { Hono } from 'hono';
import * as XLSX from 'xlsx';
import type { Bindings } from '../../env';
import { getDb } from '../../db/client';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import {
  createExamQuestionSchema,
  updateExamQuestionSchema,
  examQuestionListSchema,
  bulkExamQuestionUploadMetaSchema,
} from '@admin-study-catalyst/shared/validators';
import {
  EXAM_QUESTION_MESSAGES,
  BULK_UPLOAD_MESSAGES,
} from '@admin-study-catalyst/shared/messages';
import { zValidate } from '../../lib/validated';
import { badRequest } from '../../lib/errors';
import { created, deleted, ok } from '../../lib/response';
import {
  createExamQuestion,
  listExamQuestions,
  getExamQuestion,
  updateExamQuestion,
  deleteExamQuestion,
  bulkUploadExamQuestions,
  type ParsedBulkExamQuestionRow,
} from './exam-questions.service';

const examQuestionsApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

examQuestionsApp.use('*', authMiddleware, requireRole('admin'));

examQuestionsApp.get('/', zValidate('query', examQuestionListSchema), async (c) => {
  return ok(
    c,
    { examQuestions: await listExamQuestions(getDb(c.env.DB), c.req.valid('query')) },
    EXAM_QUESTION_MESSAGES.LISTED,
  );
});

examQuestionsApp.post('/', zValidate('json', createExamQuestionSchema), async (c) => {
  const examQuestion = await createExamQuestion(getDb(c.env.DB), c.req.valid('json'));
  return created(c, { examQuestion }, EXAM_QUESTION_MESSAGES.CREATED);
});

examQuestionsApp.post('/bulk', async (c) => {
  const form = await c.req.formData();
  const unitId = String(form.get('unitId') ?? '');
  const difficultyRaw = String(form.get('difficulty') ?? '');
  const accessRaw = form.get('accessType');
  const metaParsed = bulkExamQuestionUploadMetaSchema.safeParse({
    unitId,
    difficulty: difficultyRaw,
    accessType: accessRaw === null || accessRaw === '' ? undefined : String(accessRaw),
  });
  if (!metaParsed.success) {
    throw badRequest('Invalid bulk upload metadata', 'INVALID_BULK_META');
  }
  const meta = metaParsed.data;

  const excelEntry = form.get('excel');
  if (!(excelEntry instanceof File)) {
    throw badRequest('excel file is required', 'MISSING_EXCEL');
  }
  const excelBuf = await excelEntry.arrayBuffer();
  const workbook = XLSX.read(excelBuf, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    throw badRequest('Excel workbook has no sheets', 'EMPTY_EXCEL');
  }
  const rowsUnknown = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const normalizeHeader = (key: string) => key.trim().toLowerCase().replaceAll(/\s+/g, '_');

  const parsedRows: ParsedBulkExamQuestionRow[] = [];
  for (const raw of rowsUnknown) {
    const row: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      row[normalizeHeader(k)] = v;
    }
    const question = String(row.question ?? '').trim();
    if (!question) continue;

    parsedRows.push({
      question,
      option1: String(row.option1 ?? '').trim(),
      option2: String(row.option2 ?? '').trim(),
      option3: String(row.option3 ?? '').trim(),
      option4: String(row.option4 ?? '').trim(),
      correctAnswer: String(row.correct_answer ?? row.correctanswer ?? '').trim(),
      shortDescription:
        String(row.short_description ?? row.shortdescription ?? '').trim() || undefined,
      difficulty: String(row.difficulty ?? '')
        .trim()
        .toLowerCase(),
    });
  }

  const result = await bulkUploadExamQuestions(getDb(c.env.DB), {
    unitId: meta.unitId,
    defaultDifficulty: meta.difficulty,
    defaultAccessType: meta.accessType ?? null,
    rows: parsedRows,
  });

  return ok(
    c,
    {
      inserted: result.inserted,
      skipped: result.skipped,
      rowErrors: result.rowErrors,
    },
    BULK_UPLOAD_MESSAGES.EXAM_QUESTIONS_IMPORTED,
  );
});

examQuestionsApp.get('/:id', async (c) => {
  const examQuestion = await getExamQuestion(getDb(c.env.DB), c.req.param('id'));
  return ok(c, { examQuestion }, EXAM_QUESTION_MESSAGES.RETRIEVED);
});

examQuestionsApp.patch('/:id', zValidate('json', updateExamQuestionSchema), async (c) => {
  const examQuestion = await updateExamQuestion(
    getDb(c.env.DB),
    c.req.param('id'),
    c.req.valid('json'),
  );
  return ok(c, { examQuestion }, EXAM_QUESTION_MESSAGES.UPDATED);
});

examQuestionsApp.delete('/:id', async (c) => {
  await deleteExamQuestion(getDb(c.env.DB), c.req.param('id'));
  return deleted(c, EXAM_QUESTION_MESSAGES.DELETED);
});

export { examQuestionsApp };
