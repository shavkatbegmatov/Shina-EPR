-- Arizachiga qaror haqida Telegram orqali xabar berish.
--
-- Muammo: Telegram botlari foydalanuvchiga BIRINCHI bo'lib yozolmaydi —
-- avval foydalanuvchining o'zi botga /start bosishi shart. Ariza formasida
-- esa faqat ism va telefon bor, ular bilan Telegramga yozib bo'lmaydi
-- (@username ham yetarli emas: Bot API chat_id talab qiladi).
--
-- Yechim: arizaga bir martalik token beriladi va arizachiga
-- `t.me/<bot>?start=staff_<token>` havolasi ko'rsatiladi. U havolani ochib
-- START bosganda bot tokenni tanib, o'sha chatni arizaga bog'laydi.
-- Shundan keyin tasdiqlash/rad etish haqidagi xabar o'sha chatga boradi.

ALTER TABLE staff_registration_requests
    ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;
ALTER TABLE staff_registration_requests
    ADD COLUMN IF NOT EXISTS telegram_link_token VARCHAR(40);

-- Token bo'yicha qidiruv har bir /start da bo'ladi va u YAGONA bo'lishi
-- shart: takrorlansa, bot arizani chalkashtirib, qaror haqidagi xabarni
-- boshqa odamga yuborib qo'yardi.
CREATE UNIQUE INDEX IF NOT EXISTS ux_staff_reg_link_token
    ON staff_registration_requests (telegram_link_token)
    WHERE telegram_link_token IS NOT NULL;
