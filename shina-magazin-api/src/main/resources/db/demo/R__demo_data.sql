-- =====================================================================
-- R__demo_data.sql — Protektor demo/namuna ma'lumotlari (DEV-ONLY)
-- =====================================================================
-- Bu REPEATABLE Flyway migratsiyasi FAQAT `dev` profilida ishlaydi:
-- `application-dev.yml` da `spring.flyway.locations` ga `classpath:db/demo`
-- qo'shilgan. Prod (Dockerfile -Dspring.profiles.active=prod) bu papkani
-- YUKLAMAYDI — demo ma'lumot hech qachon productionga tushmaydi.
--
-- IDEMPOTENT:
--   • Ma'lumotnoma (brand/kategoriya/mahsulot/mijoz/taʼminotchi/xodim/user)
--     — INSERT ... WHERE NOT EXISTS (qo'shimcha, o'chirmaydi).
--   • Tranzaksiya (sotuv/xarid/qarz/to'lov/ombor harakati/onlayn buyurtma/
--     bildirishnoma) — demo-teg bo'yicha DELETE + CURRENT_DATE ga nisbatan
--     qayta generatsiya. Shu sabab dashboard grafiklari HAR DOIM "bugungi"
--     ko'rinadi. Yangi sanalar uchun qayta ishga tushiring (seed-demo.ps1).
--
-- Demo teglar: sales.invoice_number 'DS-%', purchase_orders 'DPO-%',
--   purchase_returns 'DRET-%', shop_orders 'DWEB-%',
--   stock_movements.reference_type 'DEMO_SEED', payments/debts.notes '[demo]'.
-- =====================================================================

-- ═══════════════ 1-QISM: MA'LUMOTNOMA (idempotent) ═══════════════

-- ─── Yangi brendlar ───
INSERT INTO brands (name, country, active) SELECT 'Kumho', 'Janubiy Koreya', true WHERE NOT EXISTS (SELECT 1 FROM brands WHERE name='Kumho');
INSERT INTO brands (name, country, active) SELECT 'Sailun', 'Xitoy', true WHERE NOT EXISTS (SELECT 1 FROM brands WHERE name='Sailun');
INSERT INTO brands (name, country, active) SELECT 'Triangle', 'Xitoy', true WHERE NOT EXISTS (SELECT 1 FROM brands WHERE name='Triangle');

-- ─── Yangi kategoriyalar ───
INSERT INTO categories (name, description, active) SELECT 'Sport / UHP shinalari', 'Yuqori unumdorlikli sport shinalari (UHP)', true WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name='Sport / UHP shinalari');
INSERT INTO categories (name, description, active) SELECT 'Elektromobil (EV) shinalari', 'Elektromobillar uchun maxsus shinalar', true WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name='Elektromobil (EV) shinalari');

-- ─── Mavjud mahsulotlarga rasm ───
UPDATE products SET image_url='/products/MCH-205-55-R16-S.svg' WHERE sku='MCH-205-55-R16-S';
UPDATE products SET image_url='/products/BRD-225-45-R17-W.svg' WHERE sku='BRD-225-45-R17-W';
UPDATE products SET image_url='/products/CNT-195-65-R15-A.svg' WHERE sku='CNT-195-65-R15-A';
UPDATE products SET image_url='/products/GDY-235-60-R18-S.svg' WHERE sku='GDY-235-60-R18-S';
UPDATE products SET image_url='/products/PIR-255-50-R19-S.svg' WHERE sku='PIR-255-50-R19-S';
UPDATE products SET image_url='/products/HNK-185-60-R14-S.svg' WHERE sku='HNK-185-60-R14-S';
UPDATE products SET image_url='/products/YKH-215-55-R17-W.svg' WHERE sku='YKH-215-55-R17-W';
UPDATE products SET image_url='/products/DLP-205-60-R16-A.svg' WHERE sku='DLP-205-60-R16-A';
UPDATE products SET image_url='/products/NKN-225-50-R17-W.svg' WHERE sku='NKN-225-50-R17-W';
UPDATE products SET image_url='/products/TYO-265-70-R17-S.svg' WHERE sku='TYO-265-70-R17-S';

