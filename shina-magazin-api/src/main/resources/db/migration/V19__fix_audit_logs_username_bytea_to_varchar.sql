-- Fix audit_logs.username column from bytea to VARCHAR (proper conversion)
-- The previous migration (V18) didn't work because bytea::text doesn't work properly

-- Step 1: Check current type and convert
DO $$
BEGIN
    -- If username is bytea, we need to convert it properly
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs'
          AND column_name = 'username'
          AND udt_name = 'bytea'
    ) THEN
        -- Convert bytea to VARCHAR using convert_from
        ALTER TABLE audit_logs
        ALTER COLUMN username TYPE VARCHAR(100)
        USING CASE
            WHEN username IS NULL THEN NULL
            ELSE convert_from(username, 'UTF8')
        END;

        RAISE NOTICE 'Successfully converted username from bytea to VARCHAR(100)';
    ELSE
        RAISE NOTICE 'username column is already VARCHAR or does not exist';
    END IF;
END $$;

-- Verify the change
DO $$
DECLARE
    col_type TEXT;
BEGIN
    SELECT udt_name INTO col_type
    FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'username';

    RAISE NOTICE 'Current username column type: %', col_type;
END $$;
