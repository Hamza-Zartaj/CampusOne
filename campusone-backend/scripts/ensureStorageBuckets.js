import 'dotenv/config';
import { Client } from 'pg';

const buckets = [
  {
    id: 'assignments',
    public: true,
    fileSizeLimit: 50 * 1024 * 1024,
    allowedMimeTypes: null,
    usedBy: 'assignment attachments and student submissions',
  },
  {
    id: 'lectures',
    public: true,
    fileSizeLimit: 50 * 1024 * 1024,
    allowedMimeTypes: null,
    usedBy: 'teacher lecture materials and TA resources',
  },
  {
    id: 'admission-documents',
    public: true,
    fileSizeLimit: 50 * 1024 * 1024,
    allowedMimeTypes: null,
    usedBy: 'admission application documents',
  },
  {
    id: 'profile-pictures',
    public: true,
    fileSizeLimit: 50 * 1024 * 1024,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    usedBy: 'user profile pictures',
  },
];

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL or DIRECT_URL is required to provision storage buckets.');
}

const client = new Client({ connectionString });

const rowsForDisplay = (rows) => rows.map((row) => ({
  id: row.id,
  public: row.public,
  file_size_limit: row.file_size_limit,
  allowed_mime_types: row.allowed_mime_types,
}));

try {
  await client.connect();

  const before = await client.query(
    'select id, public, file_size_limit, allowed_mime_types from storage.buckets order by id',
  );
  console.log('Storage buckets before provisioning:');
  console.table(rowsForDisplay(before.rows));

  for (const bucket of buckets) {
    await client.query(
      `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
       values ($1, $1, $2, $3, $4)
       on conflict (id) do update set
         name = excluded.name,
         public = excluded.public,
         file_size_limit = excluded.file_size_limit,
         allowed_mime_types = excluded.allowed_mime_types,
         updated_at = now()`,
      [bucket.id, bucket.public, bucket.fileSizeLimit, bucket.allowedMimeTypes],
    );
  }

  const after = await client.query(
    'select id, public, file_size_limit, allowed_mime_types from storage.buckets order by id',
  );
  console.log('Storage buckets after provisioning:');
  console.table(rowsForDisplay(after.rows));

  console.log('CampusOne bucket usage:');
  console.table(buckets.map(({ id, usedBy }) => ({ bucket: id, used_by: usedBy })));
} finally {
  await client.end();
}