-- ─── Yangi mahsulotlar ───
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'MCH-ENS-1856515', 'Michelin Energy Saver+ 185/65 R15', (SELECT id FROM brands WHERE name='Michelin'), (SELECT id FROM categories WHERE name='Yengil avtomobil shinalari'), 185, 65, 15, '88', 'H', 'SUMMER', 520000, 760000, 34, 8, 'Past yumalash qarshiligi — yoqilgʻini 0.2 l/100km gacha tejaydi.', '/products/MCH-ENS-1856515.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='MCH-ENS-1856515');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'BRD-TUR-2055516', 'Bridgestone Turanza T005 205/55 R16', (SELECT id FROM brands WHERE name='Bridgestone'), (SELECT id FROM categories WHERE name='Yengil avtomobil shinalari'), 205, 55, 16, '91', 'V', 'SUMMER', 780000, 1090000, 22, 6, 'Komfort va past shovqin, ho''l yo''lda kuchli ushlash — nano-pro texnologiyasi.', '/products/BRD-TUR-2055516.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='BRD-TUR-2055516');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'CNT-PC6-2255017', 'Continental PremiumContact 6 225/50 R17', (SELECT id FROM brands WHERE name='Continental'), (SELECT id FROM categories WHERE name='Yengil avtomobil shinalari'), 225, 50, 17, '98', 'Y', 'SUMMER', 990000, 1380000, 16, 5, 'Sport va komfort muvozanati — aniq rul javobi.', '/products/CNT-PC6-2255017.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='CNT-PC6-2255017');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'GDY-EFG-1956015', 'Goodyear EfficientGrip Performance 195/60 R15', (SELECT id FROM brands WHERE name='Goodyear'), (SELECT id FROM categories WHERE name='Yengil avtomobil shinalari'), 195, 60, 15, '88', 'H', 'SUMMER', 560000, 820000, 28, 8, 'Uzoq xizmat muddati va past yoqilgʻi sarfi.', '/products/GDY-EFG-1956015.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='GDY-EFG-1956015');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'HNK-VP3-2155516', 'Hankook Ventus Prime3 215/55 R16', (SELECT id FROM brands WHERE name='Hankook'), (SELECT id FROM categories WHERE name='Yengil avtomobil shinalari'), 215, 55, 16, '93', 'V', 'SUMMER', 690000, 970000, 19, 6, 'Ho''l yo''lda ishonchli tormoz, past shovqin — kundalik uchun optimal.', '/products/HNK-VP3-2155516.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='HNK-VP3-2155516');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'KMH-ES31-1956515', 'Kumho Ecowing ES31 195/65 R15', (SELECT id FROM brands WHERE name='Kumho'), (SELECT id FROM categories WHERE name='Yengil avtomobil shinalari'), 195, 65, 15, '91', 'H', 'SUMMER', 380000, 560000, 40, 10, 'Byudjet segmenti — hamyonbop va tejamkor.', '/products/KMH-ES31-1956515.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='KMH-ES31-1956515');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'YKH-BEGT-2056016', 'Yokohama BluEarth-GT 205/60 R16', (SELECT id FROM brands WHERE name='Yokohama'), (SELECT id FROM categories WHERE name='Yengil avtomobil shinalari'), 205, 60, 16, '96', 'H', 'ALL_SEASON', 720000, 1020000, 14, 5, 'Hamma mavsum — quruq, ho''l va yengil qorda barqaror.', '/products/YKH-BEGT-2056016.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='YKH-BEGT-2056016');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'NKN-ND8-2055516', 'Nokian Nordman 8 205/55 R16', (SELECT id FROM brands WHERE name='Nokian'), (SELECT id FROM categories WHERE name='Yengil avtomobil shinalari'), 205, 55, 16, '94', 'T', 'WINTER', 640000, 930000, 4, 6, 'Shipli qishki shina — muzli yoʻlda maksimal ishonch.', '/products/NKN-ND8-2055516.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='NKN-ND8-2055516');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'TYO-CAS2-2156016', 'Toyo Celsius AS2 215/60 R16', (SELECT id FROM brands WHERE name='Toyo'), (SELECT id FROM categories WHERE name='Yengil avtomobil shinalari'), 215, 60, 16, '99', 'V', 'ALL_SEASON', 760000, 1080000, 13, 5, '3PMSF sertifikati — haqiqiy hamma mavsum.', '/products/TYO-CAS2-2156016.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='TYO-CAS2-2156016');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'SLN-AZE-2055516', 'Sailun Atrezzo Elite 205/55 R16', (SELECT id FROM brands WHERE name='Sailun'), (SELECT id FROM categories WHERE name='Yengil avtomobil shinalari'), 205, 55, 16, '91', 'V', 'SUMMER', 300000, 470000, 46, 12, 'Eng hamyonbop yechim — shahar yurishi uchun yetarli.', '/products/SLN-AZE-2055516.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='SLN-AZE-2055516');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'MCH-LTC-2356018', 'Michelin Latitude Cross 235/60 R18', (SELECT id FROM brands WHERE name='Michelin'), (SELECT id FROM categories WHERE name='SUV va Crossover shinalari'), 235, 60, 18, '107', 'V', 'ALL_SEASON', 1350000, 1850000, 8, 4, 'SUV uchun hamma mavsum — yengil ofrodga chidamli.', '/products/MCH-LTC-2356018.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='MCH-LTC-2356018');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'BRD-DHP-2355519', 'Bridgestone Dueler H/P Sport 235/55 R19', (SELECT id FROM brands WHERE name='Bridgestone'), (SELECT id FROM categories WHERE name='SUV va Crossover shinalari'), 235, 55, 19, '105', 'W', 'SUMMER', 1480000, 2050000, 0, 3, 'Sport SUV uchun yuqori tezlik va aniq boshqaruv.', '/products/BRD-DHP-2355519.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='BRD-DHP-2355519');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'CNT-CLX2-2457016', 'Continental CrossContact LX2 245/70 R16', (SELECT id FROM brands WHERE name='Continental'), (SELECT id FROM categories WHERE name='SUV va Crossover shinalari'), 245, 70, 16, '111', 'T', 'ALL_SEASON', 1200000, 1680000, 12, 5, 'Uzoq safar SUV shinasi — bardoshli va tinch.', '/products/CNT-CLX2-2457016.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='CNT-CLX2-2457016');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'PIR-SCW-2555518', 'Pirelli Scorpion Winter 255/55 R18', (SELECT id FROM brands WHERE name='Pirelli'), (SELECT id FROM categories WHERE name='SUV va Crossover shinalari'), 255, 55, 18, '109', 'V', 'WINTER', 1620000, 2240000, 3, 5, 'Premium SUV qishki shinasi — qor va muzda ishonch.', '/products/PIR-SCW-2555518.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='PIR-SCW-2555518');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'NKN-OAT-2656517', 'Nokian Outpost AT 265/65 R17', (SELECT id FROM brands WHERE name='Nokian'), (SELECT id FROM categories WHERE name='SUV va Crossover shinalari'), 265, 65, 17, '112', 'T', 'ALL_SEASON', 1250000, 1720000, 10, 4, 'All-terrain — tosh va loyga bardoshli protektor.', '/products/NKN-OAT-2656517.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='NKN-OAT-2656517');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'TYO-PST-2855020', 'Toyo Proxes S/T III 285/50 R20', (SELECT id FROM brands WHERE name='Toyo'), (SELECT id FROM categories WHERE name='SUV va Crossover shinalari'), 285, 50, 20, '116', 'V', 'SUMMER', 1780000, 2450000, 2, 4, 'Yirik SUV uchun agressiv sport shinasi.', '/products/TYO-PST-2855020.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='TYO-PST-2855020');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'CNT-VAN2-1957015', 'Continental Vanco 2 195/70 R15', (SELECT id FROM brands WHERE name='Continental'), (SELECT id FROM categories WHERE name='Yuk mashinasi shinalari'), 195, 70, 15, '104', 'R', 'SUMMER', 820000, 1160000, 14, 6, 'Yengil tijorat (C) — yuqori yuk indeksi, mustahkam yon.', '/products/CNT-VAN2-1957015.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='CNT-VAN2-1957015');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'BRD-DR660-2056516', 'Bridgestone Duravis R660 205/65 R16', (SELECT id FROM brands WHERE name='Bridgestone'), (SELECT id FROM categories WHERE name='Yuk mashinasi shinalari'), 205, 65, 16, '107', 'T', 'SUMMER', 950000, 1330000, 10, 5, 'Furgon va mikroavtobus uchun uzoq yurumli shina.', '/products/BRD-DR660-2056516.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='BRD-DR660-2056516');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'TRI-TR652-2257015', 'Triangle TR652 225/70 R15', (SELECT id FROM brands WHERE name='Triangle'), (SELECT id FROM categories WHERE name='Yuk mashinasi shinalari'), 225, 70, 15, '112', 'S', 'ALL_SEASON', 640000, 920000, 18, 6, 'Hamyonbop tijorat shinasi — kuchli karkas.', '/products/TRI-TR652-2257015.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='TRI-TR652-2257015');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'MCH-PR4-1207017', 'Michelin Pilot Road 4 120/70 R17', (SELECT id FROM brands WHERE name='Michelin'), (SELECT id FROM categories WHERE name='Mototsikl shinalari'), 120, 70, 17, '58', 'W', 'SUMMER', 780000, 1180000, 7, 3, 'Sport-turizm mototsikli — ho''l yo''lda ajoyib ushlash.', '/products/MCH-PR4-1207017.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='MCH-PR4-1207017');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'BRD-BT-1805517', 'Bridgestone Battlax S22 180/55 R17', (SELECT id FROM brands WHERE name='Bridgestone'), (SELECT id FROM categories WHERE name='Mototsikl shinalari'), 180, 55, 17, '73', 'W', 'SUMMER', 990000, 1450000, 0, 3, 'Sport mototsikl — trek va yoʻlda maksimal burchak.', '/products/BRD-BT-1805517.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='BRD-BT-1805517');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'DLP-SS-1606017', 'Dunlop SportSmart Mk3 160/60 R17', (SELECT id FROM brands WHERE name='Dunlop'), (SELECT id FROM categories WHERE name='Mototsikl shinalari'), 160, 60, 17, '69', 'W', 'SUMMER', 860000, 1260000, 6, 3, 'Tez qiziydigan aralashma — sport haydash uchun.', '/products/DLP-SS-1606017.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='DLP-SS-1606017');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'PIR-PZ-2454019', 'Pirelli P Zero 245/40 R19', (SELECT id FROM brands WHERE name='Pirelli'), (SELECT id FROM categories WHERE name='Sport / UHP shinalari'), 245, 40, 19, '98', 'Y', 'SUMMER', 1550000, 2180000, 6, 3, 'Premium sport shina — maksimal yoʻl ushlashi.', '/products/PIR-PZ-2454019.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='PIR-PZ-2454019');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'MCH-PS4S-2553520', 'Michelin Pilot Sport 4S 255/35 R20', (SELECT id FROM brands WHERE name='Michelin'), (SELECT id FROM categories WHERE name='Sport / UHP shinalari'), 255, 35, 20, '97', 'Y', 'SUMMER', 1980000, 2790000, 3, 5, 'Flagman UHP — trek darajasidagi ishlash.', '/products/MCH-PS4S-2553520.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='MCH-PS4S-2553520');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'CNT-SC7-2354018', 'Continental SportContact 7 235/40 R18', (SELECT id FROM brands WHERE name='Continental'), (SELECT id FROM categories WHERE name='Sport / UHP shinalari'), 235, 40, 18, '95', 'Y', 'SUMMER', 1420000, 1990000, 8, 4, 'Aniq boshqaruv va qisqa tormoz — sport sedanlar uchun.', '/products/CNT-SC7-2354018.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='CNT-SC7-2354018');
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)
  SELECT 'HNK-ION-2354518', 'Hankook iON evo 235/45 R18', (SELECT id FROM brands WHERE name='Hankook'), (SELECT id FROM categories WHERE name='Elektromobil (EV) shinalari'), 235, 45, 18, '98', 'W', 'ALL_SEASON', 1180000, 1650000, 9, 4, 'EV uchun maxsus — past shovqin, yuqori yuk, kam qarshilik.', '/products/HNK-ION-2354518.svg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='HNK-ION-2354518');

-- ─── Xodim login'lari (users) + RBAC (user_roles). Parol: seller123 ───
INSERT INTO users (username, password, full_name, email, phone, role, active, must_change_password)
  SELECT 'menejer', '$2a$10$rDkPvvAFV8kqwvKJzwlHMOuHxfxXe7hZ/ZBUZfFMEfUYNVByWaJHi', 'Jasur Aliyev', 'menejer@protektor.uz', '+998911002020', 'MANAGER', true, false
  WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='menejer');
INSERT INTO users (username, password, full_name, email, phone, role, active, must_change_password)
  SELECT 'kassir', '$2a$10$rDkPvvAFV8kqwvKJzwlHMOuHxfxXe7hZ/ZBUZfFMEfUYNVByWaJHi', 'Malika Karimova', 'kassir@protektor.uz', '+998911002021', 'SELLER', true, false
  WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='kassir');
INSERT INTO user_roles (user_id, role_id, assigned_at)
  SELECT u.id, r.id, CURRENT_TIMESTAMP FROM users u JOIN roles r ON r.code = u.role
  WHERE u.username IN ('menejer','kassir')
    AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.id AND ur.role_id=r.id);

-- ─── Ta'minotchilar ───
INSERT INTO suppliers (name, contact_person, phone, email, address, balance, active)
  SELECT 'Silk Road Tyres MCHJ', 'Otabek Sattorov', '+998712101010', 'info@silkroadtyres.uz', 'Toshkent sh., Yashnobod tumani, Sanoat 12', 0, true
  WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE name='Silk Road Tyres MCHJ');
