#!/bin/sh
# Konteyner ILDIZ (root) sifatida boshlanadi, lekin ilova `app` foydalanuvchisi
# bilan ishlaydi.
#
# Nega shunday: /data/uploads persistent volume'i ilgari root bilan yaratilgan.
# Dockerfile'da shunchaki USER app deb qo'yilsa, mavjud prod volume'ga yozib
# bo'lmay qolardi va rasm yuklash sinardi. Shuning uchun egalik har startda shu
# yerda to'g'rilanadi, so'ng imtiyoz su-exec bilan tushiriladi.
set -e

UPLOAD_DIR="${SHOP_STORAGE_DIR:-/data/uploads}"

if [ "$(id -u)" = "0" ]; then
    mkdir -p "$UPLOAD_DIR"
    chown -R app:app "$UPLOAD_DIR"
    exec su-exec app "$@"
fi

exec "$@"
