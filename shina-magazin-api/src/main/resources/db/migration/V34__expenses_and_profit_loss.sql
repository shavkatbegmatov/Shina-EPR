-- Xarajatlar va sof foyda (P&L).
--
-- Ilgari tizim faqat YALPI marjani bilardi (sotuv − tannarx). Ijara, maosh,
-- kommunal, transport hech qayerda qayd etilmasdi, ya'ni do'kon egasi
-- "shu oy foyda qildimmi?" degan savolga javob ololmasdi: yalpi marja katta
-- ko'rinib, sof natija manfiy bo'lishi mumkin edi.

CREATE TABLE expenses (
    id              BIGSERIAL PRIMARY KEY,

    expense_date    DATE         NOT NULL,
    category        VARCHAR(30)  NOT NULL,
    amount          DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    description     VARCHAR(500),

    payment_method  VARCHAR(20)  NOT NULL DEFAULT 'CASH',
    -- Naqd xarajat kassadan chiqadi — Z-hisobotda hisobga olinishi uchun
    shift_id        BIGINT       REFERENCES cash_shifts(id),

    created_by      BIGINT       NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP,
    version         BIGINT       DEFAULT 0
);

CREATE INDEX idx_expenses_date ON expenses (expense_date DESC);
CREATE INDEX idx_expenses_category ON expenses (category);
CREATE INDEX idx_expenses_shift ON expenses (shift_id);

COMMENT ON TABLE expenses IS 'Do''kon xarajatlari — sof foyda hisobi uchun';
COMMENT ON COLUMN expenses.shift_id IS
    'Naqd xarajat qaysi smenada qilingan (kassadan chiqqan pul). NULL = kassadan tashqari.';

-- ─── Ruxsatlar ───
INSERT INTO permissions (code, module, action, description) VALUES
    ('EXPENSES_VIEW',   'EXPENSES', 'VIEW',   'Xarajatlarni ko''rish'),
    ('EXPENSES_CREATE', 'EXPENSES', 'CREATE', 'Xarajat qo''shish'),
    ('EXPENSES_UPDATE', 'EXPENSES', 'UPDATE', 'Xarajatni tahrirlash'),
    ('EXPENSES_DELETE', 'EXPENSES', 'DELETE', 'Xarajatni o''chirish')
ON CONFLICT (code) DO NOTHING;

-- ADMIN — hammasi
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'ADMIN'), id
FROM permissions WHERE module = 'EXPENSES'
ON CONFLICT DO NOTHING;

-- MANAGER — hammasi (xarajatlar boshqaruv mas'uliyati)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MANAGER'), id
FROM permissions WHERE module = 'EXPENSES'
ON CONFLICT DO NOTHING;

-- SELLER (kassir) — xarajat kirita oladi, lekin tahrirlay/o'chira olmaydi.
-- Kassadan chiqqan mayda xarajatni (masalan suv, kanselyariya) kassir yozadi,
-- lekin keyin uni o'zgartirib kamomadni yashira olmasligi kerak.
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'SELLER'), id
FROM permissions WHERE code IN ('EXPENSES_VIEW', 'EXPENSES_CREATE')
ON CONFLICT DO NOTHING;


-- ─── Sotuv paytidagi tannarx (COGS) ───
--
-- Ilgari foyda mahsulotning JORIY xarid narxidan hisoblanardi. Ya'ni bugun
-- ta'minotchi narxni ko'tarsa, o'tgan oyning foydasi ham o'zgarib ketardi —
-- P&L shunga tayanadigan bo'lsa, hisobot har kuni boshqacha chiqardi.
--
-- Endi tannarx savdo paytida qatorga MUHRLANADI.
ALTER TABLE sale_items ADD COLUMN cost_price DECIMAL(15, 2);

COMMENT ON COLUMN sale_items.cost_price IS
    'Sotuv paytidagi tannarx. Eski qatorlarda NULL — ular uchun mahsulotning joriy xarid narxi ishlatiladi.';

-- Eski savdolarga mavjud xarid narxini yozamiz: taxminiy, lekin NULL'dan
-- yaxshiroq — hech bo'lmasa bundan keyin o'zgarmay qoladi.
UPDATE sale_items si
SET cost_price = p.purchase_price
FROM products p
WHERE p.id = si.product_id
  AND si.cost_price IS NULL
  AND p.purchase_price IS NOT NULL;
