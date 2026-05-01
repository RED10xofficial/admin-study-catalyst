import { hashPassword } from '../lib/hash';
import { generateId, now } from '../lib/id';

async function main() {
  const email = process.env['SEED_ADMIN_EMAIL'];
  const password = process.env['SEED_ADMIN_PASSWORD'];
  if (!email || !password) {
    console.error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set');
    process.exit(1);
  }
  const id = generateId();
  const hash = await hashPassword(password);
  const ts = now();

  const sql = `
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, membership_type, is_active, created_at, updated_at)
VALUES ('${id}', 'Admin', '${email}', '${hash.replace(/'/g, "''")}', 'admin', 'normal', 1, '${ts}', '${ts}');
`.trim();

  console.log(sql);
}

main();
