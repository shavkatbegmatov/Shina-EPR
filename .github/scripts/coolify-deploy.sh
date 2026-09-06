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
# PATCH uchun YOZISH huquqli token kerak; deploy tokeni faqat read+deploy
# (06.09.2026 probe: 403 "Missing required permissions: write"). Berilmasa
# deploy tokeni bilan urinadi — u holda 403 aniq annotatsiya bo'lib chiqadi.
WRITE_TOKEN="${COOLIFY_WRITE_TOKEN:-$API_TOKEN}"

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
  # Raw compose resurs Coolify'da SERVICE turida; API compose'ni base64 kutadi
  # (07.09.2026: xom matn 422 "should be base64 encoded", base64 — 200).
  code=$(jq -n --arg c "$(base64 -w0 "$COMPOSE_FILE")" '{docker_compose_raw: $c}' \
    | curl -sS --max-time 60 -X PATCH -o "$tmp" -w '%{http_code}' \
        -H "Authorization: Bearer $WRITE_TOKEN" -H "Content-Type: application/json" \
        --data-binary @- "$(api_base)/api/v1/services/$uuid") || code="000"
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

# SERVICE resurs Coolify'da "running" holatiga o'tishini kutadi (deployment_uuid
# bo'lmaganda). Deploy trigger'dan keyin eski konteynerlar bir necha soniya tirik
# turadi — shuning uchun avval qisqa kutish, keyin holat so'raladi.
# Resurs service bo'lmasa (GET 404) — 0 qaytaradi, baho sog'liqqa qoladi.
wait_service_running() {
  local uuid status deadline=$(( SECONDS + DEPLOY_TIMEOUT ))
  uuid=$(printf '%s' "$WEBHOOK_URL" | sed -nE 's#.*[?&]uuid=([^&]+).*#\1#p')
  [[ -n "$uuid" ]] || { log "  uuid ajratilmadi — holat kutilmaydi"; return 0; }
  sleep 20
  while (( SECONDS < deadline )); do
    status="$(curl_api "$(api_base)/api/v1/services/${uuid}" 2>/dev/null | jq -r '.status // empty' 2>/dev/null)"
    case "$status" in
      "")
        log "  service holati o'qilmadi (application bo'lishi mumkin) — sog'liqqa o'tamiz"
        return 0 ;;
      running:healthy)
        log "  service holati: $status"
        return 0 ;;
      running*)
        # Healthcheck hali tugamagan bo'lishi mumkin — barqaror sog'liq tekshiruvi hal qiladi.
        log "  service holati: $status"
        return 0 ;;
      *)
        # `degraded:unhealthy` va `exited` deploy paytida ODATIY o'tkinchi holat:
        # backend healthcheck'i 60 s start_period bilan, konteynerlar qayta yaratiladi.
        # 07.09.2026 da bular yakuniy deb olinib, deploy uch marta qayta trigger
        # qilingan va ishga tushayotgan konteynerlar qayta-qayta yiqitilgan edi.
        log "  service holati: $status — kutilmoqda" ;;
    esac
    sleep "$POLL_INTERVAL"
  done
  log "  service ${DEPLOY_TIMEOUT}s ichida running bo'lmadi"
  return 1
}

# Sog'liq KETMA-KET uch marta 200 bo'lsin — bitta 200 eski konteynerdan kelishi mumkin.
check_health_stable() {
  [[ -z "$HEALTH_URL" ]] && { log "  HEALTH_URL berilmagan — o'tkazib yuborildi"; return 0; }
  local deadline=$(( SECONDS + HEALTH_TIMEOUT )) code streak=0
  while (( SECONDS < deadline )); do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$HEALTH_URL" || true)"
    if [[ "$code" == "200" ]]; then
      streak=$(( streak + 1 ))
      log "  sog'liq: 200 ($streak/3)"
      (( streak >= 3 )) && return 0
      sleep 10
    else
      streak=0
      log "  sog'liq: $code — kutilmoqda"
      sleep "$POLL_INTERVAL"
    fi
  done
  log "  sog'liq ${HEALTH_TIMEOUT}s ichida barqaror 200 bermadi"
  return 1
}

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
    # SERVICE resursda webhook javobi deployment_uuid bermaydi (faqat
    # "started, be patient"). Sog'liqni darhol tekshirish ALDAYDI: eski
    # konteynerlar hali tirik bo'ladi (07.09.2026: skript 1 soniyada "200" dedi,
    # 502 blip undan keyin keldi). Shuning uchun avval Coolify'ning o'zi
    # service'ni "running" deb ko'rsatishini kutamiz, so'ng 200 ketma-ket
    # uch marta bo'lishini talab qilamiz.
    log "  deployment_uuid ajratib olinmadi — service holati va sog'liq bo'yicha baholanadi"
    if wait_service_running && check_health_stable; then
      log "TUGADI: service ishga tushdi, prod barqaror javob beryapti"
      exit 0
    fi
    # QAYTA TRIGGER YO'Q: service yo'lida deploy allaqachon Coolify'da ketmoqda;
    # yana chaqirish ishga tushayotgan konteynerlarni qayta yiqitadi
    # (07.09.2026 da aynan shu bo'lgan). Kutish tugagan bo'lsa — bu xato.
    log "TUGADI: service ${DEPLOY_TIMEOUT}s + ${HEALTH_TIMEOUT}s ichida barqaror bo'lmadi"
    fail_annotation "Service deploy qilindi, lekin running holati yoki $HEALTH_URL da barqaror 200 kutilgan vaqtda kelmadi"
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
