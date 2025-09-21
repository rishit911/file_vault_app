-- 000004_add_tags_and_indexes.down.sql
DROP INDEX IF EXISTS idx_user_files_uploaded_at;
DROP INDEX IF EXISTS idx_file_objects_size_bytes;
DROP INDEX IF EXISTS idx_file_objects_mime_type;
DROP INDEX IF EXISTS idx_file_tags_tag_id;
DROP INDEX IF EXISTS idx_tags_name;

DROP TABLE IF EXISTS file_tags;
DROP TABLE IF EXISTS tags;