-- Test mijoz uchun portal kirishini yoqish
-- PIN kod: 1234
-- BCrypt hash: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGf6.NsqE7xqPnQMz5j4fMjpNQ7i

-- Agar mijoz mavjud bo'lmasa, test mijoz yaratamiz
INSERT INTO customers (full_name, phone, customer_type, balance, active, portal_enabled, pin_hash, pin_set_at, pin_attempts, preferred_language, created_at)
SELECT 'Test Mijoz', '+998901234567', 'INDIVIDUAL', 0, true, true,
       '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGf6.NsqE7xqPnQMz5j4fMjpNQ7i',
       CURRENT_TIMESTAMP, 0, 'uz', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE phone = '+998901234567');

-- Agar mavjud bo'lsa, portal kirishini yoqamiz
UPDATE customers
SET portal_enabled = true,
    pin_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGf6.NsqE7xqPnQMz5j4fMjpNQ7i',
    pin_set_at = CURRENT_TIMESTAMP,
    pin_attempts = 0,
    preferred_language = COALESCE(preferred_language, 'uz')
WHERE phone = '+998901234567';

-- Izoh:
-- Test mijoz ma'lumotlari:
-- Telefon: +998901234567
-- PIN kod: 1234
