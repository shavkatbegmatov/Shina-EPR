-- Refresh tokenni sessiyaga bog'lash (rotation + reuse-detection).
--
-- Ilgari refresh tokenlar server tomonida HECH QAYERDA saqlanmasdi: logout,
-- admin revoke, hatto parol almashtirish ham qo'ldagi 7 kunlik refresh
-- tokenni o'ldirmasdi — har refresh yana yangi 7 kunlik berar, kirish
-- amalda cheksiz uzayardi (faqat active=false uzardi).
--
-- Endi sessiya qatori refresh token hashini ham saqlaydi:
--   * refresh faqat TIRIK sessiya bilan ishlaydi — barcha mavjud revocation
--     yo'llari (logout, parol almashtirish, deaktivatsiya, admin revoke)
--     refresh tokenni ham avtomatik o'ldiradi;
--   * har refresh'da ikkala token ham ROTATSIYA qilinadi (eski refresh hash
--     previous_* ga ko'chadi);
--   * previous hash bilan kelgan so'rov = qayta ishlatish (o'g'irlangan
--     token belgisi) — butun sessiya bekor qilinadi.
--
-- Eski qatorlarda NULL qoladi: ularning refresh tokenlari baribir hech
-- qachon ishlamagan (732fdf1 gacha refresh o'lik edi).

ALTER TABLE sessions ADD COLUMN refresh_token_hash VARCHAR(64);
ALTER TABLE sessions ADD COLUMN previous_refresh_token_hash VARCHAR(64);

CREATE INDEX idx_sessions_refresh_token_hash ON sessions(refresh_token_hash);
CREATE INDEX idx_sessions_prev_refresh_hash ON sessions(previous_refresh_token_hash);
