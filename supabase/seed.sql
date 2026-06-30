-- Local Supabase reset seed.
-- Keep storage buckets in sync with backend upload targets.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('assignments', 'assignments', true, 52428800, null),
  ('lectures', 'lectures', true, 52428800, null),
  ('admission-documents', 'admission-documents', true, 52428800, null),
  ('profile-pictures', 'profile-pictures', true, 52428800, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[])
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  updated_at = now();
