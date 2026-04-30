import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Upload a file buffer to Supabase Storage.
 * Returns the public URL of the uploaded file.
 */
export const uploadToStorage = async (bucket, filePath, buffer, mimeType) => {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, buffer, { contentType: mimeType, upsert: false });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
};

/**
 * Delete a file from Supabase Storage by its path.
 */
export const deleteFromStorage = async (bucket, filePath) => {
  const { error } = await supabase.storage.from(bucket).remove([filePath]);
  if (error) console.error(`[Storage] Delete error: ${error.message}`);
};

/**
 * Extract the storage path from a public URL so it can be deleted later.
 * e.g. "https://xxx.supabase.co/storage/v1/object/public/assignments/abc/file.pdf"
 * → "abc/file.pdf"
 */
export const pathFromUrl = (url, bucket) => {
  const marker = `/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  return idx !== -1 ? url.slice(idx + marker.length) : null;
};
