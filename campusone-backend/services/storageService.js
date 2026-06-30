// Supabase Storage helper. Centralises bucket access + URL generation.
// Buckets used: lectures, assignments, admission-documents, profile-pictures
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _client = null;
const getClient = () => {
  if (!_client) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    }
    _client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return _client;
};

const safeName = (filename) => {
  const ext = path.extname(filename || '').toLowerCase();
  const stamp = Date.now();
  const rand = crypto.randomBytes(4).toString('hex');
  return `${stamp}-${rand}${ext}`;
};

/**
 * Upload a file buffer (e.g. from multer) to a Supabase bucket.
 * @param {'lectures' | 'assignments' | 'admission-documents' | 'profile-pictures'} bucket
 * @param {Buffer} buffer
 * @param {string} originalName
 * @param {string} mimeType
 * @param {string} [folder] - optional sub-folder prefix (e.g. application ID)
 * @returns {Promise<{ path: string, publicUrl: string, originalName: string }>}
 */
export const uploadToBucket = async (bucket, buffer, originalName, mimeType, folder = '') => {
  const sb = getClient();
  const name = safeName(originalName);
  const filePath = folder ? `${folder}/${name}` : name;
  const { error } = await sb.storage.from(bucket).upload(filePath, buffer, {
    contentType: mimeType || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw error;
  const { data } = sb.storage.from(bucket).getPublicUrl(filePath);
  return { path: filePath, publicUrl: data.publicUrl, originalName };
};

/**
 * Generate a signed URL with TTL (default 1 hour).
 */
export const signedUrl = async (bucket, filePath, expiresIn = 3600) => {
  const sb = getClient();
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(filePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
};

/**
 * Delete a file from a bucket.
 */
export const deleteFromBucket = async (bucket, filePath) => {
  const sb = getClient();
  const { error } = await sb.storage.from(bucket).remove([filePath]);
  if (error) throw error;
};

export const isStorageConfigured = () => !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
