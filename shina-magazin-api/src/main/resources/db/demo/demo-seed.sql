-- Protektor curated demo dataset v2.0.
-- The service sets protektor.demo_user_id for the authenticated operator.
-- Statements use @@ because PostgreSQL blocks may contain regular semicolons.

INSERT INTO categories (name, description, active)
SELECT v.name, v.description, true
FROM (VALUES
    ('Yengil avtomobil shinalari', 'Barcha yengil avtomobillar uchun shinalar'),
    ('SUV va Crossover shinalari', 'SUV va crossover avtomobillar uchun'),
    ('Yuk mashinasi shinalari', 'Yuk mashinalari va furgonlar uchun')
) AS v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = v.name)
@@

INSERT INTO brands (name, country, active)
SELECT v.name, v.country, true
FROM (VALUES
    ('ApexDrive', 'Yevropa'),
    ('Nordway', 'Finlandiya'),
    ('TerraGrip', 'AQSH'),
    ('Veloce', 'Italiya'),
    ('CargoMax', 'Germaniya'),
    ('EcoMotion', 'Janubiy Koreya')
) AS v(name, country)
WHERE NOT EXISTS (SELECT 1 FROM brands b WHERE b.name = v.name)
@@

WITH catalog(brand_name, category_name, sku, name, width, profile, diameter,
             load_index, speed_rating, season, purchase_price, selling_price,
             quantity, min_stock, description, image_url) AS (
    VALUES
    ('ApexDrive','Yengil avtomobil shinalari','DEMO-APX-SER-1856515','ApexDrive Serenity 185/65 R15',185,65,15,'88','H','SUMMER',520000::numeric,760000::numeric,34,8,'Tejamkor va sokin shahar shinasi. Nam yo''lda barqaror tormozlanish.','/products/demo/passenger-summer.webp'),
    ('ApexDrive','Yengil avtomobil shinalari','DEMO-APX-TRP-2055516','ApexDrive Touring Pro 205/55 R16',205,55,16,'91','V','ALL_SEASON',710000::numeric,990000::numeric,22,6,'Kundalik safarlar uchun komfort, uzoq yurum va past shovqin muvozanati.','/products/demo/passenger-summer.webp'),
    ('ApexDrive','Yengil avtomobil shinalari','DEMO-APX-VEC-2354518','ApexDrive Vector EV 235/45 R18',235,45,18,'98','W','ALL_SEASON',1190000::numeric,1690000::numeric,11,4,'Elektromobil og''irligi va yuqori momenti uchun kuchaytirilgan karkas.','/products/demo/ev-touring.webp'),
    ('Nordway','Yengil avtomobil shinalari','DEMO-NDW-ICE-2055516','Nordway IceCore X 205/55 R16',205,55,16,'94','T','WINTER',680000::numeric,960000::numeric,7,6,'Qor va muzda ishlaydigan zich lamellar, sovuqda elastik rezina.','/products/demo/winter.webp'),
    ('Nordway','Yengil avtomobil shinalari','DEMO-NDW-FRS-2255017','Nordway FrostLine 225/50 R17',225,50,17,'98','T','WINTER',920000::numeric,1290000::numeric,3,5,'Qishki magistral uchun yo''nalishli protektor va suv chiqarish kanallari.','/products/demo/winter.webp'),
    ('TerraGrip','SUV va Crossover shinalari','DEMO-TRG-TAT-2656517','TerraGrip Trail AT 265/65 R17',265,65,17,'112','T','ALL_SEASON',1280000::numeric,1790000::numeric,9,4,'Tosh, shag''al va asfalt uchun agressiv all-terrain protektor.','/products/demo/suv-all-terrain.webp'),
    ('TerraGrip','SUV va Crossover shinalari','DEMO-TRG-SMT-2356018','TerraGrip Summit HT 235/60 R18',235,60,18,'107','V','ALL_SEASON',1210000::numeric,1680000::numeric,13,5,'SUV uchun mustahkam yon devor va avtomagistralda sokin yurish.','/products/demo/suv-all-terrain.webp'),
    ('Veloce','Yengil avtomobil shinalari','DEMO-VLC-RSP-2454019','Veloce R-Sport 245/40 R19',245,40,19,'98','Y','SUMMER',1540000::numeric,2180000::numeric,6,3,'Sport sedanlar uchun aniq rul javobi va yuqori tezlik barqarorligi.','/products/demo/sport-uhp.webp'),
    ('Veloce','Yengil avtomobil shinalari','DEMO-VLC-TRK-2553520','Veloce TrackOne 255/35 R20',255,35,20,'97','Y','SUMMER',1980000::numeric,2790000::numeric,2,4,'Flagman UHP model: quruq asfaltda maksimal tutashuv.','/products/demo/sport-uhp.webp'),
    ('CargoMax','Yuk mashinasi shinalari','DEMO-CGM-C8-1957015','CargoMax C8 195/70 R15C',195,70,15,'104','R','SUMMER',830000::numeric,1160000::numeric,18,6,'Yengil tijorat transporti uchun yuqori yuk indeksi va uzoq yurum.','/products/demo/commercial.webp'),
    ('CargoMax','Yuk mashinasi shinalari','DEMO-CGM-TRN-2257015','CargoMax TransitPro 225/70 R15C',225,70,15,'112','S','ALL_SEASON',980000::numeric,1370000::numeric,12,5,'Furgonlar uchun kuchaytirilgan karkas va barqaror magistral protektori.','/products/demo/commercial.webp'),
    ('EcoMotion','Yengil avtomobil shinalari','DEMO-ECM-SIL-2155518','EcoMotion Silent EV 215/55 R18',215,55,18,'95','V','ALL_SEASON',1090000::numeric,1520000::numeric,15,5,'Past yumalash qarshiligi va elektromobil saloni uchun minimal shovqin.','/products/demo/ev-touring.webp')
)
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter,
                      load_index, speed_rating, season, purchase_price, selling_price,
                      quantity, min_stock_level, description, image_url, active, created_by)
