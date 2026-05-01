const ALLOWED_TAGS = new Set(['b', 'i', 'u', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li']);

export function sanitizeHtml(dirty: string): string {
  let result = dirty.replaceAll(/<([a-z][a-z0-9]*)\b[^>]*>/gi, '<$1>');
  result = result.replaceAll(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag: string) => {
    return ALLOWED_TAGS.has(tag.toLowerCase()) ? match : '';
  });
  return result;
}
