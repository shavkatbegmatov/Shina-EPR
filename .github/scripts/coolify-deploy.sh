#!/usr/bin/env bash
#
# Coolify'ga deploy: trigger → holatni kuzatish → kerak bo'lsa QAYTA URINISH.
#
# Nega kerak: Coolify har deploy'da repozitoriyni klon qiladi (compose faylni
# o'qish uchun). Serverning GitHub bilan aloqasi vaqti-vaqti bilan uziladi
# ("RPC failed; curl 56 Recv failure: Connection reset by peer") va deploy
# "Failed to read the Docker Compose file" bilan yiqiladi. Konteynerlar esa
# Exited holatda qolib, PROD TUSHIB QOLADI. Qayta urinish har safar ishlagan —
# ya'ni bu odam bosishi kerak bo'lgan tugma, avtomatlashtirilishi mumkin.
#
# Ilgari bu qadam webhook'ni chaqirib, javobni kutmasdan yashil bo'lardi:
# deploy yiqilsa ham CI muvaffaqiyatli ko'rinardi va hech kim bilmasdi.
#
# Talab qilinadigan muhit o'zgaruvchilari:
#   COOLIFY_WEBHOOK_URL  — .../api/v1/deploy?uuid=<resurs-uuid>
#   COOLIFY_API_TOKEN    — Bearer token
# Ixtiyoriy:
#   HEALTH_URL           — deploy'dan keyin 200 qaytarishi kutiladigan manzil
#   MAX_ATTEMPTS         — umumiy urinishlar soni (default 3)
#   POLL_INTERVAL        — holatni so'rash oralig'i, sekund (default 15)
#   DEPLOY_TIMEOUT       — bitta urinish uchun chegara, sekund (default 900)
#   HEALTH_TIMEOUT       — sog'liq tekshiruvi chegarasi, sekund (default 300)

set -uo pipefail

WEBHOOK_URL="${COOLIFY_WEBHOOK_URL:?COOLIFY_WEBHOOK_URL kerak}"
API_TOKEN="${COOLIFY_API_TOKEN:?COOLIFY_API_TOKEN kerak}"
HEALTH_URL="${HEALTH_URL:-}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-3}"
POLL_INTERVAL="${POLL_INTERVAL:-15}"
DEPLOY_TIMEOUT="${DEPLOY_TIMEOUT:-900}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-300}"
# Raw-compose resurs uchun: deploy'dan OLDIN repodagi compose faylni Coolify'ga
# yuboradi (PATCH docker_compose_raw). Shunda server repozitoriyni klon qilmaydi —
# compose manbasi baribir git (bu fayl), Coolify esa faqat nusxasini saqlaydi.
# Git'dan o'qiydigan resursda o'chiq qoladi (default false).
SYNC_COMPOSE="${SYNC_COMPOSE:-false}"
COMPOSE_FILE="${COMPOSE_FILE:-infra/coolify/docker-compose.yml}"

# Jurnal STDERR'ga: `trigger_deploy` o'z natijasini (deployment_uuid) stdout
# orqali qaytaradi, shuning uchun stdout toza qolishi SHART. Aks holda
# keyinchalik qo'shilgan bitta log qatori uuid'ni buzib qo'yardi.
log() { printf '%s %s\n' "$(date -u +%H:%M:%S)" "$*" >&2; }

# https://host:port/api/v1/deploy?uuid=... → https://host:port
api_base() {
  printf '%s' "$WEBHOOK_URL" | sed -E 's#^(https?://[^/]+).*#\1#'
}

curl_api() {
  curl -fsS --max-time 30 -H "Authorization: Bearer $API_TOKEN" "$@"
}

# Oxirgi aniq xato sababi — job oxirida ANNOTATSIYA bo'lib chiqadi. Actions
# logini faqat repo a'zosi ocha oladi, annotatsiya esa run sahifasida ko'rinadi:
# "exit code 1" o'rniga "HTTP 401" yoki "ulanib bo'lmadi" deb aytish kerak.
# `trigger_deploy` buyruq-almashtirish ichida (subshell) chaqiriladi, ya'ni
# undagi o'zgaruvchi asosiy jarayonga YETIB KELMAYDI — sabab fayl orqali
# uzatiladi.
LAST_ERROR=""
ERR_FILE="$(mktemp)"
trap 'rm -f "$ERR_FILE"' EXIT

fail_annotation() {
  local why="$1"
  # DIQQAT: apostrof ${x:-...} ichida bash parserini buzadi — matn oldindan tayyorlanadi.
  [[ -n "$why" ]] || why="sabab aniqlanmadi"
  printf '::error title=Coolify deploy::%s\n' "$why"
}

