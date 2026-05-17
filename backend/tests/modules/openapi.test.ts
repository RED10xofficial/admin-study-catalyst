import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('API documentation', () => {
  it('serves OpenAPI JSON', async () => {
    const res = await SELF.fetch('http://localhost/openapi.json');
    expect(res.status).toBe(200);
    const body = await res.json<{ openapi: string; paths: Record<string, unknown> }>();
    expect(body.openapi).toBe('3.0.3');
    expect(body.paths['/exam-types']).toBeDefined();
    expect(body.paths['/upload/presign']).toBeDefined();
    expect(body.paths['/auth/me']).toBeDefined();
    expect(body.paths['/progress']).toBeDefined();
    expect(body.paths['/student-exam-types']).toBeDefined();
    expect(body.paths['/units/my-units']).toBeDefined();
    expect(body.paths['/questions/bulk']).toBeDefined();
    expect(body.paths['/exam-questions/bulk']).toBeDefined();
    expect(body.paths['/admin/students']).toBeDefined();
    expect(body.paths['/exams']).toBeDefined();
  });

  it('serves Swagger UI HTML', async () => {
    const res = await SELF.fetch('http://localhost/docs');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toMatch(/swagger/i);
  });
});
