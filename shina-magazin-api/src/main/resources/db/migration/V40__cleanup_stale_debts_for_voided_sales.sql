-- Fantom qarzlarni tozalash.
--
-- Qaytarish/bekor qilish ilgari faqat sale.debt_amount va mijoz balansini
-- to'g'irlab, debts qatoriga tegmasdi (1fdaa48 da tuzatilgan). Shu tuzatishdan
-- OLDIN yaralgan yozuvlar bazada qoldi: qaytarilgan/bekor qilingan sotuvlarning
-- qarzi ACTIVE bo'lib, dashboard jami summani oshirib ko'rsatadi,
-- DebtReminderScheduler esa mijozni qaytarilgan tovar uchun ta'qib qiladi.
-- Yangi kod (DebtService.makePayment) ularni undirishdan himoya qiladi;
-- bu migratsiya ko'rinishni ham haqiqatga moslaydi.
--
-- Mijoz balansi BU YERDA o'zgartirilmaydi: eski oqim balansni to'g'ri
-- kreditlagan, faqat debts jadvali orqada qolgan edi.

-- 1) Bekor qilingan yoki to'liq qaytarilgan sotuvlarning ochiq qarzlari yopiladi
UPDATE debts
SET remaining_amount = 0,
    status = 'CANCELLED',
    notes = LEFT(COALESCE(notes || '; ', '')
                || 'V40 tozalash: sotuv qaytarilgan yoki bekor qilingan', 500),
    updated_at = CURRENT_TIMESTAMP
WHERE status IN ('ACTIVE', 'OVERDUE')
  AND remaining_amount > 0
  AND sale_id IN (SELECT id FROM sales WHERE status IN ('CANCELLED', 'REFUNDED'));

-- 2) Qisman qaytarilgan (hali COMPLETED) sotuvlar: qarz qoldig'i sotuvdagi
--    haqiqiy qarzdan katta bo'lib qolgan — sotuv bilan tenglashtiriladi.
--    GREATEST(..., 0): tarixiy fantom to'lovlar sale.debt_amount ni manfiyga
--    tushirgan bo'lishi mumkin.
UPDATE debts
SET status = CASE
        WHEN (SELECT GREATEST(s.debt_amount, 0) FROM sales s WHERE s.id = debts.sale_id) = 0
        THEN 'CANCELLED' ELSE status END,
    notes = LEFT(COALESCE(notes || '; ', '')
                || 'V40 tozalash: qaytarishlar bilan sinxronlandi', 500),
    updated_at = CURRENT_TIMESTAMP,
    remaining_amount = (SELECT GREATEST(s.debt_amount, 0) FROM sales s WHERE s.id = debts.sale_id)
WHERE status IN ('ACTIVE', 'OVERDUE')
  AND sale_id IN (SELECT id FROM sales WHERE status = 'COMPLETED')
  AND remaining_amount > (SELECT GREATEST(s.debt_amount, 0) FROM sales s WHERE s.id = debts.sale_id);
