-- Shina Magazin ERP - Update User Passwords
-- V3: Regenerate password hashes for admin and seller users
-- Note: Passwords remain the same (admin123 and seller123), only hashes updated

UPDATE users
SET password = '$2a$10$h4XNLRahmAhbZNCzb732NeJ5x7CAdcQjVyQzh.fNAVhTnZtHHo62S'
WHERE username = 'admin';

UPDATE users
SET password = '$2a$10$3uG.0gYnRRucQteJq365LO8UpjZnOTenLWGH8H1gn6lTVxwqNUpre'
WHERE username = 'seller';
