import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/lib/hash';

describe('hashPassword', () => {
  it('produces a non-empty string', async () => {
    const result = await hashPassword('MyPass123!');
    expect(result).toMatch(/^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
  });

  it('verifies correct password', async () => {
    const hash = await hashPassword('MyPass123!');
    expect(await verifyPassword('MyPass123!', hash)).toBe(true);
  });

  it('rejects wrong password', async () => {
    const hash = await hashPassword('MyPass123!');
    expect(await verifyPassword('WrongPass1!', hash)).toBe(false);
  });

  it('produces different hashes for same input (random salt)', async () => {
    const a = await hashPassword('MyPass123!');
    const b = await hashPassword('MyPass123!');
    expect(a).not.toBe(b);
  });
});
