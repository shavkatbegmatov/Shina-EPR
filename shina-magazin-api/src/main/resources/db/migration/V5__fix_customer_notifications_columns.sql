-- Fix missing columns in customer_notifications table (from BaseEntity)
ALTER TABLE customer_notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
ALTER TABLE customer_notifications ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