SELECT c.sku, c.name, b.id, category.id, c.width, c.profile, c.diameter,
       c.load_index, c.speed_rating, c.season, c.purchase_price, c.selling_price,
       c.quantity, c.min_stock, c.description, c.image_url, true,
       current_setting('protektor.demo_user_id')::bigint
FROM catalog c
JOIN brands b ON b.name = c.brand_name
JOIN categories category ON category.name = c.category_name
@@

INSERT INTO customers (full_name, phone, address, company_name, customer_type,
                       balance, notes, active, portal_enabled, preferred_language, created_by)
VALUES
('Azizbek Rahmonov', '+998000100001', 'Toshkent sh., Chilonzor tumani', NULL, 'INDIVIDUAL', 0, '[PROTEKTOR_DEMO]', true, false, 'uz', current_setting('protektor.demo_user_id')::bigint),
('Madina Yusupova', '+998000100002', 'Toshkent sh., Yunusobod tumani', NULL, 'INDIVIDUAL', 0, '[PROTEKTOR_DEMO]', true, false, 'uz', current_setting('protektor.demo_user_id')::bigint),
('Sardor Bekmurodov', '+998000100003', 'Samarqand sh., Universitet ko''chasi', NULL, 'INDIVIDUAL', 0, '[PROTEKTOR_DEMO]', true, false, 'uz', current_setting('protektor.demo_user_id')::bigint),
('Dilnoza Karimova', '+998000100004', 'Toshkent sh., Mirobod tumani', NULL, 'INDIVIDUAL', 0, '[PROTEKTOR_DEMO]', true, false, 'ru', current_setting('protektor.demo_user_id')::bigint),
('Orient Logistics MCHJ', '+998000100005', 'Toshkent sh., Sergeli tumani', 'Orient Logistics MCHJ', 'BUSINESS', 0, '[PROTEKTOR_DEMO]', true, false, 'uz', current_setting('protektor.demo_user_id')::bigint),
('City Taxi Park', '+998000100006', 'Toshkent sh., Yashnobod tumani', 'City Taxi Park MCHJ', 'BUSINESS', 0, '[PROTEKTOR_DEMO]', true, false, 'uz', current_setting('protektor.demo_user_id')::bigint),
('Farruh Ismoilov', '+998000100007', 'Buxoro sh., G''ijduvon ko''chasi', NULL, 'INDIVIDUAL', 0, '[PROTEKTOR_DEMO]', true, false, 'uz', current_setting('protektor.demo_user_id')::bigint),
('Zarafshon Servis', '+998000100008', 'Navoiy sh., Sanoat hududi', 'Zarafshon Servis MCHJ', 'BUSINESS', 0, '[PROTEKTOR_DEMO]', true, false, 'ru', current_setting('protektor.demo_user_id')::bigint)
@@

