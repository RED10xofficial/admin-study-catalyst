import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '../../src/lib/sanitize';

describe('sanitizeHtml', () => {
  it('allows safe tags', () => {
    expect(sanitizeHtml('<b>bold</b>')).toBe('<b>bold</b>');
    expect(sanitizeHtml('<p>paragraph</p>')).toBe('<p>paragraph</p>');
  });

  it('strips disallowed tags', () => {
    expect(sanitizeHtml('<script>alert(1)</script>')).toBe('alert(1)');
    expect(sanitizeHtml('<img src=x onerror=alert(1)>')).toBe('');
  });

  it('strips attributes from allowed tags', () => {
    expect(sanitizeHtml('<b onclick="evil()">text</b>')).toBe('<b>text</b>');
  });

  it('passes plain text through', () => {
    expect(sanitizeHtml('hello world')).toBe('hello world');
  });
});
