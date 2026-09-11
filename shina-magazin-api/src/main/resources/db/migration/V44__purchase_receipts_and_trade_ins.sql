-- Kirim hujjati (ta'minotchi shabloni) va barter (eski shina evaziga yangi).
--
-- ─── Kirim hujjati ───
-- Ta'minotchi yuk xati (masalan "LARGO TYRES GROUP") tizimdagi xarid
-- formasiga sig'masdi: hujjat raqami (Kun ID), mashina raqami, yo'l haqi,
-- qator bo'yicha bonus ($ yoki %) va eng muhimi — narxlar DOLLARDA. Kassir
-- hammasini so'mga qo'lda aylantirib kiritardi, xato esa to'g'ridan-to'g'ri
-- tannarxga va ta'minotchi qarziga o'tardi. Endi hujjat o'z valyutasida
-- kiritiladi, kurs saqlanadi, so'mdagi summalar server hisoblaydi.
--
-- Pul ustunlari (total_amount, paid_amount, unit_price, total_price)
-- AVVALGIDEK so'mda qoladi — ta'minotchi balansi, to'lovlar, hisobotlar
-- bitta valyutada. Hujjat valyutasidagi qiymatlar faqat MA'LUMOT uchun
-- (foreign_*), ular hujjatni ta'minotchi bilan solishtirishga kerak.
--
-- Yo'l haqi (transport_cost) ta'minotchi qarziga KIRMAYDI: shablondagi
-- "To'lov summa" = "Jami summa" − "Bonus" (yo'l haqisiz). U tannarxga
-- (landed_unit_cost) miqdorga mutanosib taqsimlanadi — foyda hisobi
-- yetkazib berish xarajatini ham ko'rsin.
--
-- "TEKSHIRILDI" muhri: hujjat kiritilganda darhol omborga kirim qilinishi
-- shart emas — ORDERED holatida kutadi, mol kelib sanalgach `receive`
-- bilan qabul qilinadi (received_by/received_at). Kam kelgan mol
-- ordered_quantity vs received_quantity farqida ko'rinadi.
--
-- ─── Barter ───
-- Mijoz eski shinalarini olib keladi, yangisini oladi, FARQNI to'laydi.
-- Eski shinalar B/U mahsulot sifatida omborga kiradi (stock_movements
-- TRADE_IN), savdoning trade_in_amount qismi pul o'rniga hisoblanadi.
-- total_amount o'zgarmaydi (tovar to'liq narxda sotilgan — daromad shu),
-- kassaga esa faqat farq tushadi (paid_amount).

-- ─── purchase_orders ───
ALTER TABLE purchase_orders
    ADD COLUMN currency            VARCHAR(3)     NOT NULL DEFAULT 'UZS',
    ADD COLUMN exchange_rate       DECIMAL(15, 4) NOT NULL DEFAULT 1,
    ADD COLUMN supplier_doc_number VARCHAR(50),
    ADD COLUMN supplier_doc_date   DATE,
    ADD COLUMN vehicle_number      VARCHAR(50),
    ADD COLUMN transport_cost      DECIMAL(15, 2) NOT NULL DEFAULT 0,
    ADD COLUMN goods_amount        DECIMAL(15, 2) NOT NULL DEFAULT 0,
    ADD COLUMN bonus_amount        DECIMAL(15, 2) NOT NULL DEFAULT 0,
    ADD COLUMN foreign_total_amount DECIMAL(15, 2),
    ADD COLUMN received_by         BIGINT REFERENCES users(id),
    ADD COLUMN received_at         TIMESTAMP;

-- Eski hujjatlarda bonus yo'q: tovar summasi = jami summa.
UPDATE purchase_orders SET goods_amount = total_amount;

-- Allaqachon qabul qilingan xaridlarga "muhr" qo'yamiz — kim yaratgan
-- bo'lsa, o'sha qabul qilgan (ilgari yaratish = qabul qilish edi).
UPDATE purchase_orders
SET received_by = created_by,
    received_at = COALESCE(received_date::timestamp, created_at)
WHERE status IN ('RECEIVED', 'PARTIAL') AND received_at IS NULL;

CREATE INDEX idx_purchase_orders_supplier_doc ON purchase_orders(supplier_doc_number);

COMMENT ON COLUMN purchase_orders.currency IS 'Hujjat valyutasi (UZS/USD); pul ustunlari doim so''mda';
COMMENT ON COLUMN purchase_orders.exchange_rate IS '1 birlik hujjat valyutasi = N so''m (UZS uchun 1)';
COMMENT ON COLUMN purchase_orders.supplier_doc_number IS 'Ta''minotchi hujjat raqami (Kun ID)';
COMMENT ON COLUMN purchase_orders.vehicle_number IS 'Yuk mashina raqami / jo''natma';
COMMENT ON COLUMN purchase_orders.transport_cost IS 'Yo''l haqi (so''m) — tannarxga taqsimlanadi, ta''minotchi qarziga kirmaydi';
COMMENT ON COLUMN purchase_orders.goods_amount IS 'Tovar summasi bonusgacha (so''m)';
COMMENT ON COLUMN purchase_orders.bonus_amount IS 'Ta''minotchi bonusi (so''m); total_amount = goods_amount − bonus_amount';
COMMENT ON COLUMN purchase_orders.foreign_total_amount IS 'To''lov summasi hujjat valyutasida (UZS hujjatda NULL)';
COMMENT ON COLUMN purchase_orders.received_at IS '"TEKSHIRILDI" — mol sanab qabul qilingan vaqt';

-- ─── purchase_order_items ───
ALTER TABLE purchase_order_items
    ADD COLUMN foreign_unit_price DECIMAL(15, 4),
    ADD COLUMN bonus_per_unit     DECIMAL(15, 2) NOT NULL DEFAULT 0,
    ADD COLUMN bonus_percent      DECIMAL(5, 2)  NOT NULL DEFAULT 0,
    ADD COLUMN bonus_amount       DECIMAL(15, 2) NOT NULL DEFAULT 0,
    ADD COLUMN landed_unit_cost   DECIMAL(15, 2);

-- Eski qatorlarda yo'l haqi va bonus yo'q: tannarx = xarid narxi.
UPDATE purchase_order_items SET landed_unit_cost = unit_price WHERE landed_unit_cost IS NULL;

COMMENT ON COLUMN purchase_order_items.foreign_unit_price IS 'Narx hujjat valyutasida (UZS hujjatda NULL)';
COMMENT ON COLUMN purchase_order_items.bonus_per_unit IS 'Bir dona uchun bonus (so''m)';
COMMENT ON COLUMN purchase_order_items.bonus_percent IS 'Qator bonusi foizda (bonus_per_unit o''rniga)';
COMMENT ON COLUMN purchase_order_items.landed_unit_cost IS 'Tannarx: (jami − bonus + yo''l haqi ulushi) / miqdor';

-- ─── Barter ───
ALTER TABLE sales
    ADD COLUMN trade_in_amount DECIMAL(15, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN sales.trade_in_amount IS 'Barter: eski shinalar uchun berilgan kredit; to''lanadigan = total_amount − trade_in_amount';

CREATE TABLE sale_trade_in_items (
    id          BIGSERIAL PRIMARY KEY,
    sale_id     BIGINT         NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
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

CREATE INDEX idx_sale_trade_in_items_sale ON sale_trade_in_items(sale_id);
CREATE INDEX idx_sale_trade_in_items_product ON sale_trade_in_items(product_id);

COMMENT ON TABLE sale_trade_in_items IS 'Barter: savdoda qabul qilingan eski shinalar';

-- Barter savdosi qaytarilganda naqd faqat KASSAGA TUSHGAN qismgacha
-- qaytariladi; eski shinalar uchun berilgan kredit qismi mijoz balansiga
-- kredit sifatida yoziladi (do'kon eski shinalarni qaytarib bermaydi).
ALTER TABLE sale_returns
    ADD COLUMN credit_issued DECIMAL(15, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN sale_returns.credit_issued IS 'Mijoz balansiga yozilgan kredit (barter qismi) — kassadan pul chiqmagan';
