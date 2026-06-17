-- Faza 5n: Storefront (/magazin) guest buyurtmalari.
-- Mijoz aloqasi embed (Customer FK yo'q); narx serverda hisoblanadi.

CREATE TABLE shop_orders (
    id BIGSERIAL PRIMARY KEY,
    order_no VARCHAR(30) NOT NULL UNIQUE,
    customer_name VARCHAR(120) NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    customer_email VARCHAR(120),
    delivery_method VARCHAR(20) NOT NULL,
    delivery_address VARCHAR(300),
    delivery_note VARCHAR(500),
    payment_method VARCHAR(20) NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    delivery_fee DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'NEW',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE INDEX idx_shop_orders_order_no ON shop_orders(order_no);
CREATE INDEX idx_shop_orders_status ON shop_orders(status);
CREATE INDEX idx_shop_orders_created_at ON shop_orders(created_at);

CREATE TABLE shop_order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    product_name VARCHAR(200) NOT NULL,
    size_string VARCHAR(30),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    total_price DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE INDEX idx_shop_order_items_order ON shop_order_items(order_id);
CREATE INDEX idx_shop_order_items_product ON shop_order_items(product_id);
