-- Telegram orqali mijozning O'ZI ro'yxatdan o'tishi.
--
-- Nega BOT (kontakt ulashish), Telegram Login Widget EMAS:
-- Login Widget faqat Telegram ID va ismni qaytaradi — TELEFON RAQAMNI
-- BERMAYDI. Bu tizimda esa mijoz aynan telefon raqami bilan aniqlanadi
-- (`customers.phone` NOT NULL UNIQUE, portal login = telefon + PIN, savdo va
-- qarzlar shu raqamga bog'lanadi), ya'ni raqamsiz mijoz yozuvi umuman
-- yaratilmaydi. Botdagi "kontaktni ulashish" tugmasi bosilganda esa raqamni
-- Telegramning O'ZI yuboradi — ya'ni SMS kodisiz ham TASDIQLANGAN raqam
-- olamiz. Bu muhim, chunki SMS provayderi hali ulanmagan (LogSmsSender —
-- stub, faqat logga yozadi).

ALTER TABLE customers ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(64);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS telegram_linked_at TIMESTAMP;

-- Bitta Telegram akkaunti = bitta mijoz. Aks holda bir odam turli raqamlar
-- bilan qayta-qayta ro'yxatdan o'tib, mijozlar bazasini to'ldirib yuborardi.
--
-- PARTIAL index: mijozlarning KO'PCHILIGIDA bu ustun NULL bo'ladi (xodim
-- qo'lda kiritgan mijozlar). Postgres'da NULL'lar unique tekshiruvida bir-biriga
-- teng emas, shuning uchun oddiy UNIQUE ham to'g'ri ishlardi — partial variant
-- indeksni shunchaki kichik saqlaydi va niyatni ochiq ko'rsatadi.
CREATE UNIQUE INDEX IF NOT EXISTS ux_customers_telegram_chat_id
    ON customers (telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;

-- Ro'yxatdan o'tish ATAYLAB sukut bo'yicha O'CHIQ.
--
-- Yoqilishi bilan bot ochiq eshikka aylanadi: Telegramdagi istalgan odam
-- do'konning mijozlar bazasiga yozuv qo'sha oladi. Do'kon buni bilib turib
-- yoqishi kerak, deploy paytida sezdirmay yoqilib qolmasin.
INSERT INTO app_settings (setting_key, setting_value, description, created_at)
VALUES
    ('TELEGRAM_REGISTRATION_ENABLED', 'false',
     'Mijozlar Telegram bot orqali o''zi ro''yxatdan o''ta oladimi', CURRENT_TIMESTAMP),
    -- Bot username (@'siz). Storefront'dagi "Telegram orqali ro'yxatdan o'tish"
    -- tugmasi shundan t.me havolasini yasaydi. Token'dan farqli o'laroq bu
    -- MAXFIY EMAS — bot nomini baribir har bir foydalanuvchi ko'radi.
    ('TELEGRAM_BOT_USERNAME', '',
     'Bot username (@ belgisisiz) — t.me havolasi uchun', CURRENT_TIMESTAMP)
ON CONFLICT (setting_key) DO NOTHING;
