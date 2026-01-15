-- =====================================================
-- V15: Application settings storage
-- =====================================================

CREATE TABLE app_settings (
    id BIGSERIAL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

INSERT INTO app_settings (setting_key, setting_value, description)
VALUES ('DEBT_DUE_DAYS', '30', 'Default debt due date in days');
