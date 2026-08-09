-- Xodimlikka ro'yxatdan o'tish so'rovlari.
--
-- Ilgari `/admin/register` sahifasi MAKET edi: forma to'ldirilardi, "so'rov
-- qabul qilindi" deb yozilardi va hech qayerga hech narsa yuborilmasdi
-- (frontend'da setTimeout, backendda esa mos endpoint umuman yo'q edi).
-- Ya'ni ro'yxatdan o'tgan odam hech qachon kelmaydigan javobni kutib
-- o'tirardi. Bu jadval o'sha so'rovlarni haqiqatan saqlaydi.
--
-- Tasdiqlangach xodim yozuvi va foydalanuvchi akkaunti yaratiladi
-- (`UserService.createUserForEmployee` — mavjud oqim qayta ishlatiladi),
-- shuning uchun bu yerda parol yoki rol jadvallari takrorlanmaydi.

CREATE TABLE IF NOT EXISTS staff_registration_requests (
    id             BIGSERIAL PRIMARY KEY,
    full_name      VARCHAR(150) NOT NULL,
    phone          VARCHAR(20)  NOT NULL,
    company_name   VARCHAR(200),
    -- So'rovchi TAKLIF qilgan rol. Yakuniy qarorni xodim qabul qiladi —
    -- tasdiqlashda boshqa rol tanlashi mumkin.
    requested_role VARCHAR(30)  NOT NULL,
    note           VARCHAR(500),
    status         VARCHAR(20)  NOT NULL DEFAULT 'PENDING',

    -- Kim va qachon ko'rib chiqdi
    reviewed_by    BIGINT,
    reviewed_at    TIMESTAMP,
    reject_reason  VARCHAR(500),
    -- Tasdiqlangach yaratilgan xodim (rad etilganda NULL)
    employee_id    BIGINT,

    -- Ommaviy endpoint: kim yuborganini keyin tekshirish uchun
    client_ip      VARCHAR(45),

    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP,
    version        BIGINT DEFAULT 0,

    CONSTRAINT fk_staff_reg_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id),
    CONSTRAINT fk_staff_reg_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Bitta raqamdan bir vaqtda faqat BITTA kutilayotgan so'rov.
--
-- Aks holda tugmani qayta-qayta bosgan odam (yoki skript) o'nlab bir xil
-- so'rov yaratib, xodimlarning navbatini to'ldirib yuborardi. Ko'rib
-- chiqilgandan keyin esa yangi so'rov yuborish mumkin — masalan rad etilgan
-- odam ma'lumotlarini to'g'rilab qayta murojaat qilishi kerak.
CREATE UNIQUE INDEX IF NOT EXISTS ux_staff_reg_pending_phone
    ON staff_registration_requests (phone) WHERE status = 'PENDING';

-- Adminka ro'yxati: kutilayotganlar birinchi, yangilari yuqorida
CREATE INDEX IF NOT EXISTS idx_staff_reg_status_created
    ON staff_registration_requests (status, created_at DESC);
