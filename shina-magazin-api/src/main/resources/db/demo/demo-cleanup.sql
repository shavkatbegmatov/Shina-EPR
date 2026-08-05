-- Protektor demo dataset cleanup.
-- Every destructive predicate is restricted to an explicit demo marker or reserved ID.
-- Statements use a custom delimiter because PostgreSQL blocks may contain regular semicolons.

CREATE TEMP TABLE IF NOT EXISTS protektor_demo_affected_customers (
    id BIGINT PRIMARY KEY
) ON COMMIT DROP
@@

TRUNCATE protektor_demo_affected_customers
@@

INSERT INTO protektor_demo_affected_customers (id)
SELECT DISTINCT customer_id
FROM debts
WHERE customer_id IS NOT NULL
  AND (notes IN ('[PROTEKTOR_DEMO]', '[demo]')
       OR sale_id IN (
           SELECT id FROM sales
           WHERE invoice_number LIKE 'DEMO-S-%' OR invoice_number LIKE 'DS-%'
       ))
ON CONFLICT DO NOTHING
@@

CREATE TEMP TABLE IF NOT EXISTS protektor_demo_affected_suppliers (
    id BIGINT PRIMARY KEY
) ON COMMIT DROP
@@

TRUNCATE protektor_demo_affected_suppliers
@@

INSERT INTO protektor_demo_affected_suppliers (id)
SELECT DISTINCT supplier_id
FROM purchase_orders
WHERE order_number LIKE 'DEMO-P-%' OR order_number LIKE 'DPO-%'
ON CONFLICT DO NOTHING
@@

DELETE FROM staff_notifications
WHERE reference_type = 'DEMO_DATA'
   OR (reference_type = 'ORDER' AND reference_id IN (
       SELECT id FROM shop_orders
       WHERE order_no LIKE 'DEMO-W-%' OR order_no LIKE 'DWEB-%'
   ))
   OR (reference_type = 'SALE' AND reference_id IN (
       SELECT id FROM sales
       WHERE invoice_number LIKE 'DEMO-S-%' OR invoice_number LIKE 'DS-%'
   ))
   OR (reference_type = 'PRODUCT' AND reference_id IN (
       SELECT id FROM products
       WHERE sku LIKE 'DEMO-%'
          OR sku IN ('MCH-ENS-1856515','BRD-TUR-2055516','CNT-PC6-2255017',
                     'GDY-EFG-1956015','HNK-VP3-2155516','KMH-ES31-1956515',
                     'YKH-BEGT-2056016','NKN-ND8-2055516','TYO-CAS2-2156016',
                     'SLN-AZE-2055516','MCH-LTC-2356018','BRD-DHP-2355519',
                     'CNT-CLX2-2457016','PIR-SCW-2555518','NKN-OAT-2656517',
                     'TYO-PST-2855020','CNT-VAN2-1957015','BRD-DR660-2056516',
                     'TRI-TR652-2257015','MCH-PR4-1207017','BRD-BT-1805517',
                     'DLP-SS-1606017','PIR-PZ-2454019','MCH-PS4S-2553520',
                     'CNT-SC7-2354018','HNK-ION-2354518','AKS-DMK-2T',
                     'AKS-BKL-KREST','AKS-BOLT-M12')
   ))
@@

DELETE FROM customer_notifications
WHERE metadata @> '{"demo":true}'::jsonb
   OR customer_id IN (
       SELECT id FROM customers
       WHERE notes = '[PROTEKTOR_DEMO]' OR phone LIKE '+9989300100%'
   )
@@

DELETE FROM sale_returns
WHERE sale_id IN (
    SELECT id FROM sales
    WHERE invoice_number LIKE 'DEMO-S-%' OR invoice_number LIKE 'DS-%'
)
@@

DELETE FROM payments
WHERE notes IN ('[PROTEKTOR_DEMO]', '[demo]')
   OR sale_id IN (
       SELECT id FROM sales
       WHERE invoice_number LIKE 'DEMO-S-%' OR invoice_number LIKE 'DS-%'
   )
   OR customer_id IN (
       SELECT id FROM customers WHERE notes = '[PROTEKTOR_DEMO]'
   )
@@

DELETE FROM debts
WHERE notes IN ('[PROTEKTOR_DEMO]', '[demo]')
   OR sale_id IN (
       SELECT id FROM sales
       WHERE invoice_number LIKE 'DEMO-S-%' OR invoice_number LIKE 'DS-%'
   )
   OR customer_id IN (
       SELECT id FROM customers WHERE notes = '[PROTEKTOR_DEMO]'
   )
