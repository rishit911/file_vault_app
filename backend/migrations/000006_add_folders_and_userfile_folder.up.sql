-- 000006_add_folders_and_userfile_folder.up.sql
-- Adds folders table and folder_id to user_files

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid NULL REFERENCES folders(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_files 
  ADD COLUMN IF NOT EXISTS folder_id uuid NULL REFERENCES folders(id) ON DELETE SET NULL;

-- Shares table already has folder_id column (we added in prior migration).
-- Create indexes for quick folder lookups
CREATE INDEX IF NOT EXISTS idx_folders_owner_id ON folders(owner_id);
CREATE INDEX IF NOT EXISTS idx_user_files_folder_id ON user_files(folder_id);