-- 000005_add_user_storage_used.down.sql
ALTER TABLE users DROP COLUMN IF EXISTS storage_used_bytes;