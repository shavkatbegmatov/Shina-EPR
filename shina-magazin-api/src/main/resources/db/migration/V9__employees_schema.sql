-- Xodimlar jadvali (Employee Management)
CREATE TABLE employees (
    id BIGSERIAL PRIMARY KEY,

    -- Asosiy maydonlar
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    position VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    salary DECIMAL(15, 2),
    hire_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    -- Kengaytirilgan maydonlar
    birth_date DATE,
    passport_number VARCHAR(20),
    address VARCHAR(300),
    bank_account_number VARCHAR(30),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),

    -- User bilan bog'lanish (login uchun)
    user_id BIGINT UNIQUE REFERENCES users(id),

    -- Audit maydonlar
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

-- Indexlar
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_phone ON employees(phone);
CREATE INDEX idx_employees_user ON employees(user_id);

COMMENT ON TABLE employees IS 'Xodimlar jadvali - HR boshqaruvi';
COMMENT ON COLUMN employees.status IS 'ACTIVE, ON_LEAVE, TERMINATED';
