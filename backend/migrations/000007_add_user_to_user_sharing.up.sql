-- 000007_add_user_to_user_sharing.up.sql
-- Add user-to-user sharing functionality

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create user_shares table for direct user-to-user sharing
CREATE TABLE IF NOT EXISTS user_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES file_objects(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_at TIMESTAMPTZ DEFAULT now(),
    message TEXT, -- optional message from sharer
    UNIQUE(file_id, owner_id, shared_with_id) -- prevent duplicate shares
);

-- Create indexes for efficient queries
CREATE INDEX idx_user_shares_shared_with_id ON user_shares(shared_with_id);
CREATE INDEX idx_user_shares_owner_id ON user_shares(owner_id);
CREATE INDEX idx_user_shares_file_id ON user_shares(file_id);

-- Add username field to users table for easier sharing
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create index on username for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);