-- V21: Add correlation_id to audit_logs table for grouping related audit events
-- This allows grouping multiple audit logs that were created as part of a single operation

ALTER TABLE audit_logs ADD COLUMN correlation_id UUID;

-- Create index for efficient correlation_id queries
CREATE INDEX idx_audit_logs_correlation_id ON audit_logs(correlation_id);

-- Add comment for documentation
COMMENT ON COLUMN audit_logs.correlation_id IS 'Groups related audit logs from a single operation (e.g., payment + debt update)';
