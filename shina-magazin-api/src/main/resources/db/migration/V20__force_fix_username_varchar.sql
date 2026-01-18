-- V20: Force fix username column to VARCHAR(100)
-- This migration ensures username is VARCHAR regardless of previous migration states
-- Previous V18 and V19 migrations didn't work properly due to conditional logic

-- Step 1: Drop username column if it exists (with CASCADE to remove dependencies)
DO $$
BEGIN
    -- Check if column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs' AND column_name = 'username'
    ) THEN
        -- Drop the column
        EXECUTE 'ALTER TABLE audit_logs DROP COLUMN username CASCADE';
        RAISE NOTICE 'Dropped existing username column';
    ELSE
        RAISE NOTICE 'username column does not exist yet';
    END IF;
END $$;

-- Step 2: Create username column with correct VARCHAR(100) type
ALTER TABLE audit_logs ADD COLUMN username VARCHAR(100);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_username ON audit_logs(username);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Step 4: Verify the fix
DO $$
DECLARE
    col_type TEXT;
BEGIN
    SELECT udt_name INTO col_type
    FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'username';

    IF col_type = 'varchar' THEN
        RAISE NOTICE 'V20 SUCCESS: username column is now VARCHAR(100)';
    ELSE
        RAISE EXCEPTION 'V20 FAILED: username column type is % instead of varchar', col_type;
    END IF;
END $$;
