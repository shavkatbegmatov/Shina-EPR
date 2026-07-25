-- Shina Magazin ERP — standart (public) kreditsiallarni zararsizlantirish
-- V29: V2/V3 (admin/admin123, seller/seller123) va V6 (test mijoz, PIN 1234)
--      seed'lari `db/migration` ichida bo'lgani uchun PRODUCTION bazasiga ham
--      tushgan (application.yml: flyway.locations = classpath:db/migration).
--      Parol hash'lari repoda ochiq turgani sababli bu akkauntlar ommaviy.
--
-- Bu migratsiya V2/V3/V6 fayllarini O'ZGARTIRMAYDI (Flyway checksum buzilmasin),
-- balki ulardan keyin ishlab, natijasini bekor qiladi. Yangi bazada ham
-- V2 → V3 → V6 → ... → V29 tartibida ishlaydi, ya'ni fresh o'rnatish ham himoyalanadi.
--
-- Parolni almashtirish SQL'da emas, `DefaultCredentialGuard` (Java) da bajariladi:
--   bcrypt hash generatsiyasi SQL'dan tashqarida bo'lishi kerak va egasi tizimdan
--   qulflanib qolmasligi uchun tiklash yo'li (ADMIN_INITIAL_PASSWORD yoki logga
--   bir marta yoziladigan tasodifiy parol) zarur.

-- ─── 1) Test mijoz portali (V6, PIN 1234) ───
-- Faqat PIN hali ham V6 dagi seed qiymati bo'lsa o'chiramiz. Agar mijoz PIN'ini
-- o'zgartirgan bo'lsa — bu endi haqiqiy mijoz, tegmaymiz.
UPDATE customers
SET portal_enabled = false,
    pin_hash = NULL,
    pin_set_at = NULL,
    pin_attempts = 0,
    pin_locked_until = NULL
WHERE phone = '+998901234567'
  AND pin_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGf6.NsqE7xqPnQMz5j4fMjpNQ7i';

-- ─── 2) Standart xodim akkauntlari (V2 → V3) ───
-- Hash hali ham seed qiymatida bo'lsa, parol hech qachon almashtirilmagan.
-- Bu yerda faqat bayroq qo'yamiz; haqiqiy rotatsiya DefaultCredentialGuard'da.
UPDATE users
SET must_change_password = true
WHERE username IN ('admin', 'seller')
  AND password IN (
    -- V2 (dastlabki seed)
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.rSKmBnYLvNKJbLK/Wa',
    '$2a$10$rDkPvvAFV8kqwvKJzwlHMOuHxfxXe7hZ/ZBUZfFMEfUYNVByWaJHi',
    -- V3 (qayta generatsiya qilingan, parol o'sha-o'sha)
    '$2a$10$h4XNLRahmAhbZNCzb732NeJ5x7CAdcQjVyQzh.fNAVhTnZtHHo62S',
    '$2a$10$3uG.0gYnRRucQteJq365LO8UpjZnOTenLWGH8H1gn6lTVxwqNUpre'
  );
