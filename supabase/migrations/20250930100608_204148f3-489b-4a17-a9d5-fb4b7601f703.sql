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