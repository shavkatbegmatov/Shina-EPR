-- Shina Magazin ERP - RBAC Seed Data
-- V11: Insert permissions and default system roles

-- =====================================================
-- PERMISSIONS (55 total)
-- =====================================================

-- DASHBOARD module (1 permission)
INSERT INTO permissions (code, module, action, description) VALUES
('DASHBOARD_VIEW', 'DASHBOARD', 'VIEW', 'Dashboard sahifasini ko''rish');

-- PRODUCTS module (4 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('PRODUCTS_VIEW', 'PRODUCTS', 'VIEW', 'Mahsulotlarni ko''rish'),
('PRODUCTS_CREATE', 'PRODUCTS', 'CREATE', 'Yangi mahsulot qo''shish'),
('PRODUCTS_UPDATE', 'PRODUCTS', 'UPDATE', 'Mahsulotni tahrirlash'),
('PRODUCTS_DELETE', 'PRODUCTS', 'DELETE', 'Mahsulotni o''chirish');

-- BRANDS module (4 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('BRANDS_VIEW', 'BRANDS', 'VIEW', 'Brendlarni ko''rish'),
('BRANDS_CREATE', 'BRANDS', 'CREATE', 'Yangi brend qo''shish'),
('BRANDS_UPDATE', 'BRANDS', 'UPDATE', 'Brendni tahrirlash'),
('BRANDS_DELETE', 'BRANDS', 'DELETE', 'Brendni o''chirish');

-- CATEGORIES module (4 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('CATEGORIES_VIEW', 'CATEGORIES', 'VIEW', 'Kategoriyalarni ko''rish'),
('CATEGORIES_CREATE', 'CATEGORIES', 'CREATE', 'Yangi kategoriya qo''shish'),
('CATEGORIES_UPDATE', 'CATEGORIES', 'UPDATE', 'Kategoriyani tahrirlash'),
('CATEGORIES_DELETE', 'CATEGORIES', 'DELETE', 'Kategoriyani o''chirish');

-- SALES module (5 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('SALES_VIEW', 'SALES', 'VIEW', 'Sotuvlarni ko''rish'),
('SALES_CREATE', 'SALES', 'CREATE', 'Yangi sotuv yaratish'),
('SALES_UPDATE', 'SALES', 'UPDATE', 'Sotuvni tahrirlash'),
('SALES_DELETE', 'SALES', 'DELETE', 'Sotuvni o''chirish'),
('SALES_REFUND', 'SALES', 'REFUND', 'Sotuvni qaytarish');

-- CUSTOMERS module (4 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('CUSTOMERS_VIEW', 'CUSTOMERS', 'VIEW', 'Mijozlarni ko''rish'),
('CUSTOMERS_CREATE', 'CUSTOMERS', 'CREATE', 'Yangi mijoz qo''shish'),
('CUSTOMERS_UPDATE', 'CUSTOMERS', 'UPDATE', 'Mijozni tahrirlash'),
('CUSTOMERS_DELETE', 'CUSTOMERS', 'DELETE', 'Mijozni o''chirish');

-- DEBTS module (5 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('DEBTS_VIEW', 'DEBTS', 'VIEW', 'Qarzlarni ko''rish'),
('DEBTS_CREATE', 'DEBTS', 'CREATE', 'Yangi qarz yaratish'),
('DEBTS_UPDATE', 'DEBTS', 'UPDATE', 'Qarzni tahrirlash'),
('DEBTS_DELETE', 'DEBTS', 'DELETE', 'Qarzni o''chirish'),
('DEBTS_PAY', 'DEBTS', 'PAY', 'Qarzni to''lash');

-- WAREHOUSE module (5 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('WAREHOUSE_VIEW', 'WAREHOUSE', 'VIEW', 'Omborni ko''rish'),
('WAREHOUSE_CREATE', 'WAREHOUSE', 'CREATE', 'Omborga qo''shish'),
('WAREHOUSE_UPDATE', 'WAREHOUSE', 'UPDATE', 'Ombor tahrirlash'),
('WAREHOUSE_DELETE', 'WAREHOUSE', 'DELETE', 'Ombordan o''chirish'),
('WAREHOUSE_ADJUST', 'WAREHOUSE', 'ADJUST', 'Ombor zaxirasini tuzatish');

-- SUPPLIERS module (4 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('SUPPLIERS_VIEW', 'SUPPLIERS', 'VIEW', 'Ta''minotchilarni ko''rish'),
('SUPPLIERS_CREATE', 'SUPPLIERS', 'CREATE', 'Yangi ta''minotchi qo''shish'),
('SUPPLIERS_UPDATE', 'SUPPLIERS', 'UPDATE', 'Ta''minotchini tahrirlash'),
('SUPPLIERS_DELETE', 'SUPPLIERS', 'DELETE', 'Ta''minotchini o''chirish');

-- PURCHASES module (6 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('PURCHASES_VIEW', 'PURCHASES', 'VIEW', 'Xaridlarni ko''rish'),
('PURCHASES_CREATE', 'PURCHASES', 'CREATE', 'Yangi xarid yaratish'),
('PURCHASES_UPDATE', 'PURCHASES', 'UPDATE', 'Xaridni tahrirlash'),
('PURCHASES_DELETE', 'PURCHASES', 'DELETE', 'Xaridni o''chirish'),
('PURCHASES_RECEIVE', 'PURCHASES', 'RECEIVE', 'Xaridni qabul qilish'),
('PURCHASES_RETURN', 'PURCHASES', 'RETURN', 'Xaridni qaytarish');

-- REPORTS module (4 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('REPORTS_VIEW_SALES', 'REPORTS', 'VIEW_SALES', 'Sotuv hisobotlarini ko''rish'),
('REPORTS_VIEW_WAREHOUSE', 'REPORTS', 'VIEW_WAREHOUSE', 'Ombor hisobotlarini ko''rish'),
('REPORTS_VIEW_DEBTS', 'REPORTS', 'VIEW_DEBTS', 'Qarz hisobotlarini ko''rish'),
('REPORTS_EXPORT', 'REPORTS', 'EXPORT', 'Hisobotlarni eksport qilish');

-- EMPLOYEES module (4 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('EMPLOYEES_VIEW', 'EMPLOYEES', 'VIEW', 'Xodimlarni ko''rish'),
('EMPLOYEES_CREATE', 'EMPLOYEES', 'CREATE', 'Yangi xodim qo''shish'),
('EMPLOYEES_UPDATE', 'EMPLOYEES', 'UPDATE', 'Xodimni tahrirlash'),
('EMPLOYEES_DELETE', 'EMPLOYEES', 'DELETE', 'Xodimni o''chirish');

-- USERS module (5 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('USERS_VIEW', 'USERS', 'VIEW', 'Foydalanuvchilarni ko''rish'),
('USERS_CREATE', 'USERS', 'CREATE', 'Yangi foydalanuvchi yaratish'),
('USERS_UPDATE', 'USERS', 'UPDATE', 'Foydalanuvchini tahrirlash'),
('USERS_DELETE', 'USERS', 'DELETE', 'Foydalanuvchini o''chirish'),
('USERS_CHANGE_ROLE', 'USERS', 'CHANGE_ROLE', 'Foydalanuvchi rolini o''zgartirish');

-- SETTINGS module (2 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('SETTINGS_VIEW', 'SETTINGS', 'VIEW', 'Sozlamalarni ko''rish'),
('SETTINGS_UPDATE', 'SETTINGS', 'UPDATE', 'Sozlamalarni o''zgartirish');

-- NOTIFICATIONS module (2 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('NOTIFICATIONS_VIEW', 'NOTIFICATIONS', 'VIEW', 'Bildirishnomalarni ko''rish'),
('NOTIFICATIONS_MANAGE', 'NOTIFICATIONS', 'MANAGE', 'Bildirishnomalarni boshqarish');

-- ROLES module (4 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('ROLES_VIEW', 'ROLES', 'VIEW', 'Rollarni ko''rish'),
('ROLES_CREATE', 'ROLES', 'CREATE', 'Yangi rol yaratish'),
('ROLES_UPDATE', 'ROLES', 'UPDATE', 'Rolni tahrirlash'),
('ROLES_DELETE', 'ROLES', 'DELETE', 'Rolni o''chirish');

-- =====================================================
-- SYSTEM ROLES (3 default roles)
-- =====================================================

-- ADMIN role (full access)
INSERT INTO roles (name, code, description, is_system) VALUES
('Administrator', 'ADMIN', 'Tizimga to''liq kirish huquqi. Barcha modullar va amaliyotlarga ruxsat.', true);

-- MANAGER role (management access)
INSERT INTO roles (name, code, description, is_system) VALUES
('Menejer', 'MANAGER', 'Boshqaruv huquqlari. Ko''pchilik operatsiyalar, hisobotlar va asosiy funksiyalarga kirish.', true);

-- SELLER role (sales access)
INSERT INTO roles (name, code, description, is_system) VALUES
('Sotuvchi', 'SELLER', 'Sotuv huquqlari. Kassada ishlash, mijozlar bilan muomala va asosiy ko''rish huquqlari.', true);

-- =====================================================
-- ROLE-PERMISSION MAPPINGS
-- =====================================================

-- ADMIN role gets ALL permissions (55 permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE code = 'ADMIN'),
    id
FROM permissions;

-- MANAGER role permissions (35 permissions)
-- Dashboard
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MANAGER'), id FROM permissions WHERE code = 'DASHBOARD_VIEW';

-- Products (VIEW, CREATE, UPDATE - no DELETE)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MANAGER'), id FROM permissions WHERE code IN ('PRODUCTS_VIEW', 'PRODUCTS_CREATE', 'PRODUCTS_UPDATE');

-- Brands (VIEW, CREATE, UPDATE - no DELETE)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MANAGER'), id FROM permissions WHERE code IN ('BRANDS_VIEW', 'BRANDS_CREATE', 'BRANDS_UPDATE');

-- Categories (VIEW, CREATE, UPDATE - no DELETE)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MANAGER'), id FROM permissions WHERE code IN ('CATEGORIES_VIEW', 'CATEGORIES_CREATE', 'CATEGORIES_UPDATE');

-- Sales (all including REFUND)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MANAGER'), id FROM permissions WHERE module = 'SALES';

-- Customers (all)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MANAGER'), id FROM permissions WHERE module = 'CUSTOMERS';

-- Debts (all)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MANAGER'), id FROM permissions WHERE module = 'DEBTS';

-- Warehouse (VIEW, CREATE, UPDATE, ADJUST - no DELETE)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MANAGER'), id FROM permissions WHERE code IN ('WAREHOUSE_VIEW', 'WAREHOUSE_CREATE', 'WAREHOUSE_UPDATE', 'WAREHOUSE_ADJUST');

-- Suppliers (VIEW, CREATE, UPDATE - no DELETE)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MANAGER'), id FROM permissions WHERE code IN ('SUPPLIERS_VIEW', 'SUPPLIERS_CREATE', 'SUPPLIERS_UPDATE');

-- Purchases (VIEW, CREATE, UPDATE, RECEIVE, RETURN - no DELETE)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MANAGER'), id FROM permissions WHERE code IN ('PURCHASES_VIEW', 'PURCHASES_CREATE', 'PURCHASES_UPDATE', 'PURCHASES_RECEIVE', 'PURCHASES_RETURN');

-- Reports (all)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MANAGER'), id FROM permissions WHERE module = 'REPORTS';

-- Notifications (VIEW only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MANAGER'), id FROM permissions WHERE code = 'NOTIFICATIONS_VIEW';

-- SELLER role permissions (15 permissions)
-- Dashboard
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'SELLER'), id FROM permissions WHERE code = 'DASHBOARD_VIEW';

-- Products (VIEW only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'SELLER'), id FROM permissions WHERE code = 'PRODUCTS_VIEW';

-- Brands (VIEW only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'SELLER'), id FROM permissions WHERE code = 'BRANDS_VIEW';

-- Categories (VIEW only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'SELLER'), id FROM permissions WHERE code = 'CATEGORIES_VIEW';

-- Sales (VIEW, CREATE)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'SELLER'), id FROM permissions WHERE code IN ('SALES_VIEW', 'SALES_CREATE');

-- Customers (VIEW, CREATE, UPDATE)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'SELLER'), id FROM permissions WHERE code IN ('CUSTOMERS_VIEW', 'CUSTOMERS_CREATE', 'CUSTOMERS_UPDATE');

-- Debts (VIEW, PAY)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'SELLER'), id FROM permissions WHERE code IN ('DEBTS_VIEW', 'DEBTS_PAY');

-- Warehouse (VIEW only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'SELLER'), id FROM permissions WHERE code = 'WAREHOUSE_VIEW';

-- Notifications (VIEW only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'SELLER'), id FROM permissions WHERE code = 'NOTIFICATIONS_VIEW';
