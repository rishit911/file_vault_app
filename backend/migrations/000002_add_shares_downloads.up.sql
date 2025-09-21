-- 000002_add_shares_downloads.up.sql
-- Add shares and downloads tables and a download_count column to file_objects

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NULL REFERENCES file_objects(id) ON DELETE CASCADE,
    folder_id UUID NULL, -- optional for folder-sharing
    owner_id UUID NOT NULL REFERENCES users(id),
    token TEXT NOT NULL UNIQUE,
    public BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ NULL,
    max_downloads INT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shares_token ON shares(token);

CREATE TABLE IF NOT EXISTS downloads (
    id BIGSERIAL PRIMARY KEY,
    share_id UUID REFERENCES shares(id),
    file_id UUID NOT NULL REFERENCES file_objects(id) ON DELETE CASCADE,
    downloader_id UUID NULL REFERENCES users(id),
    ip INET NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_downloads_file_id ON downloads(file_id);
CREATE INDEX IF NOT EXISTS idx_downloads_share_id ON downloads(share_id);

ALTER TABLE file_objects
    ADD COLUMN IF NOT EXISTS download_count BIGINT DEFAULT 0;