@@

DELETE FROM sales
WHERE invoice_number LIKE 'DEMO-S-%' OR invoice_number LIKE 'DS-%'
@@

DELETE FROM purchase_payments
WHERE notes IN ('[PROTEKTOR_DEMO]', '[demo]')
   OR purchase_order_id IN (
       SELECT id FROM purchase_orders
       WHERE order_number LIKE 'DEMO-P-%' OR order_number LIKE 'DPO-%'
   )
@@

DELETE FROM purchase_returns
WHERE return_number LIKE 'DEMO-R-%' OR return_number LIKE 'DRET-%'
   OR purchase_order_id IN (
       SELECT id FROM purchase_orders
       WHERE order_number LIKE 'DEMO-P-%' OR order_number LIKE 'DPO-%'
   )
@@

DELETE FROM purchase_orders
WHERE order_number LIKE 'DEMO-P-%' OR order_number LIKE 'DPO-%'
@@

DELETE FROM shop_orders
WHERE order_no LIKE 'DEMO-W-%' OR order_no LIKE 'DWEB-%'
@@

DELETE FROM expenses
WHERE description LIKE '[PROTEKTOR_DEMO]%'
@@

DELETE FROM stock_movements
WHERE reference_type IN ('PROTEKTOR_DEMO', 'DEMO_SEED')
   OR product_id IN (
       SELECT id FROM products WHERE sku LIKE 'DEMO-%'
   )
@@

UPDATE customers c
SET balance = -COALESCE((
    SELECT SUM(d.remaining_amount)
    FROM debts d
    WHERE d.customer_id = c.id AND d.status <> 'PAID'
), 0)
WHERE c.id IN (SELECT id FROM protektor_demo_affected_customers)
@@

UPDATE suppliers s
SET balance = -COALESCE((
    SELECT SUM(po.total_amount - po.paid_amount)
    FROM purchase_orders po
    WHERE po.supplier_id = s.id
      AND po.status IN ('RECEIVED', 'PARTIAL', 'ORDERED')
), 0)
WHERE s.id IN (SELECT id FROM protektor_demo_affected_suppliers)
@@

DELETE FROM customers
WHERE notes = '[PROTEKTOR_DEMO]' OR phone LIKE '+9989300100%'
@@

DELETE FROM products
WHERE sku LIKE 'DEMO-%'
   OR sku IN ('MCH-ENS-1856515','BRD-TUR-2055516','CNT-PC6-2255017',
              'GDY-EFG-1956015','HNK-VP3-2155516','KMH-ES31-1956515',
              'YKH-BEGT-2056016','NKN-ND8-2055516','TYO-CAS2-2156016',
              'SLN-AZE-2055516','MCH-LTC-2356018','BRD-DHP-2355519',
              'CNT-CLX2-2457016','PIR-SCW-2555518','NKN-OAT-2656517',
              'TYO-PST-2855020','CNT-VAN2-1957015','BRD-DR660-2056516',
              'TRI-TR652-2257015','MCH-PR4-1207017','BRD-BT-1805517',
              'DLP-SS-1606017','PIR-PZ-2454019','MCH-PS4S-2553520',
              'CNT-SC7-2354018','HNK-ION-2354518','AKS-DMK-2T',
              'AKS-BKL-KREST','AKS-BOLT-M12')
@@

DELETE FROM suppliers
WHERE notes = '[PROTEKTOR_DEMO]'
   OR name IN ('Silk Road Tyres MCHJ','Asia Rubber Import',
               'Premium Wheels Distribution','Kumho Uzbekistan',
               'Global Tyre Trade')
@@

DELETE FROM employees
WHERE phone LIKE '+9980002%' OR phone LIKE '+9989099000%'
@@

DELETE FROM brands b
WHERE b.name IN ('ApexDrive','Nordway','TerraGrip','Veloce','CargoMax','EcoMotion',
                 'Kumho','Sailun','Triangle')
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.brand_id = b.id)
@@

-- Former demo logins had a public shared password. Keep referential history,
-- but revoke access when an old database is cleaned.
UPDATE users
SET active = false, must_change_password = true
WHERE (username = 'menejer' AND phone = '+998911002020')
   OR (username = 'kassir' AND phone = '+998911002021')
@@

DELETE FROM app_settings
WHERE setting_key IN ('DEMO_DATA_VERSION', 'DEMO_DATA_GENERATED_AT', 'DEMO_SEED_VERSION')
@@
