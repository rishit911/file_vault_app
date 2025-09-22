-- 000007_add_user_to_user_sharing.down.sql
-- Rollback user-to-user sharing functionality

DROP INDEX IF EXISTS idx_users_username;
ALTER TABLE users DROP COLUMN IF EXISTS username;

DROP INDEX IF EXISTS idx_user_shares_file_id;
DROP INDEX IF EXISTS idx_user_shares_owner_id;
DROP INDEX IF EXISTS idx_user_shares_shared_with_id;

DROP TABLE IF EXISTS user_shares;