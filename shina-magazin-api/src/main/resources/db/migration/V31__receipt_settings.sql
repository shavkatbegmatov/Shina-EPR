-- Chek (kassa qog'ozi) sarlavhasi uchun do'kon ma'lumotlari.
--
-- Ilgari do'kon nomi hech qayerda saqlanmasdi — u faqat storefront footer'ida
-- qattiq yozilgan edi ("Protektor"). Chek uchun bu yaramaydi: mijozga
-- beriladigan qog'ozda do'kon nomi, telefoni va manzili bo'lishi kerak, va
-- ular kodda emas, sozlamalarda turishi kerak.
--
-- app_settings — key-value jadval (V15), shuning uchun sxema o'zgarmaydi:
-- faqat yangi kalitlar seed qilinadi. Qiymatlar bo'sh bo'lsa chekda tegishli
-- qator umuman chiqmaydi, ya'ni to'ldirilmagan sozlama chekni buzmaydi.

INSERT INTO app_settings (setting_key, setting_value, description)
VALUES
    ('RECEIPT_SHOP_NAME',    'Protektor', 'Chek sarlavhasidagi do''kon nomi'),
    ('RECEIPT_SHOP_PHONE',   '',          'Chekdagi telefon raqam'),
    ('RECEIPT_SHOP_ADDRESS', '',          'Chekdagi manzil'),
    ('RECEIPT_FOOTER',       'Xaridingiz uchun rahmat!', 'Chek oxiridagi matn')
ON CONFLICT (setting_key) DO NOTHING;
