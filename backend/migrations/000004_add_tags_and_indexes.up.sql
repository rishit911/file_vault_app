-- 000004_add_tags_and_indexes.up.sql
-- Adds tags and file_tags tables and useful indexes for searching.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS file_tags (
    file_id uuid NOT NULL REFERENCES file_objects(id) ON DELETE CASCADE,
    tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (file_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(lower(name));
CREATE INDEX IF NOT EXISTS idx_file_tags_tag_id ON file_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_file_objects_mime_type ON file_objects(mime_type);
CREATE INDEX IF NOT EXISTS idx_file_objects_size_bytes ON file_objects(size_bytes);
CREATE INDEX IF NOT EXISTS idx_user_files_uploaded_at ON user_files(uploaded_at);