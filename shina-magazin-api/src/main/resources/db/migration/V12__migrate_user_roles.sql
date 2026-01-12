-- Shina Magazin ERP - User Role Migration
-- V12: Migrate existing users from role column to user_roles table

-- Migrate existing users based on their current role column
INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT
    u.id,
    r.id,
    CURRENT_TIMESTAMP
FROM users u
JOIN roles r ON r.code = u.role
WHERE u.active = true;

-- Add comment to old role column (keeping for backward compatibility during transition)
COMMENT ON COLUMN users.role IS 'DEPRECATED: Use user_roles table instead. Will be removed in future version.';
