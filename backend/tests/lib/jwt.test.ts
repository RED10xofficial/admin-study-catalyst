import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { signAccessToken, verifyAccessToken } from '../../src/lib/jwt';

const SECRET = 'test-secret-at-least-32-characters-long!!';

describe('signAccessToken / verifyAccessToken', () => {
  it('signs and verifies a valid token', async () => {
    const token = await signAccessToken('user-123', SECRET);
    const payload = await verifyAccessToken(token, SECRET);
    expect(payload.sub).toBe('user-123');
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signAccessToken('user-123', SECRET);
    await expect(verifyAccessToken(token, 'different-secret-also-32-chars!!')).rejects.toThrow();
  });

  it('rejects an expired token', async () => {
    const key = new TextEncoder().encode(SECRET);
    const token = await new SignJWT({ sub: 'user-123' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(key);
    await expect(verifyAccessToken(token, SECRET)).rejects.toThrow();
  });
});
