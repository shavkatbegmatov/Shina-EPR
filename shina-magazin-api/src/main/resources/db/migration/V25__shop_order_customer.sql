-- Faza 6: Storefront buyurtmasini mijoz akkauntiga bog'lash (login bo'lganda).
-- Nullable — guest checkout (FK siz) saqlanadi. Login'gacha guest buyurtmalar
-- telefon (customer_phone, mavjud) orqali ham topiladi.

ALTER TABLE shop_orders
    ADD COLUMN customer_id BIGINT REFERENCES customers(id);

CREATE INDEX idx_shop_orders_customer_id ON shop_orders(customer_id);
