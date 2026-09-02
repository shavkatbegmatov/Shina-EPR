-- Onlayn to'lov vaqt chizig'i: provayder tranzaksiyasi qachon yaratilgani va
-- bekor qilingani (sabab bilan).
--
-- Payme protokoli takroriy chaqiruvlarda BIR XIL create_time/perform_time/cancel_time
-- qaytarishni talab qiladi; ilgari faqat paid_at saqlanardi — CheckTransaction
-- cancel_time=0 va reason=null deb yolg'on gapirar, takroriy PerformTransaction esa
-- paid_at ni ustidan yozardi.
ALTER TABLE shop_orders
    ADD COLUMN IF NOT EXISTS payment_created_at   TIMESTAMP,
    ADD COLUMN IF NOT EXISTS payment_cancelled_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS payment_cancel_reason INTEGER;