INSERT INTO suppliers (name, contact_person, phone, email, address, balance, notes, active)
VALUES
('Atlas Tyre Supply', 'Komil Nazarov', '+998000300001', 'sales@atlas-demo.uz', 'Toshkent sh., Bektemir tumani', 0, '[PROTEKTOR_DEMO]', true),
('Nordic Rubber Trade', 'Malika Oripova', '+998000300002', 'order@nordic-demo.uz', 'Toshkent sh., Yakkasaroy tumani', 0, '[PROTEKTOR_DEMO]', true),
('Central Auto Import', 'Temur Aliyev', '+998000300003', 'info@central-demo.uz', 'Toshkent sh., Olmazor tumani', 0, '[PROTEKTOR_DEMO]', true)
@@

INSERT INTO employees (full_name, phone, email, position, department, salary, hire_date, status)
VALUES
('Jasur Qodirov', '+998000200001', 'jasur@demo.protektor.uz', 'Savdo menejeri', 'Savdo', 8500000, CURRENT_DATE - 620, 'ACTIVE'),
('Nodira Saidova', '+998000200002', 'nodira@demo.protektor.uz', 'Kassir', 'Savdo', 5200000, CURRENT_DATE - 310, 'ACTIVE'),
('Bekzod To''rayev', '+998000200003', 'bekzod@demo.protektor.uz', 'Ombor mudiri', 'Ombor', 6800000, CURRENT_DATE - 480, 'ACTIVE'),
('Kamola Ergasheva', '+998000200004', 'kamola@demo.protektor.uz', 'Buxgalter', 'Moliya', 7200000, CURRENT_DATE - 390, 'ON_LEAVE')
@@

CREATE TEMP TABLE IF NOT EXISTS protektor_demo_sale_plan (
    invoice_number VARCHAR(30) PRIMARY KEY,
    customer_phone VARCHAR(20),
    sku VARCHAR(50) NOT NULL,
    day_offset INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    paid_ratio NUMERIC(4,2) NOT NULL
) ON COMMIT DROP
@@

TRUNCATE protektor_demo_sale_plan
@@

INSERT INTO protektor_demo_sale_plan VALUES
('DEMO-S-001','+998000100001','DEMO-APX-SER-1856515',1,2,'CASH',1.00),
('DEMO-S-002','+998000100002','DEMO-APX-TRP-2055516',3,4,'CARD',1.00),
('DEMO-S-003','+998000100005','DEMO-CGM-C8-1957015',7,6,'TRANSFER',0.50),
('DEMO-S-004','+998000100003','DEMO-NDW-ICE-2055516',12,2,'CASH',1.00),
('DEMO-S-005','+998000100006','DEMO-ECM-SIL-2155518',18,8,'TRANSFER',0.70),
('DEMO-S-006','+998000100004','DEMO-VLC-RSP-2454019',24,2,'CARD',1.00),
('DEMO-S-007','+998000100007','DEMO-TRG-SMT-2356018',31,4,'MIXED',0.40),
('DEMO-S-008','+998000100008','DEMO-TRG-TAT-2656517',38,8,'TRANSFER',1.00),
('DEMO-S-009','+998000100001','DEMO-APX-VEC-2354518',46,2,'CARD',0.00),
('DEMO-S-010','+998000100002','DEMO-NDW-FRS-2255017',54,4,'CASH',1.00),
('DEMO-S-011','+998000100005','DEMO-CGM-TRN-2257015',63,10,'TRANSFER',0.60),
('DEMO-S-012','+998000100006','DEMO-VLC-TRK-2553520',72,4,'TRANSFER',1.00)
@@

INSERT INTO sales (invoice_number, customer_id, sale_date, subtotal, discount_amount,
                   discount_percent, total_amount, paid_amount, debt_amount,
                   payment_method, payment_status, status, notes, created_by, created_at)
SELECT plan.invoice_number, customer.id,
       CURRENT_DATE - plan.day_offset + TIME '11:30',
       product.selling_price * plan.quantity, 0, 0,
       product.selling_price * plan.quantity,
       product.selling_price * plan.quantity * plan.paid_ratio,
       product.selling_price * plan.quantity * (1 - plan.paid_ratio),
       plan.payment_method,
       CASE WHEN plan.paid_ratio = 1 THEN 'PAID'
            WHEN plan.paid_ratio = 0 THEN 'UNPAID' ELSE 'PARTIAL' END,
       'COMPLETED', '[PROTEKTOR_DEMO]',
       current_setting('protektor.demo_user_id')::bigint,
       CURRENT_DATE - plan.day_offset + TIME '11:30'
