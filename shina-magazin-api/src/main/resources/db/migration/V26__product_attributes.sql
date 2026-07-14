-- Faza 6: Internet-magazin katalogi — xususiyatlar (atributlar) shajarasi.
-- Kategoriya daraxti + kategoriyaga bog'langan (merosxo'r) atributlar +
-- mahsulot atribut qiymatlari (Wildberries uslubidagi filtr/xususiyat tizimi).

-- Kategoriya daraxti uchun qo'shimcha maydonlar
ALTER TABLE categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE categories ADD COLUMN icon VARCHAR(50);

-- Atribut ta'riflari (masalan: "Yo'l turi", "RunFlat", "Kafolat muddati")
CREATE TABLE attributes (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(60) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL, -- TEXT | NUMBER | SELECT | MULTI_SELECT | BOOLEAN
    unit VARCHAR(20),
    filterable BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

-- SELECT / MULTI_SELECT atributlar uchun tanlov variantlari
CREATE TABLE attribute_options (
    id BIGSERIAL PRIMARY KEY,
    attribute_id BIGINT NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
    value VARCHAR(120) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0,
    CONSTRAINT uq_attribute_option UNIQUE (attribute_id, value)
);

CREATE INDEX idx_attribute_options_attribute ON attribute_options(attribute_id);

-- Kategoriya <-> atribut bog'lanishi (bola kategoriyalar ota atributlarini meros oladi)
CREATE TABLE category_attributes (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    attribute_id BIGINT NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
    required BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0,
    CONSTRAINT uq_category_attribute UNIQUE (category_id, attribute_id)
);

CREATE INDEX idx_category_attributes_category ON category_attributes(category_id);
CREATE INDEX idx_category_attributes_attribute ON category_attributes(attribute_id);

-- Mahsulotning atribut qiymatlari (MULTI_SELECT -> bir atributga bir nechta qator)
CREATE TABLE product_attribute_values (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    attribute_id BIGINT NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
    option_id BIGINT REFERENCES attribute_options(id) ON DELETE CASCADE,
    value_text VARCHAR(500),
    value_number DECIMAL(15, 3),
    value_bool BOOLEAN,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE INDEX idx_pav_product ON product_attribute_values(product_id);
CREATE INDEX idx_pav_attribute ON product_attribute_values(attribute_id);
CREATE INDEX idx_pav_option ON product_attribute_values(option_id);
