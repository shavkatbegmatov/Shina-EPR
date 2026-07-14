# O'zgarishlar tarixi (Changelog)

Format [Keep a Changelog](https://keepachangelog.com/) asosida; versiyalar [SemVer](https://semver.org/).
`release.yml` shu fayldagi `## [X.Y.Z]` bo'limidan reliz izohini oladi (`v*` teg push'da).

## [Unreleased]
### Added
- Katalog xususiyatlar shajarasi (WB-uslub): kategoriya daraxti (icon/tartib, subtree filtri) + atributlar (SELECT/MULTI_SELECT/NUMBER/BOOLEAN/TEXT, variantlar) + kategoriya-atribut merosi + mahsulot atribut qiymatlari (V26). Admin: Kategoriyalar/Xususiyatlar/Brendlar sahifalari, mahsulot formasida dinamik xususiyatlar (majburiylik nazorati), guruhlangan sidebar. Ommaviy API: `GET /v1/catalog/facets` (kategoriya daraxti + narx diapazoni + variant hisoblagichli filtrlar) va `GET /v1/catalog?attrs=attrId:optId,...;...&priceMin&priceMax&inStock` filtrlash.
- Vitrina katalogida WB-uslub filtr paneli: kategoriya daraxti (subtree hisoblagichlar), narx diapazoni, "faqat sotuvda borlar", atribut facetlari — server tomonda filtrlash (URL'da ulashiladigan `cat/pmin/pmax/stock/attrs` paramlar), mobilda drawer, backend yo'q bo'lsa demo-rejimga graceful qaytish. PDP xususiyatlar jadvalida kategoriya atributlari.
- Storefront mijoz akkaunti (telefon+PIN, buyurtma tarixi backend'dan) — Faza 6.
- Mijoz kabineti birlashuvi: `/hisob` (yagona login `/kirish`, ERP xaridlar + do'kon buyurtmalari) — D1.
- Buyurtma xabarnoma poydevori (email SMTP + SMS-stub, config-gated) — F7.
- Mahsulot rasm yuklash (lokal-FS storage + Coolify volume) — B4/C5.
- Storefront SEO: OG/Twitter meta + og-cover + sitemap/robots — B3.
- Coolify deploy: docker-compose + Dockerfile/nginx + `application-prod.yml` + CI/CD (ghcr + webhook) + `DEPLOY.md`.

### Changed
- Routing: do'kon ildizda (`/`), ERP `/admin`da — B2.

### Notes
- Jonli to'lov (Payme/Click), SMS provider (Eskiz) impl va deploy kreditsiallari — A-guruhi (`DEPLOY.md`).