FROM protektor_demo_sale_plan plan
JOIN customers customer ON customer.phone = plan.customer_phone
JOIN products product ON product.sku = plan.sku
@@

INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount,
                        total_price, cost_price, created_at)
SELECT sale.id, product.id, plan.quantity, product.selling_price, 0,
       product.selling_price * plan.quantity, product.purchase_price,
       sale.sale_date
FROM protektor_demo_sale_plan plan
JOIN sales sale ON sale.invoice_number = plan.invoice_number
JOIN products product ON product.sku = plan.sku
@@

INSERT INTO payments (sale_id, customer_id, amount, method, payment_type,
                      notes, payment_date, received_by, created_at)
SELECT sale.id, sale.customer_id, sale.paid_amount, sale.payment_method,
       'SALE_PAYMENT', '[PROTEKTOR_DEMO]', sale.sale_date,
       current_setting('protektor.demo_user_id')::bigint, sale.sale_date
FROM sales sale
WHERE sale.invoice_number LIKE 'DEMO-S-%' AND sale.paid_amount > 0
@@

INSERT INTO debts (customer_id, sale_id, original_amount, remaining_amount,
                   due_date, status, notes, created_at)
SELECT sale.customer_id, sale.id, sale.debt_amount, sale.debt_amount,
       sale.sale_date::date + 14,
       CASE WHEN sale.sale_date::date + 14 < CURRENT_DATE THEN 'OVERDUE' ELSE 'ACTIVE' END,
       '[PROTEKTOR_DEMO]', sale.sale_date
FROM sales sale
WHERE sale.invoice_number LIKE 'DEMO-S-%' AND sale.debt_amount > 0
@@

UPDATE customers customer
SET balance = -COALESCE((
    SELECT SUM(debt.remaining_amount)
    FROM debts debt
    WHERE debt.customer_id = customer.id AND debt.status <> 'PAID'
), 0)
WHERE customer.notes = '[PROTEKTOR_DEMO]'
@@

INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock,
                             new_stock, reference_type, notes, created_by, created_at)
SELECT product.id, 'IN', product.quantity, 0, product.quantity,
       'PROTEKTOR_DEMO', 'Demo boshlang''ich ombor qoldig''i',
       current_setting('protektor.demo_user_id')::bigint,
       CURRENT_DATE - 80 + TIME '09:00'
FROM products product
WHERE product.sku LIKE 'DEMO-%'
@@

CREATE TEMP TABLE IF NOT EXISTS protektor_demo_purchase_plan (
    order_number VARCHAR(30) PRIMARY KEY,
    supplier_name VARCHAR(200) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    day_offset INTEGER NOT NULL,
    ordered_quantity INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    paid_ratio NUMERIC(4,2) NOT NULL
) ON COMMIT DROP
@@

TRUNCATE protektor_demo_purchase_plan
@@

INSERT INTO protektor_demo_purchase_plan VALUES
('DEMO-P-001','Atlas Tyre Supply','DEMO-APX-TRP-2055516',64,40,'RECEIVED',1.00),
('DEMO-P-002','Nordic Rubber Trade','DEMO-NDW-ICE-2055516',41,30,'RECEIVED',0.50),
('DEMO-P-003','Central Auto Import','DEMO-TRG-TAT-2656517',18,20,'PARTIAL',0.30),
('DEMO-P-004','Atlas Tyre Supply','DEMO-ECM-SIL-2155518',4,24,'ORDERED',0.00)
@@

INSERT INTO purchase_orders (order_number, supplier_id, order_date, expected_date,
                             received_date, due_date, total_amount, paid_amount,
                             status, payment_status, notes, created_by, created_at)
SELECT plan.order_number, supplier.id, CURRENT_DATE - plan.day_offset,
       CURRENT_DATE - plan.day_offset + 7,
       CASE WHEN plan.status IN ('RECEIVED','PARTIAL')
            THEN CURRENT_DATE - plan.day_offset + 6 ELSE NULL END,
       CURRENT_DATE - plan.day_offset + 30,
       product.purchase_price * plan.ordered_quantity,
       product.purchase_price * plan.ordered_quantity * plan.paid_ratio,
       plan.status,
       CASE WHEN plan.paid_ratio = 1 THEN 'PAID'
            WHEN plan.paid_ratio = 0 THEN 'UNPAID' ELSE 'PARTIAL' END,
       '[PROTEKTOR_DEMO]', current_setting('protektor.demo_user_id')::bigint,
       CURRENT_DATE - plan.day_offset + TIME '10:15'
