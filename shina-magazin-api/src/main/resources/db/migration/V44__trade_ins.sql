-- Barter: eski shinani hisobga olish.
--
-- Mijoz eski shinalarini olib keladi, sotuvchi ularni baholaydi, va yangi
-- shinalar narxidan shu baho ayiriladi: 900 000 - 200 000 = 700 000 to'lanadi.
--
-- Nega alohida hujjat, oddiy chegirma emas:
--   * Chegirma — pul yo'qotish. Barter esa TOVAR OLISH: qabul qilingan shinalar
--     omborga b/u tovar sifatida kiradi va keyin qayta sotiladi.
--   * Baholash savdodan alohida ham bo'lishi mumkin — mijoz bugun qoldirib
--     ketadi, xaridni keyinroq qiladi. Shuning uchun `sale_id` NULL bo'la oladi.
--   * Kassaga pul TUSHMAYDI. Chegirma qilib yozilsa Z-hisobot va tushum
--     hisoboti buzilardi: sotilgan tovar qiymati kamayib ko'rinardi.
--
-- Shuning uchun `sales.trade_in_amount` alohida ustun. `total_amount` sotilgan
-- tovarning haqiqiy qiymati bo'lib qoladi (tushum hisoboti to'g'ri), to'lanishi
-- kerak bo'lgan summa esa `total_amount - trade_in_amount`. Kassa faqat
-- `paid_amount` ni sanaydi, ya'ni barter naqd deb hisoblanmaydi.

CREATE TABLE trade_ins (
    id               BIGSERIAL      PRIMARY KEY,
    document_number  VARCHAR(30)    NOT NULL UNIQUE,
    customer_id      BIGINT         REFERENCES customers(id),

    -- Qaysi savdoda ishlatilgan. NULL = hali ishlatilmagan (mijoz qoldirib ketgan).
    sale_id          BIGINT         REFERENCES sales(id),

    accepted_at      TIMESTAMP      NOT NULL,
    status           VARCHAR(20)    NOT NULL,

    -- Qabul qilingan shinalarning umumiy bahosi
    total_amount     DECIMAL(15, 2) NOT NULL CHECK (total_amount >= 0),
    notes            VARCHAR(500),

    -- Qaysi smenada qabul qilingan. Savdodagidek NULL bo'lishi mumkin: ochiq
    -- smena bo'lmagani uchun barter qabuli bloklanmaydi.
    shift_id         BIGINT         REFERENCES cash_shifts(id),
    created_by       BIGINT         NOT NULL REFERENCES users(id),

    created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP,
    version          BIGINT         DEFAULT 0
);

CREATE TABLE trade_in_items (
    id             BIGSERIAL      PRIMARY KEY,
    trade_in_id    BIGINT         NOT NULL REFERENCES trade_ins(id) ON DELETE CASCADE,

    -- Qaysi mahsulot kartochkasiga kirim qilinadi. Do'kon b/u shinalar uchun
    -- alohida kartochka yuritadi: yangi shina kartochkasiga kirim qilinsa
    -- tannarx buzilardi va foyda hisoboti xato ko'rsatardi.
    product_id     BIGINT         NOT NULL REFERENCES products(id),

    quantity       INTEGER        NOT NULL CHECK (quantity > 0),
    unit_value     DECIMAL(15, 2) NOT NULL CHECK (unit_value >= 0),
    total_value    DECIMAL(15, 2) NOT NULL,

    -- Holati: "protektor 60%", "yon tomonida yorig'i bor" kabi qayd
    condition_note VARCHAR(200),

    -- `sale_items` dagidek: qator ham `BaseEntity` (optimistik qulf va vaqtlar)
    created_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP,
    version        BIGINT         DEFAULT 0
);

-- Savdoda hisobga olingan barter summasi. Chek va hisobotlar shu ustundan
-- o'qiydi, ya'ni savdo yozuvining o'zi to'liq va hujjatga bog'liq emas.
ALTER TABLE sales ADD COLUMN trade_in_amount DECIMAL(15, 2) NOT NULL DEFAULT 0;

CREATE INDEX idx_trade_ins_customer ON trade_ins (customer_id);
CREATE INDEX idx_trade_ins_sale ON trade_ins (sale_id);
CREATE INDEX idx_trade_ins_shift ON trade_ins (shift_id);
-- Kassada "ishlatilmagan barterlar" ro'yxati shu bo'yicha olinadi
CREATE INDEX idx_trade_ins_status ON trade_ins (status);
CREATE INDEX idx_trade_in_items_trade_in ON trade_in_items (trade_in_id);
CREATE INDEX idx_trade_in_items_product ON trade_in_items (product_id);

COMMENT ON TABLE trade_ins IS 'Barter hujjati — mijozdan qabul qilingan eski shinalar va ularning bahosi';
COMMENT ON COLUMN trade_ins.sale_id IS 'Qaysi savdoda ishlatilgan; NULL = hali ishlatilmagan';
COMMENT ON COLUMN trade_ins.total_amount IS 'Qabul qilingan shinalarning umumiy bahosi — savdo summasidan shu ayiriladi';
COMMENT ON COLUMN trade_in_items.product_id IS 'B/U mahsulot kartochkasi — yangi shina kartochkasi EMAS (tannarx buziladi)';
COMMENT ON COLUMN sales.trade_in_amount IS 'Savdoda hisobga olingan barter summasi; to''lanishi kerak = total_amount - trade_in_amount';

INSERT INTO permissions (code, module, action, description) VALUES
    ('TRADE_INS_VIEW',   'TRADE_INS', 'VIEW',   'Barter hujjatlarini ko''rish'),
    ('TRADE_INS_CREATE', 'TRADE_INS', 'CREATE', 'Eski shinani qabul qilish va baholash'),
    ('TRADE_INS_CANCEL', 'TRADE_INS', 'CANCEL', 'Barter hujjatini bekor qilish (omborga kirim qaytariladi)')
ON CONFLICT (code) DO NOTHING;

-- ADMIN barcha ruxsatlarni oladi (V11 dagi qoida yangi kalitlarga tarqalmaydi,
-- shuning uchun bu yerda aniq beriladi)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'ADMIN'), id
FROM permissions WHERE module = 'TRADE_INS'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MANAGER'), id
FROM permissions WHERE module = 'TRADE_INS'
ON CONFLICT DO NOTHING;

-- SELLER (kassir): qabul qiladi va ko'radi, lekin BEKOR QILA OLMAYDI.
-- Bekor qilish omborga kirimni qaytaradi va baholangan summani yo'q qiladi —
-- `SALES_REFUND` bilan bir xil mulohaza: bu firibgarlik yo'li, shuning uchun
-- faqat MANAGER/ADMIN da qoladi.
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'SELLER'), id
FROM permissions WHERE code IN ('TRADE_INS_VIEW', 'TRADE_INS_CREATE')
ON CONFLICT DO NOTHING;
