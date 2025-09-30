-- Create storage buckets for audio and video files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('note-audio', 'note-audio', false, 52428800, ARRAY['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm', 'audio/ogg']::text[]),
  ('note-video', 'note-video', false, 104857600, ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']::text[])
ON CONFLICT (id) DO NOTHING;

-- RLS policies for audio bucket
CREATE POLICY "Users can view their own audio files"
ON storage.objects FOR SELECT
USING (bucket_id = 'note-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own audio files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'note-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own audio files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'note-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own audio files"
ON storage.objects FOR DELETE
USING (bucket_id = 'note-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS policies for video bucket
CREATE POLICY "Users can view their own video files"
ON storage.objects FOR SELECT
USING (bucket_id = 'note-video' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own video files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'note-video' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own video files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'note-video' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own video files"
ON storage.objects FOR DELETE
USING (bucket_id = 'note-video' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add video_url column to notes table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notes' AND column_name = 'video_url'
  ) THEN
    ALTER TABLE notes ADD COLUMN video_url TEXT;
  END IF;
END $$;

-- Add audio_files array column to notes table to support multiple audio files
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notes' AND column_name = 'audio_files'
  ) THEN
    ALTER TABLE notes ADD COLUMN audio_files TEXT[];
  END IF;
END $$;

-- Add video_files array column to notes table to support multiple video files
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notes' AND column_name = 'video_files'
  ) THEN
    ALTER TABLE notes ADD COLUMN video_files TEXT[];
  END IF;
END $$;