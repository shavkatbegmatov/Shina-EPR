-- Customer Portal Schema
-- Mijoz shaxsiy kabineti uchun ma'lumotlar bazasi o'zgarishlari

-- Customer jadvaliga yangi ustunlar qo'shish
ALTER TABLE customers ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS pin_set_at TIMESTAMP;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS pin_attempts INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMP;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'uz';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- Bildirishnomalar jadvali
CREATE TABLE IF NOT EXISTS customer_notifications (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    title_uz VARCHAR(200) NOT NULL,
    title_ru VARCHAR(200) NOT NULL,
    message_uz VARCHAR(1000) NOT NULL,
    message_ru VARCHAR(1000) NOT NULL,
    notification_type VARCHAR(30) NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    metadata JSONB,
    CONSTRAINT fk_notification_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Indekslar
CREATE INDEX IF NOT EXISTS idx_notifications_customer ON customer_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON customer_notifications(customer_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON customer_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_customers_phone_portal ON customers(phone) WHERE portal_enabled = true;

-- Izoh: notification_type qiymatlari:
-- DEBT_REMINDER - Qarz eslatmasi
-- PAYMENT_RECEIVED - To'lov qabul qilindi
-- PROMOTION - Aksiya/chegirma xabari
-- SYSTEM - Tizim xabari
