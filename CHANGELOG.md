# O'zgarishlar tarixi (Changelog)

Format [Keep a Changelog](https://keepachangelog.com/) asosida; versiyalar [SemVer](https://semver.org/).
`release.yml` shu fayldagi `## [X.Y.Z]` bo'limidan reliz izohini oladi (`v*` teg push'da).

## [Unreleased]
### Added
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
