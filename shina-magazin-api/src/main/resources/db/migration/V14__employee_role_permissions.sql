-- =====================================================
-- V14: Employee Role Management Permissions
-- =====================================================
-- Bu migration xodim rolini boshqarish uchun yangi
-- permissionlarni qo'shadi va MANAGER roliga beradi.
-- =====================================================

-- 1. Yangi permissionlarni qo'shish
INSERT INTO permissions (code, module, action, description) VALUES
('EMPLOYEES_CHANGE_ROLE', 'EMPLOYEES', 'CHANGE_ROLE', 'Xodim rolini o''zgartirish'),
('EMPLOYEES_MANAGE_ACCESS', 'EMPLOYEES', 'MANAGE_ACCESS', 'Xodim tizim akkountini boshqarish');

-- 2. MANAGER roliga yangi permissionlarni berish
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'MANAGER'
  AND p.code IN ('EMPLOYEES_CHANGE_ROLE', 'EMPLOYEES_MANAGE_ACCESS')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- 3. ADMIN roliga ham berish (agar mavjud bo'lmasa)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'ADMIN'
  AND p.code IN ('EMPLOYEES_CHANGE_ROLE', 'EMPLOYEES_MANAGE_ACCESS')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