INSERT INTO suppliers (name, contact_person, phone, email, address, balance, active)
  SELECT 'Asia Rubber Import', 'Kamoliddin Rasulov', '+998712202020', 'sales@asiarubber.uz', 'Toshkent sh., Bektemir tumani', 0, true
  WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE name='Asia Rubber Import');
INSERT INTO suppliers (name, contact_person, phone, email, address, balance, active)
  SELECT 'Premium Wheels Distribution', 'Shahnoza YTashkentova', '+998712303030', 'order@premiumwheels.uz', 'Toshkent sh., Olmazor tumani', 0, true
  WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE name='Premium Wheels Distribution');
INSERT INTO suppliers (name, contact_person, phone, email, address, balance, active)
  SELECT 'Kumho Uzbekistan', 'Jamshid Umarov', '+998712404040', 'uz@kumho.com', 'Toshkent sh., Yakkasaroy tumani', 0, true
  WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE name='Kumho Uzbekistan');
INSERT INTO suppliers (name, contact_person, phone, email, address, balance, active)
  SELECT 'Global Tyre Trade', 'Aziza Nurmatova', '+998712505050', 'contact@globaltyre.uz', 'Toshkent sh., Chilonzor tumani', 0, true
  WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE name='Global Tyre Trade');

-- ─── Mijozlar (portal PIN: 1234) ───
INSERT INTO customers (full_name, phone, address, customer_type, company_name, balance, active, portal_enabled, pin_hash, pin_set_at, preferred_language, created_by)
  SELECT 'Sherzod Mirzaev', '+998930010001', 'Toshkent sh., Mirobod tumani', 'INDIVIDUAL', NULL, 0, true, true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGf6.NsqE7xqPnQMz5j4fMjpNQ7i', CURRENT_TIMESTAMP, 'uz', 1
  WHERE NOT EXISTS (SELECT 1 FROM customers WHERE phone='+998930010001');
INSERT INTO customers (full_name, phone, address, customer_type, company_name, balance, active, created_by)
  SELECT 'Kamron Ismoilov', '+998930010002', 'Toshkent sh., Chilonzor tumani', 'INDIVIDUAL', NULL, 0, true, 1
  WHERE NOT EXISTS (SELECT 1 FROM customers WHERE phone='+998930010002');
INSERT INTO customers (full_name, phone, address, customer_type, company_name, balance, active, portal_enabled, pin_hash, pin_set_at, preferred_language, created_by)
  SELECT 'Gulnora Yusupova', '+998930010003', 'Toshkent sh., Yashnobod tumani', 'INDIVIDUAL', NULL, 0, true, true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGf6.NsqE7xqPnQMz5j4fMjpNQ7i', CURRENT_TIMESTAMP, 'uz', 1
  WHERE NOT EXISTS (SELECT 1 FROM customers WHERE phone='+998930010003');
INSERT INTO customers (full_name, phone, address, customer_type, company_name, balance, active, created_by)
  SELECT 'Oybek Tursunov', '+998930010004', 'Samarqand sh., Registon ko''chasi', 'INDIVIDUAL', NULL, 0, true, 1
  WHERE NOT EXISTS (SELECT 1 FROM customers WHERE phone='+998930010004');
INSERT INTO customers (full_name, phone, address, customer_type, company_name, balance, active, created_by)
  SELECT 'Diyor Xolmatov', '+998930010005', 'Andijon sh., Bobur ko''chasi', 'INDIVIDUAL', NULL, 0, true, 1
  WHERE NOT EXISTS (SELECT 1 FROM customers WHERE phone='+998930010005');
INSERT INTO customers (full_name, phone, address, customer_type, company_name, balance, active, portal_enabled, pin_hash, pin_set_at, preferred_language, created_by)
  SELECT 'Nafisa Karimova', '+998930010006', 'Toshkent sh., Sergeli tumani', 'INDIVIDUAL', NULL, 0, true, true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGf6.NsqE7xqPnQMz5j4fMjpNQ7i', CURRENT_TIMESTAMP, 'uz', 1
  WHERE NOT EXISTS (SELECT 1 FROM customers WHERE phone='+998930010006');
INSERT INTO customers (full_name, phone, address, customer_type, company_name, balance, active, created_by)
  SELECT 'Jahongir Sobirov', '+998930010007', 'Namangan sh., Uychi ko''chasi', 'INDIVIDUAL', NULL, 0, true, 1
  WHERE NOT EXISTS (SELECT 1 FROM customers WHERE phone='+998930010007');
INSERT INTO customers (full_name, phone, address, customer_type, company_name, balance, active, created_by)
  SELECT 'Sirojiddin Aliyev', '+998930010008', 'Farg''ona sh., Mustaqillik ko''chasi', 'INDIVIDUAL', NULL, 0, true, 1
  WHERE NOT EXISTS (SELECT 1 FROM customers WHERE phone='+998930010008');
INSERT INTO customers (full_name, phone, address, customer_type, company_name, balance, active, portal_enabled, pin_hash, pin_set_at, preferred_language, created_by)
  SELECT 'Toshkent Taksi MCHJ', '+998930010009', 'Toshkent sh., Yunusobod tumani', 'BUSINESS', 'Toshkent Taksi MCHJ', 0, true, true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGf6.NsqE7xqPnQMz5j4fMjpNQ7i', CURRENT_TIMESTAMP, 'uz', 1
  WHERE NOT EXISTS (SELECT 1 FROM customers WHERE phone='+998930010009');
INSERT INTO customers (full_name, phone, address, customer_type, company_name, balance, active, created_by)
  SELECT 'Express Logistika MCHJ', '+998930010010', 'Toshkent sh., Sergeli tumani, Logistika 8', 'BUSINESS', 'Express Logistika MCHJ', 0, true, 1
  WHERE NOT EXISTS (SELECT 1 FROM customers WHERE phone='+998930010010');
INSERT INTO customers (full_name, phone, address, customer_type, company_name, balance, active, created_by)
  SELECT 'Avto Salon Premium', '+998930010011', 'Toshkent sh., Yunusobod tumani, Amir Temur 108', 'BUSINESS', 'Avto Salon Premium MCHJ', 0, true, 1
  WHERE NOT EXISTS (SELECT 1 FROM customers WHERE phone='+998930010011');
INSERT INTO customers (full_name, phone, address, customer_type, company_name, balance, active, created_by)
  SELECT 'Qurilish Trans MCHJ', '+998930010012', 'Buxoro sh., Markaziy ko''cha 24', 'BUSINESS', 'Qurilish Trans MCHJ', 0, true, 1
  WHERE NOT EXISTS (SELECT 1 FROM customers WHERE phone='+998930010012');
INSERT INTO customers (full_name, phone, address, customer_type, company_name, balance, active, created_by)
  SELECT 'Rustam G''aniev', '+998930010013', 'Qarshi sh., Nasaf ko''chasi', 'INDIVIDUAL', NULL, 0, true, 1
  WHERE NOT EXISTS (SELECT 1 FROM customers WHERE phone='+998930010013');
INSERT INTO customers (full_name, phone, address, customer_type, company_name, balance, active, created_by)
  SELECT 'Aziza Mahmudova', '+998930010014', 'Toshkent sh., Olmazor tumani', 'INDIVIDUAL', NULL, 0, true, 1
  WHERE NOT EXISTS (SELECT 1 FROM customers WHERE phone='+998930010014');
INSERT INTO customers (full_name, phone, address, customer_type, company_name, balance, active, created_by)
  SELECT 'Mega Market MCHJ', '+998930010015', 'Toshkent sh., Shayxontohur tumani', 'BUSINESS', 'Mega Market MCHJ', 0, true, 1
  WHERE NOT EXISTS (SELECT 1 FROM customers WHERE phone='+998930010015');
INSERT INTO customers (full_name, phone, address, customer_type, company_name, balance, active, created_by)
  SELECT 'Bahodir Ruzimov', '+998930010016', 'Xorazm v., Urganch sh.', 'INDIVIDUAL', NULL, 0, true, 1
  WHERE NOT EXISTS (SELECT 1 FROM customers WHERE phone='+998930010016');

