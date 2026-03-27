-- Storage bucket for speaking practice audios
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'practice-audios',
  'practice-audios',
  true,
  52428800,
  ARRAY['audio/webm', 'audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view practice audios" ON storage.objects;
CREATE POLICY "Anyone can view practice audios" ON storage.objects
  FOR SELECT USING (bucket_id = 'practice-audios');

DROP POLICY IF EXISTS "Authenticated users can upload practice audios" ON storage.objects;
CREATE POLICY "Authenticated users can upload practice audios" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'practice-audios' AND auth.role() = 'authenticated');
