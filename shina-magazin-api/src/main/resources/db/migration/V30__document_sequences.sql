-- Hujjat raqamlari uchun atomik hisoblagich.
--
-- Muammo: invoice_number / order_number / return_number "MAX(...) + 1" bilan
-- generatsiya qilinardi:
--     Integer max = repo.findMaxInvoiceNumber(prefix);
--     int next = (max != null ? max : 0) + 1;
-- READ COMMITTED (Postgres default) ostida ikki kassir bir vaqtda savdo qilsa
-- ikkalasi ham bir xil MAX o'qib, bir xil raqam yasaydi. Ustunlar UNIQUE
-- (V1: sales.invoice_number, purchase_orders.order_number), shuning uchun
-- yutqazgan tranzaksiya DataIntegrityViolationException oladi va SAVDO YO'QOLADI.
--
-- Yechim: har bir raqam turi uchun bitta qator va atomik INSERT ... ON CONFLICT
-- DO UPDATE ... RETURNING. Qator darajasidagi qulf raqamlarni ketma-ketlashtiradi.
--
-- Nima uchun Postgres SEQUENCE emas: hisob-faktura raqami har kuni noldan
-- boshlanadi (INV20260726 + 0001), ya'ni kalit sanaga bog'liq va sequence'lar
-- soni cheksiz o'sib ketardi. Bitta jadval + dinamik kalit ancha sodda.

CREATE TABLE document_sequences (
    seq_key    VARCHAR(50) PRIMARY KEY,
    next_value BIGINT      NOT NULL,
    updated_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE document_sequences IS 'Hujjat raqamlari uchun atomik hisoblagich (INV/PO-/RT-)';
COMMENT ON COLUMN document_sequences.seq_key IS 'Raqam prefiksi: INV<yyyyMMdd>, PO-, RT-';
COMMENT ON COLUMN document_sequences.next_value IS 'Oxirgi berilgan qiymat';

-- ─── Mavjud ma'lumotdan seed ───
-- Hisoblagichni nolda qoldirsak yangi raqamlar mavjudlari bilan to'qnashardi.
-- Har bir prefiks uchun eng katta ishlatilgan qiymatni yozamiz.
-- Faqat kutilgan formatdagi raqamlar hisobga olinadi (regex bilan) — bo'lmasa
-- CAST xato beradi.

-- Hisob-fakturalar: INV + yyyyMMdd (11 belgi) + 4 xonali hisoblagich
INSERT INTO document_sequences (seq_key, next_value)
SELECT substring(invoice_number FROM 1 FOR 11),
       MAX(CAST(substring(invoice_number FROM 12) AS INTEGER))
FROM sales
WHERE invoice_number ~ '^INV[0-9]{8}[0-9]+$'
GROUP BY substring(invoice_number FROM 1 FOR 11);

-- Xarid buyurtmalari: PO- + 6 xonali hisoblagich
INSERT INTO document_sequences (seq_key, next_value)
SELECT 'PO-', MAX(CAST(substring(order_number FROM 4) AS INTEGER))
FROM purchase_orders
WHERE order_number ~ '^PO-[0-9]+$'
HAVING MAX(CAST(substring(order_number FROM 4) AS INTEGER)) IS NOT NULL;

-- Qaytarishlar: RT- + 6 xonali hisoblagich
INSERT INTO document_sequences (seq_key, next_value)
SELECT 'RT-', MAX(CAST(substring(return_number FROM 4) AS INTEGER))
FROM purchase_returns
WHERE return_number ~ '^RT-[0-9]+$'
HAVING MAX(CAST(substring(return_number FROM 4) AS INTEGER)) IS NOT NULL;
