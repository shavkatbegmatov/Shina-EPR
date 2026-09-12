-- Barter hujjati: eski shinalar savdodan ALOHIDA ham qabul qilinadi.
--
-- V44 da barter faqat savdo ichida edi (sale_trade_in_items — savdoning
-- qatorlari). Amaliyotda mijoz eski shinalarini BUGUN qoldirib, yangisini
-- keyinroq oladi ("pulim yig'ilsin", "kerakli o'lcham kelsin") — buni
-- rasmiylashtirib bo'lmasdi: shina do'konda, hisobda esa yo'q.
--
-- Endi barter alohida raqamlangan hujjat (TI-000001):
--   NEW       — qabul qilingan, kassada kutmoqda (mijozning krediti)
--   APPLIED   — savdoda hisobga olingan (sale_id to'ldirilgan)
--   CANCELLED — bekor qilingan, shinalar mijozga qaytarilgan
--
-- Savdo ichida qabul qilingan barter ham shu hujjat bo'lib yoziladi
-- (accepted_in_sale = TRUE) — bitta jadval, bitta hisob. Farqi savdo bekor
-- qilinganda ko'rinadi: savdo ichidagi hujjat bekor bo'ladi (shinalar
-- mijozga qaytadi), oldindan qabul qilingani esa yana NEW holatiga qaytadi
-- — mijozning krediti saqlanadi, shinalar omborda qolaveradi.
--
-- `sales.trade_in_amount` o'zgarmaydi: savdo yozuvi o'zi to'liq (chek,
-- hisobotlar shu ustundan o'qiydi), hujjatlar esa "qaysi shinalar" degan
-- savolga javob beradi.

CREATE TABLE trade_ins (
    id               BIGSERIAL      PRIMARY KEY,
    document_number  VARCHAR(30)    NOT NULL UNIQUE,
    -- Eski shinalar kimdan olingani hujjatda qolishi shart
    customer_id      BIGINT         NOT NULL REFERENCES customers(id),
    -- Qaysi savdoda ishlatilgan. NULL = hali ishlatilmagan (NEW) yoki
    -- savdo bekor qilinib hujjat yana bo'shatilgan.
    sale_id          BIGINT         REFERENCES sales(id),
    accepted_at      TIMESTAMP      NOT NULL,
    -- TRUE — kassada savdo ichida qabul qilingan; FALSE — Barter sahifasida,
    -- savdodan oldin. Savdo bekor qilinganda taqdiri shu bilan hal bo'ladi.
    accepted_in_sale BOOLEAN        NOT NULL DEFAULT FALSE,
    status           VARCHAR(20)    NOT NULL,
    -- Qabul qilingan shinalarning umumiy krediti (qatorlar yig'indisi)
    total_amount     DECIMAL(15, 2) NOT NULL CHECK (total_amount >= 0),
    notes            VARCHAR(500),
    -- Qaysi smenada qabul qilingan. Savdodagidek NULL bo'lishi mumkin:
    -- ochiq smena yo'qligi uchun qabul bloklanmaydi.
    shift_id         BIGINT         REFERENCES cash_shifts(id),
    created_by       BIGINT         NOT NULL REFERENCES users(id),
    created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP,
    version          BIGINT         DEFAULT 0
);

CREATE TABLE trade_in_items (
    id          BIGSERIAL      PRIMARY KEY,
    trade_in_id BIGINT         NOT NULL REFERENCES trade_ins(id) ON DELETE CASCADE,
    -- Eski shina qaysi B/U mahsulot sifatida omborga kirdi
    product_id  BIGINT         NOT NULL REFERENCES products(id),
    quantity    INTEGER        NOT NULL CHECK (quantity > 0),
    unit_value  DECIMAL(15, 2) NOT NULL CHECK (unit_value >= 0),
    total_value DECIMAL(15, 2) NOT NULL,
    -- Brend, holati ("protektor 60%") — mijozga chekda va omborga izoh
    description VARCHAR(300),
    created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP,
    version     BIGINT         DEFAULT 0
);

CREATE INDEX idx_trade_ins_customer ON trade_ins (customer_id);
CREATE INDEX idx_trade_ins_sale ON trade_ins (sale_id);
CREATE INDEX idx_trade_ins_shift ON trade_ins (shift_id);
-- Kassada "mijozning kutayotgan barterlari" shu bo'yicha olinadi
CREATE INDEX idx_trade_ins_status ON trade_ins (status);
CREATE INDEX idx_trade_in_items_trade_in ON trade_in_items (trade_in_id);
CREATE INDEX idx_trade_in_items_product ON trade_in_items (product_id);

COMMENT ON TABLE trade_ins IS 'Barter hujjati — mijozdan qabul qilingan eski shinalar va ularning krediti';
COMMENT ON COLUMN trade_ins.sale_id IS 'Qaysi savdoda ishlatilgan; NULL = hali ishlatilmagan';
COMMENT ON COLUMN trade_ins.accepted_in_sale IS 'TRUE — kassada savdo ichida qabul qilingan; FALSE — savdodan oldin, Barter sahifasida';
COMMENT ON COLUMN trade_ins.total_amount IS 'Qabul qilingan shinalarning umumiy krediti — savdo summasidan shu ayiriladi';
COMMENT ON TABLE trade_in_items IS 'Barter hujjati qatorlari: eski shina → B/U mahsulot';

-- ─── Mavjud barter savdolarini hujjatlarga ko'chirish ───
-- Har savdoga bitta hujjat: savdo ichida qabul qilingan (accepted_in_sale),
-- holati savdoga ergashadi. Raqamlar savdo tartibida beriladi.
INSERT INTO trade_ins (document_number, customer_id, sale_id, accepted_at, accepted_in_sale,
                       status, total_amount, shift_id, created_by, created_at, updated_at)
SELECT 'TI-' || LPAD((ROW_NUMBER() OVER (ORDER BY s.id))::text, 6, '0'),
       s.customer_id,
       s.id,
       s.sale_date,
       TRUE,
       CASE WHEN s.status = 'CANCELLED' THEN 'CANCELLED' ELSE 'APPLIED' END,
       SUM(t.total_value),
       s.shift_id,
       s.created_by,
       s.created_at,
       s.updated_at
FROM sales s
         JOIN sale_trade_in_items t ON t.sale_id = s.id
GROUP BY s.id, s.customer_id, s.sale_date, s.status, s.shift_id, s.created_by, s.created_at, s.updated_at;

INSERT INTO trade_in_items (trade_in_id, product_id, quantity, unit_value, total_value, description,
                            created_at, updated_at)
SELECT ti.id, t.product_id, t.quantity, t.unit_value, t.total_value, t.description,
       t.created_at, t.updated_at
FROM sale_trade_in_items t
         JOIN trade_ins ti ON ti.sale_id = t.sale_id;

-- Ombor harakatlari endi hujjatga ishora qiladi (ilgari savdoga)
UPDATE stock_movements m
SET reference_id = ti.id
FROM trade_ins ti
WHERE m.reference_type IN ('TRADE_IN', 'TRADE_IN_CANCEL')
  AND m.reference_id = ti.sale_id;

-- Hisoblagich ko'chirilgan hujjatlardan davom etadi (DocumentNumberService, "TI-")
INSERT INTO document_sequences (seq_key, next_value, updated_at)
SELECT 'TI-', COUNT(*), CURRENT_TIMESTAMP FROM trade_ins
ON CONFLICT (seq_key) DO UPDATE
    SET next_value = GREATEST(document_sequences.next_value, EXCLUDED.next_value),
        updated_at = CURRENT_TIMESTAMP;

DROP TABLE sale_trade_in_items;

-- ─── Ruxsatlar ───
INSERT INTO permissions (code, module, action, description) VALUES
    ('TRADE_INS_VIEW',   'TRADE_INS', 'VIEW',   'Barter hujjatlarini ko''rish'),
    ('TRADE_INS_CREATE', 'TRADE_INS', 'CREATE', 'Eski shinani qabul qilish va baholash'),
    ('TRADE_INS_CANCEL', 'TRADE_INS', 'CANCEL', 'Barter hujjatini bekor qilish (omborga kirim qaytariladi)')
ON CONFLICT (code) DO NOTHING;

-- ADMIN — hammasi (V11 dagi qoida yangi kalitlarga tarqalmaydi, shuning
-- uchun aniq beriladi)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'ADMIN'), id
FROM permissions WHERE module = 'TRADE_INS'
ON CONFLICT DO NOTHING;

-- MANAGER — hammasi
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MANAGER'), id
FROM permissions WHERE module = 'TRADE_INS'
ON CONFLICT DO NOTHING;

-- SELLER (kassir): qabul qiladi va ko'radi, lekin BEKOR QILA OLMAYDI.
-- Bekor qilish omborga kirimni qaytaradi va berilgan kreditni yo'q qiladi —
-- SALES_REFUND bilan bir xil mulohaza: bu firibgarlik yo'li, shuning uchun
-- faqat MANAGER/ADMIN da qoladi.
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'SELLER'), id
FROM permissions WHERE code IN ('TRADE_INS_VIEW', 'TRADE_INS_CREATE')
ON CONFLICT DO NOTHING;
