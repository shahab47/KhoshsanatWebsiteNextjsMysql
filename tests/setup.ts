import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('45.149.78.107')) {
  process.env.DATABASE_URL = 'mysql://root:@localhost:3306/ks_database';
}