-- ─── Xodimlar (HR). Ba'zilariga user login bog'langan ───
INSERT INTO employees (full_name, phone, email, position, department, salary, hire_date, status, birth_date, address, user_id)
  SELECT 'Sardor Bekmurodov', '+998909900001', 'director@protektor.uz', 'Direktor', 'Boshqaruv', 12000000, CURRENT_DATE - 1180, 'ACTIVE', DATE '1985-04-12', 'Toshkent sh., Mirzo Ulug''bek tumani', (SELECT id FROM users WHERE username='admin')
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE phone='+998909900001');
INSERT INTO employees (full_name, phone, email, position, department, salary, hire_date, status, birth_date, address, user_id)
  SELECT 'Jasur Aliyev', '+998909900002', 'menejer@protektor.uz', 'Savdo menejeri', 'Savdo', 8500000, CURRENT_DATE - 760, 'ACTIVE', DATE '1990-09-03', 'Toshkent sh., Yunusobod tumani', (SELECT id FROM users WHERE username='menejer')
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE phone='+998909900002');
INSERT INTO employees (full_name, phone, email, position, department, salary, hire_date, status, birth_date, address, user_id)
  SELECT 'Nodira Yusupova', '+998909900003', 'sotuvchi@protektor.uz', 'Bosh sotuvchi', 'Savdo', 6000000, CURRENT_DATE - 540, 'ACTIVE', DATE '1994-01-22', 'Toshkent sh., Chilonzor tumani', (SELECT id FROM users WHERE username='seller')
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE phone='+998909900003');
INSERT INTO employees (full_name, phone, email, position, department, salary, hire_date, status, birth_date, address, user_id)
  SELECT 'Malika Karimova', '+998909900004', 'kassir@protektor.uz', 'Kassir', 'Savdo', 5000000, CURRENT_DATE - 300, 'ACTIVE', DATE '1997-07-19', 'Toshkent sh., Sergeli tumani', (SELECT id FROM users WHERE username='kassir')
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE phone='+998909900004');
INSERT INTO employees (full_name, phone, email, position, department, salary, hire_date, status, birth_date, address)
  SELECT 'Bekzod To''raev', '+998909900005', NULL, 'Ombor mudiri', 'Ombor', 6500000, CURRENT_DATE - 880, 'ACTIVE', DATE '1988-11-05', 'Toshkent sh., Bektemir tumani'
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE phone='+998909900005');
INSERT INTO employees (full_name, phone, email, position, department, salary, hire_date, status)
  SELECT 'Aziz Rahmonov', '+998909900006', NULL, 'Omborchi', 'Ombor', 4500000, CURRENT_DATE - 220, 'ACTIVE'
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE phone='+998909900006');
INSERT INTO employees (full_name, phone, email, position, department, salary, hire_date, status)
  SELECT 'Dilnoza Saidova', '+998909900007', 'buxgalter@protektor.uz', 'Bosh buxgalter', 'Moliya', 7000000, CURRENT_DATE - 650, 'ACTIVE'
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE phone='+998909900007');
INSERT INTO employees (full_name, phone, email, position, department, salary, hire_date, status)
  SELECT 'Shohruh Qodirov', '+998909900008', NULL, 'Shinamontaj ustasi', 'Servis', 5500000, CURRENT_DATE - 410, 'ACTIVE'
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE phone='+998909900008');
INSERT INTO employees (full_name, phone, email, position, department, salary, hire_date, status)
  SELECT 'Umid Toshpo''latov', '+998909900009', NULL, 'Shinamontaj ustasi', 'Servis', 5000000, CURRENT_DATE - 200, 'ON_LEAVE'
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE phone='+998909900009');
INSERT INTO employees (full_name, phone, email, position, department, salary, hire_date, status)
  SELECT 'Kamola Ergasheva', '+998909900010', 'marketing@protektor.uz', 'Marketing menejeri', 'Marketing', 6000000, CURRENT_DATE - 330, 'ACTIVE'
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE phone='+998909900010');
INSERT INTO employees (full_name, phone, email, position, department, salary, hire_date, status)
  SELECT 'Javohir Nazarov', '+998909900011', NULL, 'Yetkazib beruvchi', 'Logistika', 4800000, CURRENT_DATE - 150, 'ACTIVE'
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE phone='+998909900011');
INSERT INTO employees (full_name, phone, email, position, department, salary, hire_date, status)
  SELECT 'Feruza Abdullaeva', '+998909900012', NULL, 'Sotuvchi', 'Savdo', 4500000, CURRENT_DATE - 500, 'TERMINATED'
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE phone='+998909900012');


-- ═══════════════ 2-QISM: TRANZAKSIYA (qayta generatsiya) ═══════════════
DO $seed$
DECLARE
  day_off int; d date; i int; j int;
  v_dow int; v_nsales int; v_inv text; v_ts timestamp;
  v_cust bigint; v_user bigint; v_method text; v_status text; v_pstat text;
  v_items int; v_pid bigint; v_price numeric; v_qty int;
  v_subtotal numeric; v_disc numeric; v_total numeric; v_paid numeric;
  v_due date; v_sale_id bigint; v_r double precision; v_cancel boolean;
  cust_ids bigint[]; user_ids bigint[]; supp_ids bigint[];
  v_prod record;
  v_in int; v_sold int; v_o1 int; v_o2 int;
  v_po_date date; v_supp bigint; v_lines int; v_po_id bigint;
  v_oq int; v_rq int; v_po_total numeric; v_po_paid numeric; v_po_pstat text; v_recv date;
  v_ret record; v_ri int;
  v_od date; v_oid bigint; v_dm text; v_pm text; v_shop_ps text; v_ostatus text;
  v_sub numeric; v_fee numeric; v_cname text; v_cphone text; v_shop_cust bigint;
  v_pname text; v_psize text;
  names text[] := ARRAY['Akmal Yusupov','Bekzod Sattorov','Dilshod Rahimov','Elyor Karimov',
    'Farhod Nazarov','G''ayrat Umarov','Hasan Aliyev','Ibrohim Toshmatov','Jamshid Qodirov',
    'Kamol Ismoilov','Laziz Sobirov','Madina Yo''ldosheva','Nilufar Ergasheva','Otabek Mirzaev',
    'Parda Ruzimov','Qahramon Saidov','Rustam Xolmatov','Sanjar Aliboev','Timur G''aniev','Ulug''bek Nazarov'];
  phones text[] := ARRAY['+998971110001','+998971110002','+998971110003','+998971110004',
    '+998971110005','+998971110006','+998971110007','+998971110008','+998971110009','+998971110010'];
  v_cnt_sales int := 0; v_cnt_po int := 0; v_cnt_shop int := 0;
