import { Hono } from 'hono';
import * as XLSX from 'xlsx';
import type { Bindings } from '../../env';
import { getDb } from '../../db/client';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import {
  createQuestionSchema,
  updateQuestionSchema,
  questionListSchema,
  reorderQuestionSchema,
  bulkLearningQuestionUploadMetaSchema,
} from '@admin-study-catalyst/shared/validators';
import { QUESTION_MESSAGES, BULK_UPLOAD_MESSAGES } from '@admin-study-catalyst/shared/messages';
import { zValidate } from '../../lib/validated';
import { badRequest } from '../../lib/errors';
import { created, deleted, ok } from '../../lib/response';
import { isAllowedMime } from '../../lib/r2';
import {
  createQuestion,
  listQuestions,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  bulkUploadLearningQuestions,
  type ParsedBulkLearningRow,
} from './questions.service';

const questionsApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

questionsApp.use('*', authMiddleware, requireRole('admin'));

questionsApp.get('/', zValidate('query', questionListSchema), async (c) => {
  return ok(
    c,
    { questions: await listQuestions(getDb(c.env.DB), c.req.valid('query')) },
    QUESTION_MESSAGES.LISTED,
  );
});

questionsApp.post('/', zValidate('json', createQuestionSchema), async (c) => {
  const question = await createQuestion(getDb(c.env.DB), c.env.R2, c.req.valid('json'));
  return created(c, { question }, QUESTION_MESSAGES.CREATED);
});

questionsApp.post('/bulk', async (c) => {
  const form = await c.req.formData();
  const unitId = String(form.get('unitId') ?? '');
  const rawAccess = form.get('accessType');
  const accessType = rawAccess === null || rawAccess === '' ? 'free' : String(rawAccess);
  const metaParsed = bulkLearningQuestionUploadMetaSchema.safeParse({ unitId, accessType });
  if (!metaParsed.success) {
    throw badRequest('Invalid unitId or accessType', 'INVALID_BULK_META');
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

  const parsedRows: ParsedBulkLearningRow[] = [];
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
      description: String(row.description ?? '').trim() || undefined,
      assetId: String(row.asset_id ?? row.assetid ?? '').trim() || undefined,
    });
  }

  function fileStem(name: string): string {
    const base = name.replace(/^.*[/\\]/, '');
    const dot = base.lastIndexOf('.');
    return dot === -1 ? base : base.slice(0, dot);
  }

  function mimeFromFilename(name: string): string | null {
    const lower = name.toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.mp3')) return 'audio/mpeg';
    if (lower.endsWith('.m4a')) return 'audio/mp4';
    if (lower.endsWith('.ogg')) return 'audio/ogg';
    if (lower.endsWith('.wav')) return 'audio/wav';
    return null;
  }

  const imageFiles = new Map<
    string,
    { buffer: ArrayBuffer; contentType: string; storageFileName: string }
  >();
  const audioFiles = new Map<
    string,
    { buffer: ArrayBuffer; contentType: string; storageFileName: string }
  >();

  for (const [key, val] of form.entries()) {
    if (!(val instanceof File) || !val.size) continue;
    const isImagesField = key === 'images' || key.startsWith('images');
    const isAudioField = key === 'audio' || key.startsWith('audio');
    if (!isImagesField && !isAudioField) continue;

    const storageFileName = val.name.split(/[/\\]/).pop() ?? val.name;
    const stem = fileStem(storageFileName);
    const guessed = mimeFromFilename(storageFileName);
    const contentType = val.type?.trim() || guessed || 'application/octet-stream';

    if (isImagesField) {
      if (!isAllowedMime('question-image', contentType)) {
        throw badRequest(`Unsupported image type for ${storageFileName}`, 'INVALID_IMAGE_MIME');
      }
      const buf = await val.arrayBuffer();
      imageFiles.set(stem, { buffer: buf, contentType, storageFileName });
    } else if (isAudioField) {
      if (!isAllowedMime('question-audio', contentType)) {
        throw badRequest(`Unsupported audio type for ${storageFileName}`, 'INVALID_AUDIO_MIME');
      }
      const buf = await val.arrayBuffer();
      audioFiles.set(stem, { buffer: buf, contentType, storageFileName });
    }
  }

  const result = await bulkUploadLearningQuestions(getDb(c.env.DB), c.env.R2, {
    unitId: meta.unitId,
    accessType: meta.accessType,
    rows: parsedRows,
    imageFiles,
    audioFiles,
  });

  return ok(
    c,
    {
      inserted: result.inserted,
      skipped: result.skipped,
      rowErrors: result.rowErrors,
    },
    BULK_UPLOAD_MESSAGES.QUESTIONS_IMPORTED,
  );
});

questionsApp.patch('/reorder', zValidate('json', reorderQuestionSchema), async (c) => {
  await reorderQuestions(getDb(c.env.DB), c.req.valid('json').questions);
  return ok(c, null, QUESTION_MESSAGES.REORDERED);
});

questionsApp.get('/:id', async (c) => {
  const question = await getQuestion(getDb(c.env.DB), c.req.param('id'));
  return ok(c, { question }, QUESTION_MESSAGES.RETRIEVED);
});

questionsApp.patch('/:id', zValidate('json', updateQuestionSchema), async (c) => {
  const question = await updateQuestion(
    getDb(c.env.DB),
    c.env.R2,
    c.req.param('id'),
    c.req.valid('json'),
  );
  return ok(c, { question }, QUESTION_MESSAGES.UPDATED);
});

questionsApp.delete('/:id', async (c) => {
  await deleteQuestion(getDb(c.env.DB), c.req.param('id'));
  return deleted(c, QUESTION_MESSAGES.DELETED);
});

export { questionsApp };
