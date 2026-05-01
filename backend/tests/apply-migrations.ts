import { applyD1Migrations, env } from 'cloudflare:test';

type Migrations = Parameters<typeof applyD1Migrations>[1];
const migrations = (env as { TEST_MIGRATIONS?: Migrations }).TEST_MIGRATIONS;

if (!migrations?.length) {
  throw new Error('TEST_MIGRATIONS binding missing; check vitest.config.ts');
}

await applyD1Migrations(env.DB, migrations);
