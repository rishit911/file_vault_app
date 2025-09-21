-- 000006_add_folders_and_userfile_folder.down.sql
ALTER TABLE user_files DROP COLUMN IF EXISTS folder_id;
DROP INDEX IF EXISTS idx_user_files_folder_id;
DROP INDEX IF EXISTS idx_folders_owner_id;
DROP TABLE IF EXISTS folders;