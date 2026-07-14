-- Universal magazin: kategoriya "forma shabloni" — qaysi maxsus maydonlar
-- to'plami ko'rsatilishini belgilaydi. NULL = oddiy (universal) mahsulot,
-- 'TIRE' = shina o'lcham maydonlari (eni/profil/diametr, yuk/tezlik, mavsum).
-- Shablon bola kategoriyalarga meros bo'ladi (atributlar kabi).
ALTER TABLE categories ADD COLUMN template VARCHAR(20);

-- V2'da urug'langan bazaviy shina kategoriyalari shina shablonini oladi
UPDATE categories SET template = 'TIRE' WHERE name IN (
    'Yengil avtomobil shinalari',
    'SUV va Crossover shinalari',
    'Yuk mashinasi shinalari',
    'Mototsikl shinalari'
);