FROM protektor_demo_purchase_plan plan
JOIN suppliers supplier ON supplier.name = plan.supplier_name
JOIN products product ON product.sku = plan.sku
@@

INSERT INTO purchase_order_items (purchase_order_id, product_id, ordered_quantity,
                                  received_quantity, unit_price, total_price, created_at)
SELECT purchase.id, product.id, plan.ordered_quantity,
       CASE WHEN plan.status = 'RECEIVED' THEN plan.ordered_quantity
            WHEN plan.status = 'PARTIAL' THEN plan.ordered_quantity / 2 ELSE 0 END,
       product.purchase_price, product.purchase_price * plan.ordered_quantity,
       purchase.created_at
FROM protektor_demo_purchase_plan plan
JOIN purchase_orders purchase ON purchase.order_number = plan.order_number
JOIN products product ON product.sku = plan.sku
@@

INSERT INTO purchase_payments (purchase_order_id, amount, payment_date,
                               payment_method, notes, received_by, created_at)
SELECT purchase.id, purchase.paid_amount, purchase.order_date + 2,
       'TRANSFER', '[PROTEKTOR_DEMO]',
       current_setting('protektor.demo_user_id')::bigint,
       purchase.order_date + TIME '14:00'
FROM purchase_orders purchase
WHERE purchase.order_number LIKE 'DEMO-P-%' AND purchase.paid_amount > 0
@@

UPDATE suppliers supplier
SET balance = -COALESCE((
    SELECT SUM(purchase.total_amount - purchase.paid_amount)
    FROM purchase_orders purchase
    WHERE purchase.supplier_id = supplier.id
      AND purchase.status IN ('RECEIVED','PARTIAL','ORDERED')
), 0)
WHERE supplier.notes = '[PROTEKTOR_DEMO]'
@@

CREATE TEMP TABLE IF NOT EXISTS protektor_demo_shop_plan (
    order_no VARCHAR(30) PRIMARY KEY,
    customer_phone VARCHAR(20) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    day_offset INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    delivery_method VARCHAR(20) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    payment_status VARCHAR(20) NOT NULL
) ON COMMIT DROP
@@

TRUNCATE protektor_demo_shop_plan
@@

INSERT INTO protektor_demo_shop_plan VALUES
('DEMO-W-001','+998000100004','DEMO-APX-SER-1856515',0,4,'NEW','DELIVERY','CASH','PENDING'),
('DEMO-W-002','+998000100007','DEMO-NDW-ICE-2055516',1,2,'CONFIRMED','PICKUP','CARD','PAID'),
('DEMO-W-003','+998000100006','DEMO-ECM-SIL-2155518',3,4,'CONFIRMED','DELIVERY','PAYME','PAID'),
('DEMO-W-004','+998000100002','DEMO-VLC-RSP-2454019',9,2,'COMPLETED','PICKUP','CLICK','PAID'),
('DEMO-W-005','+998000100008','DEMO-CGM-TRN-2257015',16,8,'COMPLETED','DELIVERY','CASH','PAID')
@@

INSERT INTO shop_orders (order_no, customer_name, customer_phone, customer_email,
                         delivery_method, delivery_address, payment_method,
                         subtotal, delivery_fee, total_amount, status,
                         payment_status, customer_id, created_at)
SELECT plan.order_no, customer.full_name, customer.phone, NULL,
       plan.delivery_method,
       CASE WHEN plan.delivery_method = 'DELIVERY' THEN customer.address ELSE NULL END,
       plan.payment_method, product.selling_price * plan.quantity,
       CASE WHEN plan.delivery_method = 'DELIVERY' THEN 50000 ELSE 0 END,
       product.selling_price * plan.quantity
           + CASE WHEN plan.delivery_method = 'DELIVERY' THEN 50000 ELSE 0 END,
       plan.status, plan.payment_status, customer.id,
       CURRENT_DATE - plan.day_offset + TIME '16:20'
FROM protektor_demo_shop_plan plan
JOIN customers customer ON customer.phone = plan.customer_phone
JOIN products product ON product.sku = plan.sku
@@

