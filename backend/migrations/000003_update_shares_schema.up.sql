-- 000003_update_shares_schema.up.sql
-- Update existing shares and downloads tables to match new sharing feature schema

-- First, drop existing tables to recreate with new schema
DROP TABLE IF EXISTS downloads;
DROP TABLE IF EXISTS shares;

-- Create new shares table with proper schema for file sharing
CREATE TABLE shares (
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

CREATE INDEX idx_shares_token ON shares(token);

-- Create new downloads table
CREATE TABLE downloads (
    id BIGSERIAL PRIMARY KEY,
    share_id UUID REFERENCES shares(id),
    file_id UUID NOT NULL REFERENCES file_objects(id) ON DELETE CASCADE,
    downloader_id UUID NULL REFERENCES users(id),
    ip INET NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_downloads_file_id ON downloads(file_id);
CREATE INDEX idx_downloads_share_id ON downloads(share_id);

-- Add download_count column to file_objects if it doesn't exist
ALTER TABLE file_objects 
    ADD COLUMN IF NOT EXISTS download_count BIGINT DEFAULT 0;