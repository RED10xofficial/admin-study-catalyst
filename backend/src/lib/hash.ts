function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ (b.charCodeAt(i) ?? 0);
  }
  return result === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  const hash = btoa(String.fromCharCode(...new Uint8Array(derivedBits)));
  const saltB64 = btoa(String.fromCharCode(...salt));
  return `${saltB64}:${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const colonIndex = stored.indexOf(':');
  if (colonIndex === -1) return false;
  const saltB64 = stored.slice(0, colonIndex);
  const storedHash = stored.slice(colonIndex + 1);
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  const hash = btoa(String.fromCharCode(...new Uint8Array(derivedBits)));
  return timingSafeEqual(hash, storedHash);
}
