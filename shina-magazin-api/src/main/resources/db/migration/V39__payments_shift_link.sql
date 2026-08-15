-- Qarz to'lovini QABUL QILGAN smenaga bog'lash.
--
-- Payment hech qanday smenaga bog'lanmasdi: kassaga naqd tushgan qarz
-- to'lovi Z-hisobotning expectedCash'ida ko'rinmas edi — kassir bu pulni
-- o'zlashtirsa hisobot buni aniqlay olmasdi. Sale/SaleReturn/Expense'dagi
-- kabi nullable shift bog'lanishi qo'shiladi; eski to'lovlar NULL qoladi
-- (qaysi smenada qabul qilingani noma'lum).

ALTER TABLE payments ADD COLUMN shift_id BIGINT REFERENCES cash_shifts(id);
CREATE INDEX idx_payments_shift_id ON payments(shift_id);
