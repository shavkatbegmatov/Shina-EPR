-- Kassa smenasi va Z-hisobot.
--
-- Muammo: kassir kun oxirida qancha pul topshirishi kerakligini tizim
-- BILMASDI. Savdolar bor, lekin "smena" tushunchasi yo'q edi: boshlang'ich
-- kassa qoldig'i, smena davomidagi naqd tushum va sanab topshirilgan pul
-- hech qayerda solishtirilmasdi. Kamomad yoki ortiqcha pul sezilmay qolardi.

CREATE TABLE cash_shifts (
    id              BIGSERIAL PRIMARY KEY,

    opened_by       BIGINT      NOT NULL REFERENCES users(id),
    opened_at       TIMESTAMP   NOT NULL,
    -- Smena boshida kassadagi mayda pul (qaytim uchun)
    opening_float   DECIMAL(15, 2) NOT NULL DEFAULT 0,

    closed_by       BIGINT      REFERENCES users(id),
    closed_at       TIMESTAMP,
    -- Kassir qo'lda sanagan naqd pul
    counted_cash    DECIMAL(15, 2),
    -- Yopish paytida hisoblangan kutilgan naqd (opening_float + naqd tushum).
    -- Ataylab saqlanadi: keyinchalik savdo bekor qilinsa ham hisobot
    -- o'sha paytdagi haqiqatni ko'rsatishi kerak.
    expected_cash   DECIMAL(15, 2),
    -- counted_cash - expected_cash (musbat = ortiqcha, manfiy = kamomad)
    difference      DECIMAL(15, 2),

    status          VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    notes           VARCHAR(500),

    created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP,
    version         BIGINT      DEFAULT 0,

    CONSTRAINT chk_cash_shift_status CHECK (status IN ('OPEN', 'CLOSED'))
);

COMMENT ON TABLE cash_shifts IS 'Kassa smenasi — ochilish/yopilish va naqd pul solishtiruvi';
COMMENT ON COLUMN cash_shifts.expected_cash IS 'Yopish paytida hisoblangan kutilgan naqd (tarixiy qiymat)';
COMMENT ON COLUMN cash_shifts.difference IS 'counted_cash - expected_cash; manfiy = kamomad';

-- Bitta kassirda bir vaqtda faqat BITTA ochiq smena bo'lishi mumkin.
-- Qisman unikal indeks: yopilgan smenalar cheklovga tushmaydi.
CREATE UNIQUE INDEX uq_cash_shift_open_per_user
    ON cash_shifts (opened_by) WHERE status = 'OPEN';

CREATE INDEX idx_cash_shifts_opened_at ON cash_shifts (opened_at DESC);

-- ─── Savdoni smenaga bog'lash ───
-- Vaqt oralig'i bo'yicha hisoblash o'rniga aniq FK: soat siljishi yoki
-- smenalar ustma-ust tushishi hisobotni buzmasin.
ALTER TABLE sales ADD COLUMN shift_id BIGINT REFERENCES cash_shifts(id);
CREATE INDEX idx_sales_shift ON sales (shift_id);

COMMENT ON COLUMN sales.shift_id IS
    'Savdo qaysi smenada qilingan. NULL = ochiq smena bo''lmagan paytda sotilgan.';

-- ─── Ruxsatlar ───
INSERT INTO permissions (code, module, action, description) VALUES
    ('SHIFTS_VIEW',  'SHIFTS', 'VIEW',  'Smenalar va Z-hisobotni ko''rish'),
    ('SHIFTS_MANAGE','SHIFTS', 'MANAGE','Smena ochish va yopish')
ON CONFLICT (code) DO NOTHING;

-- ADMIN barcha ruxsatlarni oladi (V11 dagi qoida yangi kalitlarga tarqalmaydi,
-- shuning uchun bu yerda aniq beriladi)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'ADMIN'), id
FROM permissions WHERE module = 'SHIFTS'
ON CONFLICT DO NOTHING;

-- MANAGER: ko'rish + boshqarish
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MANAGER'), id
FROM permissions WHERE module = 'SHIFTS'
ON CONFLICT DO NOTHING;

-- SELLER (kassir): o'z smenasini ochadi va yopadi
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'SELLER'), id
FROM permissions WHERE module = 'SHIFTS'
ON CONFLICT DO NOTHING;
