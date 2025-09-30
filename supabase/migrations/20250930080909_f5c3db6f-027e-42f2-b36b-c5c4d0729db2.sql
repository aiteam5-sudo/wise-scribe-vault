-- Add position column to notes table for ordering
ALTER TABLE notes ADD COLUMN position INTEGER DEFAULT 0;

-- Update existing notes with incremental positions
WITH ordered_notes AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) as rn
  FROM notes
)
UPDATE notes
SET position = ordered_notes.rn
FROM ordered_notes
WHERE notes.id = ordered_notes.id;