-- Login attempts table for security audit trail
CREATE TABLE login_attempts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    username VARCHAR(100) NOT NULL,
    ip_address VARCHAR(50) NOT NULL,
    user_agent VARCHAR(1000),
    device_type VARCHAR(50),
    browser VARCHAR(50),
    os VARCHAR(50),
    location VARCHAR(100),
    status VARCHAR(20) NOT NULL,
    failure_reason VARCHAR(50),
    failure_message VARCHAR(255),
    session_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_login_attempts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_login_attempts_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

-- Indexes for performance and security queries
CREATE INDEX idx_login_attempts_username ON login_attempts(username);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_created ON login_attempts(created_at DESC);
CREATE INDEX idx_login_attempts_status ON login_attempts(status);
CREATE INDEX idx_login_attempts_user_status ON login_attempts(user_id, status);

-- Composite index for security queries (find failed attempts by IP in last hour)
CREATE INDEX idx_login_attempts_ip_status_time ON login_attempts(ip_address, status, created_at);

-- Composite index for user security (find recent failed attempts for user)
CREATE INDEX idx_login_attempts_username_status_time ON login_attempts(username, status, created_at);

COMMENT ON TABLE login_attempts IS 'Audit trail of all login attempts (success and failure) for security monitoring';
COMMENT ON COLUMN login_attempts.status IS 'SUCCESS or FAILED';
COMMENT ON COLUMN login_attempts.failure_reason IS 'Reason for failure: INVALID_PASSWORD, USER_NOT_FOUND, ACCOUNT_LOCKED, etc.';