INSERT INTO shop_order_items (order_id, product_id, product_name, size_string,
                              quantity, unit_price, total_price, created_at)
SELECT shop.id, product.id, product.name,
       product.width || '/' || product.profile || ' R' || product.diameter,
       plan.quantity, product.selling_price,
       product.selling_price * plan.quantity, shop.created_at
FROM protektor_demo_shop_plan plan
JOIN shop_orders shop ON shop.order_no = plan.order_no
JOIN products product ON product.sku = plan.sku
@@

INSERT INTO expenses (expense_date, category, amount, description,
                      payment_method, created_by, created_at)
VALUES
(CURRENT_DATE - 2, 'MARKETING', 1250000, '[PROTEKTOR_DEMO] Ijtimoiy tarmoq reklamasi', 'CARD', current_setting('protektor.demo_user_id')::bigint, CURRENT_DATE - 2 + TIME '09:20'),
(CURRENT_DATE - 7, 'UTILITIES', 860000, '[PROTEKTOR_DEMO] Elektr va internet to''lovi', 'TRANSFER', current_setting('protektor.demo_user_id')::bigint, CURRENT_DATE - 7 + TIME '12:00'),
(CURRENT_DATE - 14, 'TRANSPORT', 640000, '[PROTEKTOR_DEMO] Omborga yetkazib berish', 'CASH', current_setting('protektor.demo_user_id')::bigint, CURRENT_DATE - 14 + TIME '15:30'),
(CURRENT_DATE - 21, 'SUPPLIES', 285000, '[PROTEKTOR_DEMO] Qadoqlash va kanselyariya', 'CASH', current_setting('protektor.demo_user_id')::bigint, CURRENT_DATE - 21 + TIME '11:10'),
(CURRENT_DATE - 29, 'MAINTENANCE', 1900000, '[PROTEKTOR_DEMO] Balansirovka uskunasi servisi', 'TRANSFER', current_setting('protektor.demo_user_id')::bigint, CURRENT_DATE - 29 + TIME '10:00'),
(CURRENT_DATE - 36, 'RENT', 8500000, '[PROTEKTOR_DEMO] Savdo zali va ombor ijarasi', 'TRANSFER', current_setting('protektor.demo_user_id')::bigint, CURRENT_DATE - 36 + TIME '09:00')
@@

INSERT INTO staff_notifications (user_id, title, message, notification_type,
                                 is_read, reference_type, reference_id, created_at)
VALUES
(NULL, 'Yangi demo buyurtma', 'Storefront orqali yangi buyurtma keldi.', 'ORDER', false, 'DEMO_DATA', (SELECT id FROM shop_orders WHERE order_no = 'DEMO-W-001'), CURRENT_TIMESTAMP - INTERVAL '25 minutes'),
(NULL, 'Kam qoldiq', 'Veloce TrackOne 255/35 R20 zaxirasi minimumdan past.', 'WARNING', false, 'DEMO_DATA', (SELECT id FROM products WHERE sku = 'DEMO-VLC-TRK-2553520'), CURRENT_TIMESTAMP - INTERVAL '2 hours'),
(NULL, 'Qarz muddati o''tgan', 'Demo mijozlarda nazorat talab qiladigan qarzlar bor.', 'WARNING', false, 'DEMO_DATA', NULL, CURRENT_TIMESTAMP - INTERVAL '5 hours')
@@

INSERT INTO customer_notifications (customer_id, title_uz, title_ru, message_uz,
                                    message_ru, notification_type, is_read,
                                    created_at, metadata)
SELECT id, 'Buyurtmangiz tasdiqlandi', 'Ваш заказ подтверждён',
       'Protektor buyurtmangizni tayyorlamoqda.',
       'Protektor готовит ваш заказ.', 'SYSTEM', false,
       CURRENT_TIMESTAMP - INTERVAL '1 hour', '{"demo":true}'::jsonb
FROM customers
WHERE phone = '+998000100004'
@@

INSERT INTO app_settings (setting_key, setting_value, description)
VALUES ('DEMO_DATA_VERSION', '2.0', 'Boshqariladigan demo dataset versiyasi')
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP
@@

INSERT INTO app_settings (setting_key, setting_value, description)
VALUES ('DEMO_DATA_GENERATED_AT', to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS'),
        'Demo dataset oxirgi yaratilgan vaqt')
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP
@@
