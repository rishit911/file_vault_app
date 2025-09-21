-- 000003_update_shares_schema.down.sql
-- Revert to original shares and downloads schema

DROP TABLE IF EXISTS downloads;
DROP TABLE IF EXISTS shares;

-- Recreate original shares table
CREATE TABLE IF NOT EXISTS shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_file_id UUID NOT NULL REFERENCES user_files(id) ON DELETE CASCADE,
    public_link TEXT,
    expires_at TIMESTAMPTZ,
    download_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Recreate original downloads table
CREATE TABLE IF NOT EXISTS downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_file_id UUID NOT NULL REFERENCES user_files(id),
    downloader_ip TEXT,
    downloaded_at TIMESTAMPTZ DEFAULT now()
);

-- Remove download_count column from file_objects
ALTER TABLE file_objects DROP COLUMN IF EXISTS download_count;