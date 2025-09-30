-- Add deleted_at column to notes table for soft delete functionality
ALTER TABLE notes 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Create index for better performance when querying deleted/active notes
CREATE INDEX idx_notes_deleted_at ON notes(deleted_at);

-- Create function to automatically permanently delete notes older than 30 days
CREATE OR REPLACE FUNCTION delete_old_trashed_notes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM notes
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '30 days';
END;
$$;