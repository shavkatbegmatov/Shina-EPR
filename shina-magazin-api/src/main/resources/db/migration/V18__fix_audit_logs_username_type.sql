-- Fix audit_logs.username column type from bytea to VARCHAR
-- This fixes the PostgreSQL error: function lower(bytea) does not exist

-- Drop the column if it exists with wrong type and recreate
ALTER TABLE audit_logs ALTER COLUMN username TYPE VARCHAR(100) USING username::text;

-- Add index for better search performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_username ON audit_logs(username);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