BEGIN
  PERFORM setseed(0.4242);

  -- ── Demo-teg bo'yicha eski tranzaksiyalarni tozalash (FK-xavfsiz tartib) ──
  DELETE FROM payments WHERE notes = '[demo]' OR sale_id IN (SELECT id FROM sales WHERE invoice_number LIKE 'DS-%');
  DELETE FROM debts    WHERE notes = '[demo]' OR sale_id IN (SELECT id FROM sales WHERE invoice_number LIKE 'DS-%');
  DELETE FROM sales    WHERE invoice_number LIKE 'DS-%';
  DELETE FROM stock_movements WHERE reference_type = 'DEMO_SEED';
  DELETE FROM purchase_payments WHERE notes = '[demo]' OR purchase_order_id IN (SELECT id FROM purchase_orders WHERE order_number LIKE 'DPO-%');
  DELETE FROM purchase_returns  WHERE return_number LIKE 'DRET-%' OR purchase_order_id IN (SELECT id FROM purchase_orders WHERE order_number LIKE 'DPO-%');
  DELETE FROM purchase_orders   WHERE order_number LIKE 'DPO-%';
  DELETE FROM shop_orders WHERE order_no LIKE 'DWEB-%';
  DELETE FROM staff_notifications;      -- demo bu jadvalni to'liq boshqaradi
  DELETE FROM customer_notifications WHERE metadata @> '{"demo":true}'::jsonb OR metadata IS NULL;

  SELECT array_agg(id) INTO cust_ids FROM customers WHERE active = true;
  SELECT array_agg(id) INTO user_ids FROM users WHERE username IN ('admin','seller','menejer','kassir');
  SELECT array_agg(id) INTO supp_ids FROM suppliers WHERE active = true;

  -- ══ SOTUVLAR (oxirgi 80 kun, bugungi kun bilan) ══
  FOR day_off IN 0..79 LOOP
    d := CURRENT_DATE - day_off;
    v_dow := extract(dow FROM d)::int;
    v_nsales := CASE WHEN v_dow IN (0,6) THEN 2 + floor(random()*3)::int ELSE 3 + floor(random()*5)::int END;
    FOR i IN 1..v_nsales LOOP
      v_cnt_sales := v_cnt_sales + 1;
      v_inv := 'DS-' || to_char(d,'YYMMDD') || '-' || lpad(i::text,3,'0');
      v_ts  := d + make_time(9 + floor(random()*11)::int, floor(random()*60)::int, 0);
      -- mijoz: ~45% walk-in (NULL), aks holda tasodifiy
      IF random() < 0.45 THEN v_cust := NULL;
      ELSE v_cust := cust_ids[1 + floor(random()*array_length(cust_ids,1))::int]; END IF;
      v_user := user_ids[1 + floor(random()*array_length(user_ids,1))::int];
      v_r := random();
      v_method := CASE WHEN v_r < 0.45 THEN 'CASH' WHEN v_r < 0.78 THEN 'CARD' WHEN v_r < 0.90 THEN 'TRANSFER' ELSE 'MIXED' END;
      v_cancel := random() < 0.02;
      v_status := CASE WHEN v_cancel THEN 'CANCELLED' ELSE 'COMPLETED' END;

      INSERT INTO sales (invoice_number, customer_id, sale_date, subtotal, discount_amount, discount_percent, total_amount, paid_amount, debt_amount, payment_method, payment_status, status, created_by, created_at)
        VALUES (v_inv, v_cust, v_ts, 0, 0, 0, 0, 0, 0, v_method, 'UNPAID', v_status, v_user, v_ts)
        RETURNING id INTO v_sale_id;

      v_items := 1 + floor(random()*3)::int;
      v_subtotal := 0;
      FOR j IN 1..v_items LOOP
        SELECT id, selling_price INTO v_pid, v_price FROM products ORDER BY random() LIMIT 1;
        v_qty := (ARRAY[1,2,2,4,2,4,2,1])[1 + floor(random()*8)::int];
        INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount, total_price, created_at)
          VALUES (v_sale_id, v_pid, v_qty, v_price, 0, v_price*v_qty, v_ts);
        v_subtotal := v_subtotal + v_price*v_qty;
      END LOOP;

      IF random() < 0.20 THEN v_disc := round(v_subtotal * (0.03 + random()*0.04) / 1000) * 1000; ELSE v_disc := 0; END IF;
      v_total := v_subtotal - v_disc;

      IF v_status = 'CANCELLED' THEN
        v_paid := 0; v_pstat := 'UNPAID';
      ELSIF v_cust IS NOT NULL AND random() < 0.26 THEN
        v_paid := round(v_total * (0.3 + random()*0.4) / 1000) * 1000; v_pstat := 'PARTIAL';
      ELSE
        v_paid := v_total; v_pstat := 'PAID';
      END IF;

      UPDATE sales SET subtotal=v_subtotal, discount_amount=v_disc, total_amount=v_total,
             paid_amount=v_paid, debt_amount=v_total-v_paid, payment_status=v_pstat WHERE id=v_sale_id;

      IF v_paid > 0 THEN
        INSERT INTO payments (sale_id, customer_id, amount, method, payment_type, notes, payment_date, received_by, created_at)
          VALUES (v_sale_id, v_cust, v_paid, v_method, 'SALE_PAYMENT', '[demo]', v_ts, v_user, v_ts);
      END IF;
      IF v_status = 'COMPLETED' AND v_cust IS NOT NULL AND v_total - v_paid > 0 THEN
        v_due := d + 30;
        INSERT INTO debts (customer_id, sale_id, original_amount, remaining_amount, due_date, status, notes, created_at)
          VALUES (v_cust, v_sale_id, v_total-v_paid, v_total-v_paid, v_due,
                  CASE WHEN v_due < CURRENT_DATE THEN 'OVERDUE' ELSE 'ACTIVE' END, '[demo]', v_ts);
      END IF;
    END LOOP;
  END LOOP;

  -- Qarzlarning bir qismini to'langan qilish (OVERDUE → PAID) + DEBT_PAYMENT
  WITH settled AS (
    UPDATE debts SET remaining_amount = 0, status = 'PAID'
    WHERE notes = '[demo]' AND status = 'OVERDUE' AND random() < 0.4
    RETURNING customer_id, original_amount, due_date
  )
  INSERT INTO payments (sale_id, customer_id, amount, method, payment_type, notes, payment_date, received_by, created_at)
  SELECT NULL, customer_id, original_amount, 'CASH', 'DEBT_PAYMENT', '[demo]',
         due_date, (SELECT id FROM users WHERE username='seller'), due_date
  FROM settled;

  -- ══ OMBOR HARAKATLARI (har mahsulot uchun izchil tarix, joriy qoldiqqa yakunlanadi) ══
  FOR v_prod IN SELECT id, quantity FROM products LOOP
    v_sold := 4 + floor(random()*16)::int;
    v_in := v_prod.quantity + v_sold;
    v_o1 := floor(v_sold*0.6)::int;
    v_o2 := v_sold - v_o1;
    INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference_type, notes, created_by, created_at)
      VALUES (v_prod.id, 'IN', v_in, 0, v_in, 'DEMO_SEED', 'Boshlang''ich qabul (ta''minotchidan)', 1, (CURRENT_DATE - 70) + time '10:00');
    INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference_type, notes, created_by, created_at)
      VALUES (v_prod.id, 'OUT', v_o1, v_in, v_in - v_o1, 'DEMO_SEED', 'Sotuv (yig''ma)', 1, (CURRENT_DATE - 38) + time '14:30');
    INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference_type, notes, created_by, created_at)
      VALUES (v_prod.id, 'OUT', v_o2, v_in - v_o1, v_prod.quantity, 'DEMO_SEED', 'Sotuv (yig''ma)', 1, (CURRENT_DATE - 12) + time '16:15');
  END LOOP;

  -- ══ XARIDLAR (Purchase Orders) ══
  FOR i IN 1..22 LOOP
    v_cnt_po := v_cnt_po + 1;
    v_po_date := CURRENT_DATE - (4 + floor(random()*95)::int);
    v_supp := supp_ids[1 + floor(random()*array_length(supp_ids,1))::int];
    v_r := random();
    v_status := CASE WHEN v_r < 0.55 THEN 'RECEIVED' WHEN v_r < 0.70 THEN 'ORDERED'
                     WHEN v_r < 0.82 THEN 'PARTIAL' WHEN v_r < 0.92 THEN 'DRAFT' ELSE 'CANCELLED' END;
    v_recv := CASE WHEN v_status IN ('RECEIVED','PARTIAL') THEN v_po_date + (3 + floor(random()*10)::int) ELSE NULL END;
    INSERT INTO purchase_orders (order_number, supplier_id, order_date, expected_date, received_date, total_amount, paid_amount, status, payment_status, due_date, created_by, created_at)
      VALUES ('DPO-' || to_char(v_po_date,'YYMMDD') || '-' || lpad(i::text,3,'0'), v_supp, v_po_date, v_po_date + 7, v_recv, 0, 0, v_status, 'UNPAID', v_po_date + 30, 1, v_po_date + time '11:00')
      RETURNING id INTO v_po_id;
    v_lines := 2 + floor(random()*4)::int;
    v_po_total := 0;
    FOR j IN 1..v_lines LOOP
      SELECT id, purchase_price INTO v_pid, v_price FROM products ORDER BY random() LIMIT 1;
      v_oq := (ARRAY[10,20,20,30,40,50,16])[1 + floor(random()*7)::int];
      v_rq := CASE WHEN v_status = 'RECEIVED' THEN v_oq WHEN v_status = 'PARTIAL' THEN floor(v_oq*0.5)::int ELSE 0 END;
      INSERT INTO purchase_order_items (purchase_order_id, product_id, ordered_quantity, received_quantity, unit_price, total_price, created_at)
        VALUES (v_po_id, v_pid, v_oq, v_rq, v_price, v_price*v_oq, v_po_date + time '11:00');
      v_po_total := v_po_total + v_price*v_oq;
    END LOOP;
    IF v_status IN ('RECEIVED','PARTIAL') THEN
      IF random() < 0.6 THEN v_po_paid := v_po_total; ELSE v_po_paid := round(v_po_total*0.5/1000)*1000; END IF;
    ELSE v_po_paid := 0; END IF;
    v_po_pstat := CASE WHEN v_po_paid = 0 THEN 'UNPAID' WHEN v_po_paid >= v_po_total THEN 'PAID' ELSE 'PARTIAL' END;
    UPDATE purchase_orders SET total_amount=v_po_total, paid_amount=v_po_paid, payment_status=v_po_pstat WHERE id=v_po_id;
    IF v_po_paid > 0 THEN
      INSERT INTO purchase_payments (purchase_order_id, amount, payment_date, payment_method, notes, received_by, created_at)
        VALUES (v_po_id, v_po_paid, v_po_date + 2, 'TRANSFER', '[demo]', 1, v_po_date + time '12:00');
    END IF;
  END LOOP;

  -- Bir nechta xarid qaytarishi (RECEIVED xaridlardan)
  v_ri := 0;
  FOR v_ret IN SELECT id, order_date FROM purchase_orders WHERE order_number LIKE 'DPO-%' AND status='RECEIVED' ORDER BY random() LIMIT 3 LOOP
    v_ri := v_ri + 1;
    INSERT INTO purchase_returns (return_number, purchase_order_id, return_date, reason, status, refund_amount, created_by, approved_by, approved_at, created_at)
      VALUES ('DRET-' || to_char(v_ret.order_date,'YYMMDD') || '-' || lpad(v_ri::text,2,'0'), v_ret.id, v_ret.order_date + 10,
              'Nuqsonli partiya — yon devorda mikro-yoriqlar', 'APPROVED',
              (SELECT COALESCE(SUM(total_price),0)*0.1 FROM purchase_order_items WHERE purchase_order_id=v_ret.id),
              1, 1, v_ret.order_date + 12, v_ret.order_date + 10 + time '10:00');
    INSERT INTO purchase_return_items (purchase_return_id, product_id, returned_quantity, unit_price, total_price, created_at)
      SELECT currval(pg_get_serial_sequence('purchase_returns','id')), poi.product_id, 2, poi.unit_price, poi.unit_price*2, v_ret.order_date + 10 + time '10:00'
      FROM purchase_order_items poi WHERE poi.purchase_order_id=v_ret.id ORDER BY poi.id LIMIT 1;
  END LOOP;

  -- ══ ONLAYN BUYURTMALAR (storefront) ══
  FOR i IN 1..26 LOOP
    v_cnt_shop := v_cnt_shop + 1;
    -- oxirgi 4 tasi — bugungi/kechagi YANGI (badge uchun)
    IF i > 22 THEN v_od := CURRENT_DATE - floor(random()*2)::int; ELSE v_od := CURRENT_DATE - floor(random()*40)::int; END IF;
    IF random() < 0.4 THEN
      v_shop_cust := cust_ids[1 + floor(random()*array_length(cust_ids,1))::int];
      SELECT full_name, phone INTO v_cname, v_cphone FROM customers WHERE id=v_shop_cust;
    ELSE
      v_shop_cust := NULL;
      v_cname := names[1 + floor(random()*array_length(names,1))::int];
      v_cphone := phones[1 + floor(random()*array_length(phones,1))::int];
    END IF;
    IF i > 22 THEN v_ostatus := CASE WHEN random() < 0.6 THEN 'NEW' ELSE 'CONFIRMED' END;
    ELSE
      v_r := random();
      v_ostatus := CASE WHEN v_r < 0.5 THEN 'COMPLETED' WHEN v_r < 0.72 THEN 'CONFIRMED'
                        WHEN v_r < 0.86 THEN 'NEW' ELSE 'CANCELLED' END;
    END IF;
    v_dm := CASE WHEN random() < 0.6 THEN 'DELIVERY' ELSE 'PICKUP' END;
    v_r := random();
    v_pm := CASE WHEN v_r < 0.35 THEN 'CASH' WHEN v_r < 0.6 THEN 'CARD' WHEN v_r < 0.82 THEN 'PAYME' ELSE 'CLICK' END;
    v_shop_ps := CASE WHEN v_ostatus IN ('COMPLETED') THEN 'PAID'
                      WHEN v_ostatus='CONFIRMED' AND random() < 0.5 THEN 'PAID' ELSE 'PENDING' END;
    v_fee := CASE WHEN v_dm='DELIVERY' THEN 50000 ELSE 0 END;
    INSERT INTO shop_orders (order_no, customer_name, customer_phone, customer_email, delivery_method, delivery_address, payment_method, subtotal, delivery_fee, total_amount, status, payment_status, customer_id, created_at)
      VALUES ('DWEB-' || to_char(v_od,'YYMMDD') || '-' || lpad(i::text,3,'0'), v_cname, v_cphone, NULL, v_dm,
              CASE WHEN v_dm='DELIVERY' THEN 'Toshkent sh., yetkazib berish manzili' ELSE NULL END,
              v_pm, 0, v_fee, 0, v_ostatus, v_shop_ps, v_shop_cust, v_od + make_time(10 + floor(random()*10)::int, floor(random()*60)::int, 0))
      RETURNING id INTO v_oid;
    v_items := 1 + floor(random()*3)::int;
    v_sub := 0;
    FOR j IN 1..v_items LOOP
      SELECT id, name, selling_price, (width || '/' || profile || ' R' || diameter) INTO v_pid, v_pname, v_price, v_psize FROM products ORDER BY random() LIMIT 1;
      v_qty := (ARRAY[1,2,2,4])[1 + floor(random()*4)::int];
      INSERT INTO shop_order_items (order_id, product_id, product_name, size_string, quantity, unit_price, total_price, created_at)
        VALUES (v_oid, v_pid, v_pname, v_psize, v_qty, v_price, v_price*v_qty, now());
      v_sub := v_sub + v_price*v_qty;
    END LOOP;
    UPDATE shop_orders SET subtotal=v_sub, total_amount=v_sub + v_fee WHERE id=v_oid;
  END LOOP;

  -- ══ XODIM BILDIRISHNOMALARI (qo'ng'iroq) ══
  INSERT INTO staff_notifications (user_id, title, message, notification_type, is_read, reference_type, reference_id, created_at) VALUES
    (NULL, 'Yangi onlayn buyurtma', 'Storefront orqali yangi buyurtma keldi. Tasdiqlashni kuting.', 'ORDER', false, 'ORDER', (SELECT id FROM shop_orders WHERE order_no LIKE 'DWEB-%' ORDER BY created_at DESC LIMIT 1), now() - interval '25 minutes'),
    (NULL, 'Kam qoldiq ogohlantirishi', 'Pirelli Scorpion Winter 255/55 R18 — 3 dona qoldi (min. 5).', 'WARNING', false, 'PRODUCT', (SELECT id FROM products WHERE sku='PIR-SCW-2555518'), now() - interval '2 hours'),
    (NULL, 'Tugagan mahsulot', 'Bridgestone Dueler H/P Sport 235/55 R19 — zaxira tugadi.', 'WARNING', false, 'PRODUCT', (SELECT id FROM products WHERE sku='BRD-DHP-2355519'), now() - interval '5 hours'),
    (1, 'To''lov qabul qilindi', 'Naqd to''lov muvaffaqiyatli qayd etildi.', 'PAYMENT', false, NULL, NULL, now() - interval '1 hours'),
    (NULL, 'Yangi mijoz', 'Yangi mijoz ro''yxatdan o''tdi: Sherzod Mirzaev.', 'CUSTOMER', false, 'CUSTOMER', (SELECT id FROM customers WHERE phone='+998930010001'), now() - interval '6 hours'),
    (1, 'Kunlik hisobot tayyor', 'Kechagi savdo hisobotini Hisobotlar bo''limida ko''ring.', 'INFO', true, NULL, NULL, now() - interval '20 hours'),
    (NULL, 'Xarid yetkazildi', 'Silk Road Tyres MCHJ dan xarid qabul qilindi.', 'SUCCESS', true, NULL, NULL, now() - interval '1 days'),
    (NULL, 'Qarz muddati yaqin', 'Bir nechta mijozning qarz muddati yaqinlashmoqda.', 'WARNING', true, NULL, NULL, now() - interval '2 days'),
    (1, 'Yangi onlayn buyurtma', 'Yetkazib berish buyurtmasi qabul qilindi.', 'ORDER', true, NULL, NULL, now() - interval '3 days'),
    (NULL, 'Tizim yangilandi', 'Protektor ERP yangi versiyaga yangilandi.', 'INFO', true, NULL, NULL, now() - interval '5 days');

  -- ══ MIJOZ BILDIRISHNOMALARI (portal) ══
  INSERT INTO customer_notifications (customer_id, title_uz, title_ru, message_uz, message_ru, notification_type, is_read, created_at, metadata)
  SELECT c.id, t.tu, t.tr, t.mu, t.mr, t.nt, t.rd, now() - t.age, '{"demo":true}'::jsonb
  FROM (VALUES
    ('+998901234567','Qarz eslatmasi','Напоминание о долге','Sizda faol qarz mavjud. Iltimos, muddatida to''lang.','У вас есть активный долг. Пожалуйста, оплатите вовремя.','DEBT_REMINDER',false, interval '3 hours'),
    ('+998901234567','To''lov qabul qilindi','Оплата получена','To''lovingiz muvaffaqiyatli qabul qilindi. Rahmat!','Ваш платёж успешно принят. Спасибо!','PAYMENT_RECEIVED',true, interval '4 days'),
    ('+998930010001','Aksiya!','Акция!','Qishki shinalarga 15% chegirma — muddati cheklangan.','Скидка 15% на зимние шины — ограниченное время.','PROMOTION',false, interval '1 days'),
    ('+998930010003','Xush kelibsiz','Добро пожаловать','Protektor shaxsiy kabinetiga xush kelibsiz!','Добро пожаловать в личный кабинет Protektor!','SYSTEM',true, interval '10 days'),
    ('+998930010006','Aksiya!','Акция!','Yangi mavsum — premium brendlarga maxsus narxlar.','Новый сезон — специальные цены на премиум-бренды.','PROMOTION',false, interval '2 days'),
    ('+998930010009','Qarz eslatmasi','Напоминание о долге','Korxona hisobida qarz mavjud. Buxgalteriya bilan bog''laning.','На счёте компании есть задолженность. Свяжитесь с бухгалтерией.','DEBT_REMINDER',false, interval '12 hours')
  ) AS t(phone, tu, tr, mu, mr, nt, rd, age)
  JOIN customers c ON c.phone = t.phone;

  -- ══ BALANSLARNI QAYTA HISOBLASH ══
  UPDATE customers c SET balance = -COALESCE((SELECT SUM(remaining_amount) FROM debts d WHERE d.customer_id=c.id AND d.status <> 'PAID'),0);
  UPDATE suppliers s SET balance = -COALESCE((SELECT SUM(po.total_amount - po.paid_amount) FROM purchase_orders po WHERE po.supplier_id=s.id AND po.order_number LIKE 'DPO-%' AND po.status IN ('RECEIVED','PARTIAL','ORDERED')),0);

  RAISE NOTICE 'Demo seed: % sotuv, % xarid, % onlayn buyurtma generatsiya qilindi.', v_cnt_sales, v_cnt_po, v_cnt_shop;
