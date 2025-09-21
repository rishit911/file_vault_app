-- 000002_add_shares_downloads.down.sql
ALTER TABLE file_objects DROP COLUMN IF EXISTS download_count;
DROP TABLE IF EXISTS downloads;
DROP TABLE IF EXISTS shares;