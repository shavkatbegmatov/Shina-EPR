-- Staff notifications table
CREATE TABLE staff_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    notification_type VARCHAR(30) NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    reference_type VARCHAR(30),
    reference_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

-- Indexes
CREATE INDEX idx_staff_notifications_user ON staff_notifications(user_id);
CREATE INDEX idx_staff_notifications_is_read ON staff_notifications(is_read);
CREATE INDEX idx_staff_notifications_created_at ON staff_notifications(created_at DESC);
CREATE INDEX idx_staff_notifications_type ON staff_notifications(notification_type);

COMMENT ON TABLE staff_notifications IS 'Xodimlar uchun bildirishnomalar';
COMMENT ON COLUMN staff_notifications.user_id IS 'Foydalanuvchi ID (NULL = barcha xodimlar uchun)';
COMMENT ON COLUMN staff_notifications.notification_type IS 'Bildirishnoma turi: ORDER, PAYMENT, WARNING, CUSTOMER, INFO, SUCCESS';
COMMENT ON COLUMN staff_notifications.reference_type IS 'Bog''liq obyekt turi: SALE, CUSTOMER, PRODUCT, DEBT';
COMMENT ON COLUMN staff_notifications.reference_id IS 'Bog''liq obyekt ID';
