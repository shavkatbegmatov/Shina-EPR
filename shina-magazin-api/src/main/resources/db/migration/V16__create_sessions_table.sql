-- Sessions table for tracking user login sessions
CREATE TABLE sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    ip_address VARCHAR(50),
    user_agent VARCHAR(1000),
    device_type VARCHAR(50),
    browser VARCHAR(50),
    os VARCHAR(50),
    location VARCHAR(100),
    expires_at TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true,
    revoked_at TIMESTAMP,
    revoked_by BIGINT,
    revoke_reason VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0,

    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sessions_revoked_by FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE UNIQUE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_is_active ON sessions(is_active);
CREATE INDEX idx_sessions_last_activity ON sessions(last_activity_at);

-- Composite index for active session queries
CREATE INDEX idx_sessions_user_active ON sessions(user_id, is_active) WHERE is_active = true;

-- Table and column comments
COMMENT ON TABLE sessions IS 'Tracks user login sessions for session management';
COMMENT ON COLUMN sessions.token_hash IS 'SHA-256 hash of JWT access token';
COMMENT ON COLUMN sessions.last_activity_at IS 'Last time session was used (updated periodically)';
