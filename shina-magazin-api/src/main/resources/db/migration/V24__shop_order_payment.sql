-- Faza 5q: Storefront buyurtmasiga to'lov holati (onlayn to'lov uchun).

ALTER TABLE shop_orders
    ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN provider_transaction_id VARCHAR(100),
    ADD COLUMN paid_at TIMESTAMP;

CREATE INDEX idx_shop_orders_payment_status ON shop_orders(payment_status);