# Deploy'ni boshlaydi. Muvaffaqiyatda deployment_uuid'ni chiqaradi (bo'lmasa bo'sh).
trigger_deploy() {
  local body code tmp errtmp curlerr
  tmp="$(mktemp)"
  errtmp="$(mktemp)"
  # `-f` ATAYLAB ishlatilmaydi: u xato javob tanasini yutadi, holbuki Coolify
  # sababni aynan o'sha yerda aytadi ("Unauthenticated", "Resource not found").
  #
  # METOD: POST. Coolify deploy endpointi ilgari GET'ni ham qabul qilardi, endi
  # esa `405 {"message":"This endpoint has changed to a POST request."}` qaytaradi
  # — 03.09.2026 da deploy aynan shu sababdan yiqilgan. `-d ''` bo'sh tana bilan
  # POST qiladi (Content-Length: 0).
  code="$(curl -sS --max-time 60 -X POST -d '' -o "$tmp" -w '%{http_code}' \
      -H "Authorization: Bearer $API_TOKEN" "$WEBHOOK_URL" 2>"$errtmp")" || true
  # Ulanish umuman bo'lmasa curl `000` yozadi; boshqa har qanday shakl ham
  # shu holatga tenglashtiriladi (aks holda xabar "HTTP 000000" bo'lib chiqardi).
  [[ "$code" =~ ^[0-9]{3}$ ]] || code="000"
  body="$(head -c 300 "$tmp" | tr '\n' ' ')"
  curlerr="$(head -c 200 "$errtmp" | tr '\n' ' ')"
  rm -f "$tmp" "$errtmp"
  [[ -n "$body" ]] || body="javob bosh"

  if [[ "$code" != 2* ]]; then
    if [[ "$code" == "000" ]]; then
      LAST_ERROR="Coolify serveriga ulanib bo'lmadi: $curlerr"
    else
      LAST_ERROR="Webhook HTTP $code — $body"
    fi
    printf '%s' "$LAST_ERROR" > "$ERR_FILE"
    log "  trigger: $LAST_ERROR"
    return 1
  fi
  # Coolify javobi: {"deployments":[{"deployment_uuid":"...", ...}]}
  # Eski/boshqacha shakllar uchun zaxira variantlar ham sinaladi.
  printf '%s' "$body" | jq -r '
    (.deployments[0].deployment_uuid // .deployment_uuid // .uuid // empty)
  ' 2>/dev/null
}

# 0 = finished, 1 = failed/cancelled, 2 = timeout yoki holat noma'lum
watch_deployment() {
  local uuid="$1"
  local deadline=$(( SECONDS + DEPLOY_TIMEOUT ))
  local unknown=0 status

  while (( SECONDS < deadline )); do
    status="$(curl_api "$(api_base)/api/v1/deployments/${uuid}" 2>/dev/null \
      | jq -r '.status // empty' 2>/dev/null)"

    case "$status" in
      finished)
        log "  holat: finished"
        return 0 ;;
      failed|cancelled-by-user)
        log "  holat: $status"
        return 1 ;;
      queued|in_progress)
        unknown=0
        log "  holat: $status" ;;
      *)
        # Deploy tugagach yozuv ro'yxatdan chiqib ketishi mumkin. Bitta
        # o'qib bo'lmagan javob xulosa chiqarish uchun asos emas — faqat
        # ketma-ket bir nechtasi noaniqlikni bildiradi.
        unknown=$(( unknown + 1 ))
        log "  holat o'qilmadi ($unknown)"
        if (( unknown >= 4 )); then
          return 2
        fi ;;
    esac
    sleep "$POLL_INTERVAL"
  done

  log "  ${DEPLOY_TIMEOUT}s ichida tugamadi"
  return 2
}

# Prod haqiqatan javob berayotganini tekshiradi.
#
# Bu Coolify API'sidan MUSTAQIL signal: API "finished" desa-yu konteyner
# ko'tarilmasa, faqat shu tekshiruv buni ushlaydi.
check_health() {
  [[ -z "$HEALTH_URL" ]] && { log "  HEALTH_URL berilmagan — o'tkazib yuborildi"; return 0; }

  local deadline=$(( SECONDS + HEALTH_TIMEOUT )) code
  while (( SECONDS < deadline )); do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$HEALTH_URL" || true)"
    if [[ "$code" == "200" ]]; then
      log "  sog'liq: 200"
      return 0
    fi
    log "  sog'liq: $code — kutilmoqda"
    sleep "$POLL_INTERVAL"
  done
  log "  sog'liq tekshiruvi ${HEALTH_TIMEOUT}s ichida 200 bermadi"
  return 1
}