END $seed$;

-- Demo marker
INSERT INTO app_settings (setting_key, setting_value, description)
  SELECT 'DEMO_SEED_VERSION', '1', 'Protektor demo ma''lumotlari versiyasi (faqat dev)'
  WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE setting_key='DEMO_SEED_VERSION');

-- ═══════════════ 6-QISM: KATALOG SHAJARASI VA XUSUSIYATLAR (idempotent) ═══════════════
-- Wildberries uslubidagi ko'p bosqichli kategoriya daraxti + kategoriyaga
-- bog'langan (bola kategoriyalarga meros bo'ladigan) atributlar namoyishi.

-- ─── Root kategoriyalar ───
INSERT INTO categories (name, description, icon, sort_order, active)
  SELECT 'Shinalar', 'Barcha turdagi avtomobil shinalari', 'circle-dot', 0, true
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name='Shinalar');
INSERT INTO categories (name, description, icon, sort_order, active)
  SELECT 'Disklar', 'Avtomobil g''ildirak disklari', 'disc', 1, true
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name='Disklar');
INSERT INTO categories (name, description, icon, sort_order, active)
  SELECT 'Aksessuarlar', 'Shina va g''ildirak aksessuarlari', 'wrench', 2, true
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name='Aksessuarlar');

-- ─── Mavjud shina kategoriyalarini "Shinalar" ostiga ko'chirish ───
UPDATE categories SET parent_id=(SELECT id FROM categories WHERE name='Shinalar'), sort_order=0, icon='car'
  WHERE name='Yengil avtomobil shinalari' AND parent_id IS NULL;
