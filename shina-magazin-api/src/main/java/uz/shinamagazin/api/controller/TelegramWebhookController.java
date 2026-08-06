package uz.shinamagazin.api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uz.shinamagazin.api.config.TelegramProperties;
import uz.shinamagazin.api.service.TelegramUpdateHandler;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Telegram webhook — bot xabarlarini qabul qiladi.
 *
 * <p>Manzil: {@code POST /api/v1/telegram/webhook}. SecurityConfig'da
 * {@code permitAll} (Telegram bizning JWT'imizni bilmaydi), shuning uchun
 * himoya BUTUNLAY sirga tayanadi.
 *
 * <p><b>Fail-closed.</b> Rejim WEBHOOK bo'lmasa yoki {@code webhookSecret} bo'sh
 * bo'lsa hech qanday so'rov qabul qilinmaydi. Sabab jiddiy: manzilni topgan
 * hujumchi soxta "kontakt" yangilanishini yuborib, ISTALGAN raqamni O'ZINING
 * chat ID'siga bog'lay olardi — va yangi PIN o'sha chatga ketardi. Ya'ni sirsiz
 * webhook = istalgan mijoz akkauntini bosib olish. Shuning uchun sir MAJBURIY.
 *
 * @see TelegramProperties
 */
@RestController
@RequestMapping("/v1/telegram")
@RequiredArgsConstructor
@Slf4j
public class TelegramWebhookController {

    private static final String SECRET_HEADER = "X-Telegram-Bot-Api-Secret-Token";

    private final TelegramProperties props;
    private final TelegramUpdateHandler updateHandler;

    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(
            @RequestBody JsonNode update,
            @RequestHeader(value = SECRET_HEADER, required = false) String secret) {

        if (props.getMode() != TelegramProperties.Mode.WEBHOOK) {
            // 404: rejim yoqilmagan bo'lsa endpoint umuman "yo'q" bo'lsin —
            // skanerlovchiga bu yerda nima borligini aytmaymiz.
            return ResponseEntity.notFound().build();
        }

        if (!secretMatches(secret)) {
            log.warn("Telegram webhook: noto'g'ri yoki yo'q sir");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        updateHandler.handle(update);

        // Har doim 200: xatolik qaytarsak Telegram xuddi shu yangilanishni
        // qayta-qayta yuborib turardi. `handle` istisnolarni o'zi yutadi.
        return ResponseEntity.ok().build();
    }

    /**
     * Sirni doimiy vaqtda solishtiradi.
     *
     * <p>Oddiy {@code equals} birinchi farqli baytda to'xtaydi, ya'ni javob
     * VAQTI sirni bayt-bayt topishga imkon berardi.
     */
    private boolean secretMatches(String provided) {
        String expected = props.getWebhookSecret();
        if (expected == null || expected.isBlank() || provided == null) {
            return false;
        }
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                provided.getBytes(StandardCharsets.UTF_8));
    }
}
