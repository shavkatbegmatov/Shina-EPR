-- Rejalashtirilgan vazifalar uchun qulf jadvali.
--
-- Bir nechta instansiya (yoki qayta ishga tushish paytida bir vaqtda tirik ikki nusxa)
-- bir xil vazifani parallel bajarmasin. Qarz eslatmalari idempotent emas edi:
-- ikkinchi nusxa har bir eslatmani ikkilantirardi. Qarang: SchedulerLockService.
CREATE TABLE IF NOT EXISTS scheduler_locks (
    name         VARCHAR(100) PRIMARY KEY,
    locked_until TIMESTAMP    NOT NULL,
    locked_by    VARCHAR(100)
);
