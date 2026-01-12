-- V13: User Password Management
-- Supports employee credential management with forced password change

-- Add new columns for password management
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP;
ALTER TABLE users ADD COLUMN created_by BIGINT REFERENCES users(id);

-- Add index for created_by for audit queries
CREATE INDEX idx_users_created_by ON users(created_by);

-- Comment on columns for documentation
COMMENT ON COLUMN users.must_change_password IS 'Flag indicating user must change password on next login';
COMMENT ON COLUMN users.password_changed_at IS 'Timestamp of last password change';
COMMENT ON COLUMN users.created_by IS 'ID of admin user who created this account';
