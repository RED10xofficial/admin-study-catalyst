import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../../env';
import { getDb } from '../../db/client';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import {
  createUnitSchema,
  updateUnitSchema,
  unitListSchema,
} from '@admin-study-catalyst/shared/validators';
import { createUnit, listUnits, getUnit, updateUnit, deleteUnit } from './units.service';

const unitsApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

unitsApp.use('*', authMiddleware, requireRole('admin'));

unitsApp.get('/', zValidator('query', unitListSchema), async (c) => {
  const query = c.req.valid('query');
  const db = getDb(c.env.DB);
  const unitsList = await listUnits(db, query);
  return c.json({ units: unitsList });
});

unitsApp.post('/', zValidator('json', createUnitSchema), async (c) => {
  const input = c.req.valid('json');
  const db = getDb(c.env.DB);
  const unit = await createUnit(db, c.env.R2, input);
  return c.json({ unit }, 201);
});

unitsApp.get('/:id', async (c) => {
  const unit = await getUnit(getDb(c.env.DB), c.req.param('id'));
  return c.json({ unit });
});

unitsApp.patch('/:id', zValidator('json', updateUnitSchema), async (c) => {
  const input = c.req.valid('json');
  const db = getDb(c.env.DB);
  const unit = await updateUnit(db, c.env.R2, c.req.param('id'), input);
  return c.json({ unit });
});

unitsApp.delete('/:id', async (c) => {
  await deleteUnit(getDb(c.env.DB), c.req.param('id'));
  return c.json({ success: true });
});

export { unitsApp };
