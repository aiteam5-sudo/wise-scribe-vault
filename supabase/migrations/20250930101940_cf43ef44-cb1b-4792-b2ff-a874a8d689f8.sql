-- Add image_files column to notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS image_files TEXT[];

-- Create sticky_notes table
CREATE TABLE IF NOT EXISTS sticky_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#fef3c7',
  position_x NUMERIC NOT NULL DEFAULT 100,
  position_y NUMERIC NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on sticky_notes
ALTER TABLE sticky_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for sticky_notes
CREATE POLICY "Users can view their own sticky notes"
  ON sticky_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sticky notes"
  ON sticky_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sticky notes"
  ON sticky_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sticky notes"
  ON sticky_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for sticky_notes updated_at
CREATE TRIGGER update_sticky_notes_updated_at
  BEFORE UPDATE ON sticky_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for note images
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-images', 'note-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for note images
CREATE POLICY "Users can view images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'note-images');

CREATE POLICY "Users can upload their own images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'note-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'note-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'note-images' AND auth.uid()::text = (storage.foldername(name))[1]);