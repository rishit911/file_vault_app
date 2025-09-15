-- 000001_create_core_tables.up.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS file_objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hash TEXT NOT NULL UNIQUE,
    storage_path TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    mime_type TEXT,
    ref_count INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_object_id UUID NOT NULL REFERENCES file_objects(id) ON DELETE RESTRICT,
    filename TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'private', -- private | public
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_file_id UUID NOT NULL REFERENCES user_files(id) ON DELETE CASCADE,
    public_link TEXT,
    expires_at TIMESTAMPTZ,
    download_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_file_id UUID NOT NULL REFERENCES user_files(id),
    downloader_ip TEXT,
    downloaded_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes to speed up searches
CREATE INDEX IF NOT EXISTS idx_user_files_user_id ON user_files(user_id);
CREATE INDEX IF NOT EXISTS idx_file_objects_hash ON file_objects(hash);