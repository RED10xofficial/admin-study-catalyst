/**
 * URL-safe slug from display text (e.g. unit names).
 */
export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base.length > 0 ? base.slice(0, 120) : 'unit';
}