# Compose faylni Coolify'ga yuborish (faqat SYNC_COMPOSE=true). Yuborilmasa deploy
# ESKI compose bilan ketardi, shuning uchun xato bo'lsa deploy boshlanmaydi.
sync_compose() {
  local uuid code tmp body
  uuid=$(printf '%s' "$WEBHOOK_URL" | sed -nE 's#.*[?&]uuid=([^&]+).*#\1#p')
  if [[ -z "$uuid" ]]; then
    fail_annotation "COOLIFY_WEBHOOK_URL dan resurs uuid ajratilmadi — compose yuborilmadi"
    exit 1
  fi
  if [[ ! -f "$COMPOSE_FILE" ]]; then
    fail_annotation "Compose fayl topilmadi: $COMPOSE_FILE"
    exit 1
  fi
  tmp="$(mktemp)"
  code=$(jq -Rs '{docker_compose_raw: .}' "$COMPOSE_FILE" \
    | curl -sS --max-time 60 -X PATCH -o "$tmp" -w '%{http_code}' \
        -H "Authorization: Bearer $API_TOKEN" -H "Content-Type: application/json" \
        --data-binary @- "$(api_base)/api/v1/applications/$uuid") || code="000"
  body="$(head -c 300 "$tmp" | tr '\n' ' ')"
  rm -f "$tmp"
  if [[ "$code" != 2* ]]; then
    fail_annotation "Compose Coolify'ga yuborilmadi: HTTP $code — ${body:-javob bosh}"
    exit 1
  fi
  log "compose Coolify'ga yuborildi ($COMPOSE_FILE, HTTP $code)"
}

if [[ "$SYNC_COMPOSE" == "true" ]]; then
  sync_compose
fi

for (( attempt = 1; attempt <= MAX_ATTEMPTS; attempt++ )); do
  log "Deploy urinishi $attempt/$MAX_ATTEMPTS"

  if ! uuid="$(trigger_deploy)"; then
    LAST_ERROR="$(cat "$ERR_FILE" 2>/dev/null)"
    # Webhook o'zi javob bergan bo'lsa-yu funksiya yiqilgan bo'lsa, sabab
    # javobni ajratishda (masalan `jq` yo'q) — buni ham aytib qo'yamiz.
    [[ -n "$LAST_ERROR" ]] || LAST_ERROR="Webhook javobini ajratib bo'lmadi (jq bormi?)"
    log "  trigger so'rovi yiqildi"
    (( attempt < MAX_ATTEMPTS )) && { sleep 10; continue; }
    log "TUGADI: Coolify'ga ulanib bo'lmadi"
    fail_annotation "$LAST_ERROR"
    exit 1
  fi

  if [[ -z "$uuid" ]]; then
    # Javob shakli kutilganidan boshqa. Deploy BOSHLANGAN bo'lishi mumkin,
    # shuning uchun uni yiqilgan deb hisoblamaymiz — prod javob beryaptimi,
    # o'shanga qaraymiz.
    log "  deployment_uuid ajratib olinmadi — faqat sog'liq bo'yicha baholanadi"
    if check_health; then
      log "TUGADI: prod javob beryapti"
      exit 0
    fi
    (( attempt < MAX_ATTEMPTS )) && { log "  qayta urinamiz"; continue; }
    log "TUGADI: prod ko'tarilmadi"
    fail_annotation "Deploy chaqirildi, lekin $HEALTH_URL 200 bermadi"
    exit 1
  fi

  log "  deployment_uuid: $uuid"
  watch_deployment "$uuid"
  case $? in
    0)
      if check_health; then
        log "TUGADI: deploy muvaffaqiyatli"
        exit 0
      fi
      log "  Coolify 'finished' dedi, lekin prod javob bermayapti" ;;
    1)
      log "  deploy yiqildi" ;;
    2)
      # Holat noaniq — prod ko'tarilgan bo'lishi ham mumkin.
      if check_health; then
        log "TUGADI: holat noaniq, lekin prod javob beryapti"
        exit 0
      fi ;;
  esac

  if (( attempt < MAX_ATTEMPTS )); then
    log "  10s dan keyin qayta urinamiz"
    sleep 10
  fi
done

log "TUGADI: $MAX_ATTEMPTS urinishdan keyin ham deploy o'tmadi"
fail_annotation "$LAST_ERROR"
exit 1
