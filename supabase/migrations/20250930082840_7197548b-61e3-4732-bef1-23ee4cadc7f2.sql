-- Make note_id nullable in action_items table to support standalone tasks
ALTER TABLE action_items 
ALTER COLUMN note_id DROP NOT NULL;