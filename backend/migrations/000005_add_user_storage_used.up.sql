-- 000005_add_user_storage_used.up.sql
-- Add storage_used_bytes to users for quick quota checks

ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS storage_used_bytes bigint DEFAULT 0;