UPDATE categories SET parent_id=(SELECT id FROM categories WHERE name='Shinalar'), sort_order=1, icon='car-front'
  WHERE name='SUV va Crossover shinalari' AND parent_id IS NULL;
UPDATE categories SET parent_id=(SELECT id FROM categories WHERE name='Shinalar'), sort_order=2, icon='truck'
  WHERE name='Yuk mashinasi shinalari' AND parent_id IS NULL;
UPDATE categories SET parent_id=(SELECT id FROM categories WHERE name='Shinalar'), sort_order=3, icon='bike'
  WHERE name='Mototsikl shinalari' AND parent_id IS NULL;
UPDATE categories SET parent_id=(SELECT id FROM categories WHERE name='Shinalar'), sort_order=4, icon='gauge'
  WHERE name='Sport / UHP shinalari' AND parent_id IS NULL;
UPDATE categories SET parent_id=(SELECT id FROM categories WHERE name='Shinalar'), sort_order=5, icon='zap'
  WHERE name='Elektromobil (EV) shinalari' AND parent_id IS NULL;

-- ─── Disklar bolalari ───
INSERT INTO categories (name, description, parent_id, icon, sort_order, active)
  SELECT 'Quyma disklar', 'Yengil alyuminiy quyma disklar', (SELECT id FROM categories WHERE name='Disklar'), 'disc', 0, true
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name='Quyma disklar');
INSERT INTO categories (name, description, parent_id, icon, sort_order, active)
  SELECT 'Shtamplangan disklar', 'Po''lat shtamplangan disklar', (SELECT id FROM categories WHERE name='Disklar'), 'disc', 1, true
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name='Shtamplangan disklar');

-- ─── Aksessuarlar bolalari ───
INSERT INTO categories (name, description, parent_id, icon, sort_order, active)
  SELECT 'Ballon kalitlari va domkratlar', 'G''ildirak almashtirish asboblari', (SELECT id FROM categories WHERE name='Aksessuarlar'), 'wrench', 0, true
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name='Ballon kalitlari va domkratlar');
INSERT INTO categories (name, description, parent_id, icon, sort_order, active)
  SELECT 'G''ildirak boltlari va gaykalari', 'Krepej elementlari', (SELECT id FROM categories WHERE name='Aksessuarlar'), 'settings', 1, true
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name='G''ildirak boltlari va gaykalari');

-- ─── Atributlar ───
INSERT INTO attributes (name, code, type, unit, filterable, sort_order, active)
  SELECT 'Yo''l turi', 'road_type', 'SELECT', NULL, true, 0, true
  WHERE NOT EXISTS (SELECT 1 FROM attributes WHERE code='road_type');
INSERT INTO attributes (name, code, type, unit, filterable, sort_order, active)
  SELECT 'Protektor turi', 'tread_type', 'SELECT', NULL, true, 1, true
  WHERE NOT EXISTS (SELECT 1 FROM attributes WHERE code='tread_type');
INSERT INTO attributes (name, code, type, unit, filterable, sort_order, active)
  SELECT 'RunFlat', 'run_flat', 'BOOLEAN', NULL, true, 2, true
  WHERE NOT EXISTS (SELECT 1 FROM attributes WHERE code='run_flat');
INSERT INTO attributes (name, code, type, unit, filterable, sort_order, active)
  SELECT 'Shipli', 'studded', 'BOOLEAN', NULL, true, 3, true
  WHERE NOT EXISTS (SELECT 1 FROM attributes WHERE code='studded');
INSERT INTO attributes (name, code, type, unit, filterable, sort_order, active)
  SELECT 'Kafolat', 'warranty', 'NUMBER', 'oy', false, 4, true
  WHERE NOT EXISTS (SELECT 1 FROM attributes WHERE code='warranty');
INSERT INTO attributes (name, code, type, unit, filterable, sort_order, active)
  SELECT 'Ishlab chiqarilgan yil', 'production_year', 'NUMBER', NULL, false, 5, true
  WHERE NOT EXISTS (SELECT 1 FROM attributes WHERE code='production_year');
INSERT INTO attributes (name, code, type, unit, filterable, sort_order, active)
  SELECT 'Disk materiali', 'rim_material', 'SELECT', NULL, true, 6, true
  WHERE NOT EXISTS (SELECT 1 FROM attributes WHERE code='rim_material');
INSERT INTO attributes (name, code, type, unit, filterable, sort_order, active)
  SELECT 'Disk diametri', 'rim_diameter', 'SELECT', 'dyuym', true, 7, true
  WHERE NOT EXISTS (SELECT 1 FROM attributes WHERE code='rim_diameter');
INSERT INTO attributes (name, code, type, unit, filterable, sort_order, active)
  SELECT 'Krepej (PCD)', 'pcd', 'SELECT', NULL, true, 8, true
  WHERE NOT EXISTS (SELECT 1 FROM attributes WHERE code='pcd');

-- ─── Atribut variantlari ───
INSERT INTO attribute_options (attribute_id, value, sort_order, active)
  SELECT a.id, v.val, v.ord, true FROM attributes a,
    (VALUES ('Asfalt',0),('Universal',1),('Off-road',2)) AS v(val,ord)
  WHERE a.code='road_type'
    AND NOT EXISTS (SELECT 1 FROM attribute_options o WHERE o.attribute_id=a.id AND o.value=v.val);
INSERT INTO attribute_options (attribute_id, value, sort_order, active)
  SELECT a.id, v.val, v.ord, true FROM attributes a,
    (VALUES ('Simmetrik',0),('Asimmetrik',1),('Yo''nalishli',2)) AS v(val,ord)
  WHERE a.code='tread_type'
    AND NOT EXISTS (SELECT 1 FROM attribute_options o WHERE o.attribute_id=a.id AND o.value=v.val);
INSERT INTO attribute_options (attribute_id, value, sort_order, active)
  SELECT a.id, v.val, v.ord, true FROM attributes a,
    (VALUES ('Quyma (alyuminiy)',0),('Po''lat (shtamplangan)',1),('Kovanniy',2)) AS v(val,ord)
  WHERE a.code='rim_material'
    AND NOT EXISTS (SELECT 1 FROM attribute_options o WHERE o.attribute_id=a.id AND o.value=v.val);
INSERT INTO attribute_options (attribute_id, value, sort_order, active)
  SELECT a.id, v.val, v.ord, true FROM attributes a,
    (VALUES ('R14',0),('R15',1),('R16',2),('R17',3),('R18',4),('R19',5)) AS v(val,ord)
  WHERE a.code='rim_diameter'
    AND NOT EXISTS (SELECT 1 FROM attribute_options o WHERE o.attribute_id=a.id AND o.value=v.val);
INSERT INTO attribute_options (attribute_id, value, sort_order, active)
  SELECT a.id, v.val, v.ord, true FROM attributes a,
    (VALUES ('4x100',0),('5x112',1),('5x114.3',2),('5x120',3)) AS v(val,ord)
  WHERE a.code='pcd'
    AND NOT EXISTS (SELECT 1 FROM attribute_options o WHERE o.attribute_id=a.id AND o.value=v.val);

