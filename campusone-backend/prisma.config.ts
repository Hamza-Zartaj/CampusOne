import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'prisma/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env') });

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  throw new Error('DIRECT_URL (or DATABASE_URL) is not set. Check campusone-backend/.env');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url },
});
