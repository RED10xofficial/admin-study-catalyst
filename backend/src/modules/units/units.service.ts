import { and, count, eq } from 'drizzle-orm';
import type { R2Bucket } from '@cloudflare/workers-types';
import type { Db } from '../../db/client';
import { units, questions } from '@admin-study-catalyst/shared/schema';
import type { CreateUnitInput, UpdateUnitInput } from '@admin-study-catalyst/shared/validators';
import { conflict, notFound, badRequest } from '../../lib/errors';
import { generateId, now } from '../../lib/id';
import { generateSlug } from '../../lib/slug';
import { objectExists, deleteObject, validateMimeFromBytes } from '../../lib/r2';

async function resolveUniqueUnitSlug(
  db: Db,
  base: string,
  excludeUnitId?: string,
): Promise<string> {
  const slugBase = generateSlug(base);
  for (let i = 0; ; i++) {
    const candidate = i === 0 ? slugBase : `${slugBase}-${i}`;
    const row = await db
      .select({ id: units.id })
      .from(units)
      .where(eq(units.unitSlug, candidate))
      .get();
    if (!row || (excludeUnitId && row.id === excludeUnitId)) {
      return candidate;
    }
  }
}

export async function createUnit(db: Db, r2: R2Bucket, input: CreateUnitInput) {
  let imageUrl: string | undefined;

  if (input.imageKey) {
    const exists = await objectExists(r2, input.imageKey);
    if (!exists) throw badRequest('Image key does not exist in R2', 'INVALID_IMAGE_KEY');
    const declaredMime = input.mimeType ?? 'image/jpeg';
    await validateMimeFromBytes(r2, input.imageKey, declaredMime);
    imageUrl = input.imageKey;
  }

  const slugSource = input.unitSlug?.trim() ? input.unitSlug : input.unitName;
  const unitSlug = await resolveUniqueUnitSlug(db, slugSource);

  try {
    const [unit] = await db
      .insert(units)
      .values({
        id: generateId(),
        unitName: input.unitName,
        unitSlug,
        imageUrl: imageUrl ?? null,
        examTypeId: input.examTypeId,
        tags: JSON.stringify(input.tags ?? []),
        accessType: input.accessType,
        isDeleted: false,
        createdAt: now(),
        updatedAt: now(),
      })
      .returning();
    return unit;
  } catch (e) {
    if (imageUrl) await deleteObject(r2, imageUrl).catch(() => {});
    throw e;
  }
}

export async function listUnits(
  db: Db,
  query: {
    examTypeId?: string;
    accessType?: 'free' | 'premium';
    page: number;
    limit: number;
  },
) {
  const conditions = [eq(units.isDeleted, false)];
  if (query.examTypeId) conditions.push(eq(units.examTypeId, query.examTypeId));
  if (query.accessType) conditions.push(eq(units.accessType, query.accessType));

  return db
    .select()
    .from(units)
    .where(and(...conditions))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);
}

export async function getUnit(db: Db, id: string) {
  const unit = await db
    .select()
    .from(units)
    .where(and(eq(units.id, id), eq(units.isDeleted, false)))
    .get();
  if (!unit) throw notFound('Unit not found');
  return unit;
}

export async function updateUnit(db: Db, r2: R2Bucket, id: string, input: UpdateUnitInput) {
  const existing = await db.select().from(units).where(eq(units.id, id)).get();
  if (!existing || existing.isDeleted) throw notFound('Unit not found');

  let imageUrl = existing.imageUrl;
  if (input.imageKey !== undefined) {
    if (input.imageKey) {
      const exists = await objectExists(r2, input.imageKey);
      if (!exists) throw badRequest('Image key does not exist in R2', 'INVALID_IMAGE_KEY');
      const declaredMime = input.mimeType ?? 'image/jpeg';
      await validateMimeFromBytes(r2, input.imageKey, declaredMime);
      imageUrl = input.imageKey;
    } else {
      imageUrl = null;
    }
  }

  let nextSlug = existing.unitSlug;
  if (input.unitSlug !== undefined && input.unitSlug.trim()) {
    nextSlug = await resolveUniqueUnitSlug(db, input.unitSlug.trim(), id);
  } else if (!existing.unitSlug && input.unitName !== undefined) {
    nextSlug = await resolveUniqueUnitSlug(db, input.unitName, id);
  }

  const [updated] = await db
    .update(units)
    .set({
      ...(input.unitName !== undefined && { unitName: input.unitName }),
      ...(input.examTypeId !== undefined && { examTypeId: input.examTypeId }),
      ...(input.tags !== undefined && { tags: JSON.stringify(input.tags) }),
      ...(input.accessType !== undefined && { accessType: input.accessType }),
      unitSlug: nextSlug,
      imageUrl,
      updatedAt: now(),
    })
    .where(eq(units.id, id))
    .returning();
  return updated;
}

export async function deleteUnit(db: Db, id: string) {
  const existing = await db.select({ id: units.id }).from(units).where(eq(units.id, id)).get();
  if (!existing) throw notFound('Unit not found');

  const [{ questionCount }] = await db
    .select({ questionCount: count() })
    .from(questions)
    .where(and(eq(questions.unitId, id), eq(questions.isDeleted, false)));

  if ((questionCount ?? 0) > 0) {
    throw conflict(
      `Cannot delete unit: ${questionCount} learning question(s) still exist. Delete or soft-delete all questions first.`,
      'UNIT_HAS_QUESTIONS',
    );
  }

  await db.update(units).set({ isDeleted: true, updatedAt: now() }).where(eq(units.id, id));
}
