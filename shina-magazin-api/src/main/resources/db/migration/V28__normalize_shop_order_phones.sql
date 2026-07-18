-- Guest buyurtmalarni mijoz akkaunti bilan ishonchli bog'lash uchun telefonlarni
-- +998XXXXXXXXX ko'rinishiga keltiramiz. Boshqa xalqaro raqamlar o'zgarmaydi.
UPDATE shop_orders
SET customer_phone = CASE
    WHEN regexp_replace(customer_phone, '[^0-9]', '', 'g') ~ '^[0-9]{9}$'
        THEN '+998' || regexp_replace(customer_phone, '[^0-9]', '', 'g')
    WHEN regexp_replace(customer_phone, '[^0-9]', '', 'g') ~ '^0[0-9]{9}$'
        THEN '+998' || substring(regexp_replace(customer_phone, '[^0-9]', '', 'g') FROM 2)
    WHEN regexp_replace(customer_phone, '[^0-9]', '', 'g') ~ '^998[0-9]{9}$'
        THEN '+' || regexp_replace(customer_phone, '[^0-9]', '', 'g')
    ELSE customer_phone
END;
