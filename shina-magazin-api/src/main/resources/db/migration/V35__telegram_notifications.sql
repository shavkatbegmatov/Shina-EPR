-- Telegram xabarnomalari.
--
-- Do'kon egasi tizimga kirmasdan turib muhim voqealardan xabardor bo'lishi
-- uchun: yangi onlayn buyurtma, kam zaxira, muddati o'tgan qarzlar.
--
-- Bot TOKENI bu yerda YO'Q va ataylab: u `TELEGRAM_BOT_TOKEN` muhit
-- o'zgaruvchisidan olinadi. Token — botning to'liq kaliti, `app_settings` esa
-- sozlamalar API'sida ko'rinadi va audit jurnaliga tushadi, ya'ni
-- SETTINGS_VIEW ruxsati bor har bir xodim uni ko'rib qolardi.

INSERT INTO app_settings (setting_key, setting_value, description, created_at)
VALUES
    ('TELEGRAM_ENABLED', 'false', 'Telegram xabarnomalari yoqilganmi', CURRENT_TIMESTAMP),
    ('TELEGRAM_CHAT_ID', '', 'Xabar yuboriladigan Telegram chat ID', CURRENT_TIMESTAMP),
    -- Sukut bo'yicha faqat HARAKAT TALAB QILADIGAN voqealar. To'lov qabul
    -- qilindi / yangi mijoz kabi turlar kun davomida ko'p bo'ladi va
    -- xabarnomalarni shovqinga aylantirardi — ular yoqilishi mumkin, lekin
    -- sukut emas.
    ('TELEGRAM_EVENTS', 'ORDER,WARNING', 'Telegramga uzatiladigan bildirishnoma turlari', CURRENT_TIMESTAMP)
ON CONFLICT (setting_key) DO NOTHING;
