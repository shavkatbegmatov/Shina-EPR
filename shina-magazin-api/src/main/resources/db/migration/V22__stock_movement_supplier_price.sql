-- Kirim (IN) harakati uchun ta'minotchi va birlik narxini saqlash imkoni.
-- IncomeModal bu maydonlarni yuborardi, ammo ilgari saqlanmasdi.

ALTER TABLE stock_movements
    ADD COLUMN supplier_id BIGINT REFERENCES suppliers(id),
    ADD COLUMN unit_price DECIMAL(15, 2);

CREATE INDEX idx_stock_movements_supplier ON stock_movements(supplier_id);