-- ─── Kategoriya-atribut bog'lanishlari ───
-- "Shinalar" root: barcha shina bolalariga meros bo'ladi
INSERT INTO category_attributes (category_id, attribute_id, required, sort_order)
  SELECT c.id, a.id, b.req, b.ord FROM categories c
  JOIN (VALUES ('road_type',true,0),('tread_type',false,1),('run_flat',false,2),
               ('studded',false,3),('warranty',false,4),('production_year',false,5)) AS b(code,req,ord) ON true
  JOIN attributes a ON a.code=b.code
  WHERE c.name='Shinalar'
    AND NOT EXISTS (SELECT 1 FROM category_attributes ca WHERE ca.category_id=c.id AND ca.attribute_id=a.id);
-- "Disklar" root
INSERT INTO category_attributes (category_id, attribute_id, required, sort_order)
  SELECT c.id, a.id, b.req, b.ord FROM categories c
  JOIN (VALUES ('rim_material',true,0),('rim_diameter',true,1),('pcd',false,2),('warranty',false,3)) AS b(code,req,ord) ON true
  JOIN attributes a ON a.code=b.code
  WHERE c.name='Disklar'
    AND NOT EXISTS (SELECT 1 FROM category_attributes ca WHERE ca.category_id=c.id AND ca.attribute_id=a.id);

-- ─── Demo mahsulotlarga atribut qiymatlari ───
-- SELECT qiymatlar (variant orqali)
INSERT INTO product_attribute_values (product_id, attribute_id, option_id)
  SELECT p.id, a.id, o.id FROM
    (VALUES
      ('MCH-205-55-R16-S','road_type','Asfalt'),
      ('MCH-205-55-R16-S','tread_type','Asimmetrik'),
      ('BRD-225-45-R17-W','road_type','Asfalt'),
      ('BRD-225-45-R17-W','tread_type','Yo''nalishli'),
      ('CNT-195-65-R15-A','road_type','Universal'),
      ('CNT-195-65-R15-A','tread_type','Simmetrik'),
      ('GDY-235-60-R18-S','road_type','Universal'),
      ('GDY-235-60-R18-S','tread_type','Asimmetrik'),
      ('PIR-255-50-R19-S','road_type','Asfalt'),
      ('PIR-255-50-R19-S','tread_type','Asimmetrik'),
      ('HNK-185-60-R14-S','road_type','Asfalt'),
      ('HNK-185-60-R14-S','tread_type','Simmetrik'),
      ('YKH-215-55-R17-W','road_type','Asfalt'),
      ('YKH-215-55-R17-W','tread_type','Yo''nalishli'),
      ('DLP-205-60-R16-A','road_type','Universal'),
      ('DLP-205-60-R16-A','tread_type','Simmetrik'),
      ('NKN-225-50-R17-W','road_type','Asfalt'),
      ('NKN-225-50-R17-W','tread_type','Yo''nalishli'),
      ('TYO-265-70-R17-S','road_type','Off-road'),
      ('TYO-265-70-R17-S','tread_type','Simmetrik'),
      ('MCH-ENS-1856515','road_type','Asfalt'),
      ('MCH-ENS-1856515','tread_type','Simmetrik'),
      ('BRD-TUR-2055516','road_type','Asfalt'),
      ('BRD-TUR-2055516','tread_type','Asimmetrik'),
      ('CNT-PC6-2255017','road_type','Asfalt'),
      ('CNT-PC6-2255017','tread_type','Asimmetrik'),
      ('GDY-EFG-1956015','road_type','Universal'),
      ('GDY-EFG-1956015','tread_type','Simmetrik'),
      ('HNK-VP3-2155516','road_type','Asfalt'),
      ('HNK-VP3-2155516','tread_type','Asimmetrik')
    ) AS t(sku, code, opt)
  JOIN products p ON p.sku=t.sku
  JOIN attributes a ON a.code=t.code
  JOIN attribute_options o ON o.attribute_id=a.id AND o.value=t.opt
  WHERE NOT EXISTS (SELECT 1 FROM product_attribute_values v WHERE v.product_id=p.id AND v.attribute_id=a.id);

-- BOOLEAN qiymatlar
INSERT INTO product_attribute_values (product_id, attribute_id, value_bool)
  SELECT p.id, a.id, t.val FROM
    (VALUES
      ('MCH-205-55-R16-S','run_flat',false),
      ('BRD-225-45-R17-W','run_flat',false),
      ('BRD-225-45-R17-W','studded',false),
      ('YKH-215-55-R17-W','studded',true),
      ('NKN-225-50-R17-W','studded',true),
      ('PIR-255-50-R19-S','run_flat',true),
      ('CNT-PC6-2255017','run_flat',true)
    ) AS t(sku, code, val)
  JOIN products p ON p.sku=t.sku
  JOIN attributes a ON a.code=t.code
  WHERE NOT EXISTS (SELECT 1 FROM product_attribute_values v WHERE v.product_id=p.id AND v.attribute_id=a.id);

-- NUMBER qiymatlar
INSERT INTO product_attribute_values (product_id, attribute_id, value_number)
  SELECT p.id, a.id, t.val FROM
    (VALUES
      ('MCH-205-55-R16-S','warranty',24),
      ('BRD-225-45-R17-W','warranty',24),
      ('CNT-195-65-R15-A','warranty',36),
      ('PIR-255-50-R19-S','warranty',24),
      ('MCH-ENS-1856515','warranty',36),
      ('BRD-TUR-2055516','warranty',24),
      ('MCH-205-55-R16-S','production_year',2025),
      ('BRD-225-45-R17-W','production_year',2025),
      ('CNT-195-65-R15-A','production_year',2024),
      ('MCH-ENS-1856515','production_year',2026),
      ('BRD-TUR-2055516','production_year',2025)
    ) AS t(sku, code, val)
  JOIN products p ON p.sku=t.sku
  JOIN attributes a ON a.code=t.code
  WHERE NOT EXISTS (SELECT 1 FROM product_attribute_values v WHERE v.product_id=p.id AND v.attribute_id=a.id);

-- ═══════════════ 7-QISM: UNIVERSAL MAGAZIN (idempotent) ═══════════════
-- Kategoriya shabloni: shina bo'limlari TIRE shablonini oladi (o'lcham
-- maydonlari faqat ularda ko'rinadi); aksessuar/disk — universal mahsulotlar.

UPDATE categories SET template='TIRE'
  WHERE name IN ('Shinalar', 'Sport / UHP shinalari', 'Elektromobil (EV) shinalari')
    AND template IS NULL;

-- ─── Universal (shinadan boshqa) demo mahsulotlar — aksessuarlar ───
INSERT INTO products (sku, name, category_id, purchase_price, selling_price, quantity, min_stock_level, description, active, created_by)
  SELECT 'AKS-DMK-2T', 'Gidravlik domkrat 2 tonna', (SELECT id FROM categories WHERE name='Ballon kalitlari va domkratlar'), 180000, 265000, 14, 4, 'Ixcham gidravlik domkrat — yengil avtomobillar uchun, 2t yuk ko''tarish.', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='AKS-DMK-2T');
INSERT INTO products (sku, name, category_id, purchase_price, selling_price, quantity, min_stock_level, description, active, created_by)
  SELECT 'AKS-BKL-KREST', 'Krestovina ballon kaliti 17/19/21/23', (SELECT id FROM categories WHERE name='Ballon kalitlari va domkratlar'), 55000, 89000, 26, 6, 'To''rt o''lchamli krestovina kalit — barcha mashhur gaykalar uchun.', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='AKS-BKL-KREST');
INSERT INTO products (sku, name, category_id, purchase_price, selling_price, quantity, min_stock_level, description, active, created_by)
  SELECT 'AKS-BOLT-M12', 'G''ildirak bolti M12x1.5 (20 dona)', (SELECT id FROM categories WHERE name='G''ildirak boltlari va gaykalari'), 60000, 95000, 40, 10, 'Xromlangan po''lat boltlar to''plami, konus o''tirg''ichli.', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='AKS-BOLT-M12');

-- Aksessuarlar root'iga "Kafolat" atributi
INSERT INTO category_attributes (category_id, attribute_id, required, sort_order)
  SELECT c.id, a.id, false, 0 FROM categories c JOIN attributes a ON a.code='warranty'
  WHERE c.name='Aksessuarlar'
    AND NOT EXISTS (SELECT 1 FROM category_attributes ca WHERE ca.category_id=c.id AND ca.attribute_id=a.id);

-- Aksessuar mahsulotlariga kafolat qiymatlari
INSERT INTO product_attribute_values (product_id, attribute_id, value_number)
  SELECT p.id, a.id, t.val FROM
    (VALUES ('AKS-DMK-2T', 12), ('AKS-BKL-KREST', 6)) AS t(sku, val)
  JOIN products p ON p.sku=t.sku
  JOIN attributes a ON a.code='warranty'
  WHERE NOT EXISTS (SELECT 1 FROM product_attribute_values v WHERE v.product_id=p.id AND v.attribute_id=a.id);
