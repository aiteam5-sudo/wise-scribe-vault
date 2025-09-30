-- Add parent_id column to folders table to support nested folders
ALTER TABLE folders ADD COLUMN parent_id uuid REFERENCES folders(id) ON DELETE CASCADE;

-- Create index for better performance when querying nested folders
CREATE INDEX idx_folders_parent_id ON folders(parent_id);

-- Update RLS policies remain the same as they already check user_id