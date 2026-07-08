# =====================================================================
# seed-demo.ps1 — Protektor demo ma'lumotlarini (qayta) yuklash (DEV)
# =====================================================================
# Nima qiladi: db/demo/R__demo_data.sql ni lokal dev bazasiga qo'llaydi.
# Tranzaksion ma'lumot (sotuv/xarid/qarz/onlayn buyurtma) CURRENT_DATE ga
# nisbatan QAYTA generatsiya qilinadi — shu sabab dashboard grafiklari
# har doim "bugungi" ko'rinadi. Prezentatsiyadan oldin ishga tushiring.
#
# Ishlatish (PowerShell):
#   ./scripts/seed-demo.ps1
#
# Eslatma: bu FAQAT dev bazaga ta'sir qiladi; prod (Coolify) demo'ni
# umuman ko'rmaydi (application-dev.yml gina db/demo ni yuklaydi).
# Muqobil: backend'ni qayta ishga tushirish (mvn spring-boot:run) —
# Flyway R__demo_data ni birinchi marta o'zi qo'llaydi.
# =====================================================================

$ErrorActionPreference = 'Stop'

$DbHost = if ($env:DB_HOST) { $env:DB_HOST } else { 'localhost' }
$DbName = if ($env:DB_NAME) { $env:DB_NAME } else { 'shina_epr_db' }
$DbUser = if ($env:DB_USERNAME) { $env:DB_USERNAME } else { 'shina_epr_user' }
$DbPass = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { 'f3300955#F123456' }

$repoRoot = Split-Path -Parent $PSScriptRoot
$sqlFile = Join-Path $repoRoot 'shina-magazin-api/src/main/resources/db/demo/R__demo_data.sql'
if (-not (Test-Path $sqlFile)) { Write-Error "Topilmadi: $sqlFile"; exit 1 }

# psql ni topish: PATH, so'ng standart PostgreSQL o'rnatish papkalari
$psql = (Get-Command psql -ErrorAction SilentlyContinue).Source
if (-not $psql) {
  $cand = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\psql.exe' -ErrorAction SilentlyContinue |
          Sort-Object FullName -Descending | Select-Object -First 1
  if ($cand) { $psql = $cand.FullName }
}
if (-not $psql) {
  Write-Host "psql topilmadi. Muqobil: backend'ni qayta ishga tushiring —" -ForegroundColor Yellow
  Write-Host "  cd shina-magazin-api; ./mvnw spring-boot:run" -ForegroundColor Yellow
  Write-Host "Flyway R__demo_data.sql ni avtomatik qo'llaydi (dev profil)." -ForegroundColor Yellow
  exit 1
}

Write-Host "psql: $psql"
Write-Host "Baza: $DbUser@$DbHost/$DbName"
Write-Host "Demo ma'lumot yuklanmoqda (CURRENT_DATE ga qayta generatsiya)..." -ForegroundColor Cyan

$env:PGPASSWORD = $DbPass
$env:PGCLIENTENCODING = 'UTF8'
& $psql -h $DbHost -U $DbUser -d $DbName -v ON_ERROR_STOP=1 -f "$sqlFile"
$code = $LASTEXITCODE
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

if ($code -eq 0) {
  Write-Host "`n✓ Demo ma'lumot muvaffaqiyatli yuklandi. Dashboard endi 'bugungi' ko'rinadi." -ForegroundColor Green
} else {
  Write-Error "psql xato bilan tugadi (kod $code)."
  exit $code
}
