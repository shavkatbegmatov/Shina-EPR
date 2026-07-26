-- Savdo qaytarish (refund).
--
-- `SALES_REFUND` ruxsati va `REFUNDED` savdo statusi V1/V11 dan beri mavjud
-- edi, lekin ularni ishlatadigan METOD yo'q edi — yarim qurilgan funksiya.
-- Mijoz shinani qaytarsa, uni tizimda rasmiylashtirib bo'lmasdi: zaxira
-- tiklanmasdi, pul qaytgani qayd etilmasdi.
--
-- `cancelSale` dan farqi: u butun savdoni xato deb bekor qiladi. Qaytarish
-- esa QISMAN bo'lishi mumkin, keyinroq sodir bo'ladi va kassadan haqiqiy pul
-- chiqadi — shuning uchun alohida hujjat va Z-hisobotga ta'siri bor.

CREATE TABLE sale_returns (
    id              BIGSERIAL PRIMARY KEY,
    return_number   VARCHAR(30)  NOT NULL UNIQUE,
    sale_id         BIGINT       NOT NULL REFERENCES sales(id),
    return_date     TIMESTAMP    NOT NULL,
    reason          VARCHAR(500),

    -- Qaytarilgan tovarlarning umumiy qiymati
    refund_amount   DECIMAL(15, 2) NOT NULL,
    -- Shundan qarzni kamaytirishga ketgan qism (pul chiqmagan)
    debt_reduced    DECIMAL(15, 2) NOT NULL DEFAULT 0,
    -- Shundan mijozga haqiqatan qaytarilgan pul (kassadan chiqqan)
    cash_refunded   DECIMAL(15, 2) NOT NULL DEFAULT 0,

    -- Qaysi smenada qaytarilgan — Z-hisobotda naqd chiqimi hisobga olinishi uchun
    shift_id        BIGINT       REFERENCES cash_shifts(id),
    created_by      BIGINT       NOT NULL REFERENCES users(id),

    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP,
    version         BIGINT       DEFAULT 0
);

CREATE TABLE sale_return_items (
    id              BIGSERIAL PRIMARY KEY,
    sale_return_id  BIGINT       NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE,
    -- Aynan qaysi savdo qatori qaytarilyapti: bir mahsulot bitta savdoda
    -- turli narxda ikki marta bo'lishi mumkin.
    sale_item_id    BIGINT       NOT NULL REFERENCES sale_items(id),
    product_id      BIGINT       NOT NULL REFERENCES products(id),
    quantity        INTEGER      NOT NULL CHECK (quantity > 0),
    unit_price      DECIMAL(15, 2) NOT NULL,
    total_price     DECIMAL(15, 2) NOT NULL
);

CREATE INDEX idx_sale_returns_sale ON sale_returns (sale_id);
CREATE INDEX idx_sale_returns_shift ON sale_returns (shift_id);
CREATE INDEX idx_sale_return_items_return ON sale_return_items (sale_return_id);
-- Qatordan qancha qaytarilganini tez hisoblash uchun (ortiqcha qaytarishni to'sish)
CREATE INDEX idx_sale_return_items_sale_item ON sale_return_items (sale_item_id);

COMMENT ON TABLE sale_returns IS 'Savdo qaytarish — qisman yoki to''liq';
COMMENT ON COLUMN sale_returns.debt_reduced IS 'Qarzni kamaytirishga ketgan qism (kassadan pul chiqmagan)';
COMMENT ON COLUMN sale_returns.cash_refunded IS 'Mijozga qaytarilgan pul — Z-hisobotda naqd chiqimi';
