-- Shina Magazin ERP - Seed Data
-- V2: Initial data

-- Default admin user (password: admin123)
INSERT INTO users (username, password, full_name, email, phone, role, active)
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.rSKmBnYLvNKJbLK/Wa', 'Administrator', 'admin@shinamagazin.uz', '+998901234567', 'ADMIN', true);

-- Sample seller user (password: seller123)
INSERT INTO users (username, password, full_name, email, phone, role, active)
VALUES ('seller', '$2a$10$rDkPvvAFV8kqwvKJzwlHMOuHxfxXe7hZ/ZBUZfFMEfUYNVByWaJHi', 'Sotuvchi', 'seller@shinamagazin.uz', '+998901234568', 'SELLER', true);

-- Sample brands
INSERT INTO brands (name, country, active) VALUES
('Michelin', 'Fransiya', true),
('Bridgestone', 'Yaponiya', true),
('Continental', 'Germaniya', true),
('Goodyear', 'AQSH', true),
('Pirelli', 'Italiya', true),
('Hankook', 'Janubiy Koreya', true),
('Yokohama', 'Yaponiya', true),
('Dunlop', 'Buyuk Britaniya', true),
('Nokian', 'Finlandiya', true),
('Toyo', 'Yaponiya', true);

-- Sample categories
INSERT INTO categories (name, description, parent_id, active) VALUES
('Yengil avtomobil shinalari', 'Barcha yengil avtomobillar uchun shinalar', NULL, true),
('SUV va Crossover shinalari', 'SUV va crossover avtomobillar uchun', NULL, true),
('Yuk mashinasi shinalari', 'Yuk mashinalari va furgonlar uchun', NULL, true),
('Mototsikl shinalari', 'Mototsikllar uchun shinalar', NULL, true);

-- Sample products
INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, active, created_by) VALUES
('MCH-205-55-R16-S', 'Michelin Primacy 4 205/55 R16', 1, 1, 205, 55, 16, '91', 'V', 'SUMMER', 800000, 1200000, 20, 5, true, 1),
('BRD-225-45-R17-W', 'Bridgestone Blizzak 225/45 R17', 2, 1, 225, 45, 17, '94', 'H', 'WINTER', 1100000, 1500000, 15, 5, true, 1),
('CNT-195-65-R15-A', 'Continental AllSeasonContact 195/65 R15', 3, 1, 195, 65, 15, '91', 'T', 'ALL_SEASON', 700000, 1000000, 30, 10, true, 1),
('GDY-235-60-R18-S', 'Goodyear Eagle F1 235/60 R18', 4, 2, 235, 60, 18, '103', 'W', 'SUMMER', 1200000, 1800000, 10, 5, true, 1),
('PIR-255-50-R19-S', 'Pirelli Scorpion Verde 255/50 R19', 5, 2, 255, 50, 19, '107', 'Y', 'SUMMER', 1400000, 2000000, 8, 3, true, 1),
('HNK-185-60-R14-S', 'Hankook Kinergy Eco 185/60 R14', 6, 1, 185, 60, 14, '82', 'H', 'SUMMER', 450000, 650000, 25, 10, true, 1),
('YKH-215-55-R17-W', 'Yokohama IceGuard 215/55 R17', 7, 1, 215, 55, 17, '94', 'T', 'WINTER', 900000, 1300000, 12, 5, true, 1),
('DLP-205-60-R16-A', 'Dunlop Sport All Season 205/60 R16', 8, 1, 205, 60, 16, '96', 'V', 'ALL_SEASON', 750000, 1100000, 18, 5, true, 1),
('NKN-225-50-R17-W', 'Nokian Hakkapeliitta R5 225/50 R17', 9, 1, 225, 50, 17, '98', 'R', 'WINTER', 1300000, 1900000, 6, 3, true, 1),
('TYO-265-70-R17-S', 'Toyo Open Country A/T 265/70 R17', 10, 2, 265, 70, 17, '115', 'T', 'ALL_SEASON', 1000000, 1450000, 14, 5, true, 1);

-- Sample customers
INSERT INTO customers (full_name, phone, phone2, address, customer_type, balance, active, created_by) VALUES
('Alisher Karimov', '+998901112233', NULL, 'Toshkent sh., Chilonzor tumani', 'INDIVIDUAL', 0, true, 1),
('Bobur Rahimov', '+998902223344', '+998712223344', 'Toshkent sh., Yunusobod tumani', 'INDIVIDUAL', -500000, true, 1),
('Avtotrans MCHJ', '+998903334455', NULL, 'Toshkent sh., Sergeli tumani, Sanoat ko''chasi 15', 'BUSINESS', -2000000, true, 1),
('Dilshod Toshmatov', '+998904445566', NULL, 'Samarqand sh., Registon ko''chasi', 'INDIVIDUAL', 0, true, 1),
('Logistika Plus', '+998905556677', '+998715556677', 'Buxoro sh., Markaziy ko''cha 50', 'BUSINESS', 0, true, 1);

-- Sample suppliers
INSERT INTO suppliers (name, contact_person, phone, email, address, balance, active) VALUES
('Michelin O''zbekiston', 'Sardor Nazarov', '+998901001010', 'info@michelin.uz', 'Toshkent sh., Mirzo Ulug''bek tumani', 0, true),
('Bridge Auto Import', 'Jahongir Umarov', '+998902002020', 'sales@bridgeauto.uz', 'Toshkent sh., Yakkasaroy tumani', -5000000, true),
('Continental Central Asia', 'Olim Karimov', '+998903003030', 'order@continental-ca.com', 'Toshkent sh., Shayxontohur tumani', 0, true);
