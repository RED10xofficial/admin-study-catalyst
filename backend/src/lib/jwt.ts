import { SignJWT, jwtVerify } from 'jose';

const ALG = 'HS256';

function getKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(userId: string, secret: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(getKey(secret));
}

export async function verifyAccessToken(token: string, secret: string): Promise<{ sub: string }> {
  const { payload } = await jwtVerify(token, getKey(secret), { algorithms: [ALG] });
  if (typeof payload.sub !== 'string') throw new Error('Invalid token: missing sub');
  return { sub: payload.sub };
}

export function generateRefreshToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
