package uz.shinamagazin.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import uz.shinamagazin.api.config.TelegramProperties;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Botning KIRISH kanalini ishga tushiradi va boshqaradi.
 *
 * <p>Ikki rejim qo'llab-quvvatlanadi va bu ataylab:
 * <ul>
 *   <li><b>WEBHOOK</b> — prod uchun. Doimiy so'rov yo'q, kechikish nolga yaqin,
 *       lekin ommaviy HTTPS manzil kerak.</li>
 *   <li><b>POLLING</b> — dev/demo uchun. Ommaviy manzil TALAB QILINMAYDI, ya'ni
 *       localhost'da ham (ngrok'siz) ishlaydi. Bu muhim: aks holda funksiyani
 *       faqat prod'ga chiqarib test qilish mumkin bo'lardi.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TelegramBotLifecycle {

    /**
     * Xatolikdan keyin kutish (ms).
     *
     * <p>Telegram yiqilganda yoki tarmoq uzilganda sikl darhol qayta urinsa,
     * loglar to'lib ketardi va API cheklovi ishga tushardi.
     */
    private static final long ERROR_BACKOFF_MS = 5_000;

    private final TelegramProperties props;
    private final TelegramApiClient client;
    private final TelegramUpdateHandler updateHandler;

    /**
     * Webhook manzili — {@code https://<domen>/api/v1/telegram/webhook}.
     *
     * <p>Bo'sh bo'lsa webhook o'rnatilmaydi (ilova baribir ishlayveradi, faqat
     * bot javob bermaydi) — noto'g'ri manzil bilan ro'yxatdan o'tkazgandan
     * ko'ra, jurnalda aniq ogohlantirish qoldirgan afzal.
     */
    @Value("${telegram.webhook-url:}")
    private String webhookUrl;

    private final AtomicBoolean running = new AtomicBoolean(false);
    private volatile Thread pollThread;

    @EventListener(ApplicationReadyEvent.class)
    public void start() {
        if (props.getMode() == TelegramProperties.Mode.OFF) {
            return;
        }
        if (!client.isConfigured()) {
            log.warn("Telegram bot rejimi {}, lekin TELEGRAM_BOT_TOKEN yo'q — bot ishga tushmadi",
                    props.getMode());
            return;
        }

        switch (props.getMode()) {
            case WEBHOOK -> startWebhook();
            case POLLING -> startPolling();
            default -> { /* OFF — yuqorida qaytarilgan */ }
        }
    }

    private void startWebhook() {
        if (props.getWebhookSecret() == null || props.getWebhookSecret().isBlank()) {
            // Controller sirsiz baribir hamma so'rovni rad etadi — bu yerda
            // to'xtash sababni jurnalda ANIQ ko'rsatadi.
            log.error("Telegram WEBHOOK rejimi uchun TELEGRAM_WEBHOOK_SECRET majburiy — bot ishga tushmadi");
            return;
        }
        if (webhookUrl == null || webhookUrl.isBlank()) {
            log.error("Telegram WEBHOOK rejimi uchun TELEGRAM_WEBHOOK_URL majburiy — bot ishga tushmadi");
            return;
        }

        if (client.setWebhook(webhookUrl.trim(), props.getWebhookSecret())) {
            log.info("Telegram webhook o'rnatildi: {}", webhookUrl);
        } else {
            log.error("Telegram webhook o'rnatilmadi — jurnaldagi sababni tekshiring");
        }
    }

    /**
     * Long-polling siklini ALOHIDA oqimda boshlaydi.
     *
     * <p>Ataylab {@code @Async} emas, balki o'z oqimi: sikl cheksiz, ya'ni
     * umumiy async pool'dan bitta oqimni butun ilova umriga band qilib
     * qo'yardi — o'sha pool'da esa xabarnomalar va audit yozuvlari ishlaydi.
     *
     * <p>Daemon: polling oqimi ilovaning o'chishiga to'sqinlik qilmasin.
     */
    private void startPolling() {
        // Telegram webhook o'rnatilgan bo'lsa `getUpdates` ni RAD ETADI
        // (409 Conflict). Webhook'dan polling'ga o'tgan deployment shusiz
        // jimgina ishlamay qolardi.
        client.deleteWebhook();

        if (!running.compareAndSet(false, true)) {
            return;
        }
        Thread thread = new Thread(this::pollLoop, "telegram-poller");
        thread.setDaemon(true);
        thread.start();
        this.pollThread = thread;
    }

    private void pollLoop() {
        log.info("Telegram polling boshlandi (timeout {}s)", props.getPollTimeoutSeconds());
        long offset = 0;

        while (running.get() && !Thread.currentThread().isInterrupted()) {
            try {
                List<JsonNode> updates = client.getUpdates(offset);
                for (JsonNode update : updates) {
                    // Offset yangilanish QAYTA ISHLANISHIDAN OLDIN suriladi:
                    // muammoli bitta yangilanish navbatni to'sib qo'ymasligi
                    // kerak. `handle` istisnolarni o'zi yutadi, ya'ni xatolik
                    // qolgan yangilanishlarni ham to'xtatmaydi.
                    offset = Math.max(offset, update.path("update_id").asLong() + 1);
                    updateHandler.handle(update);
                }
            } catch (Exception e) {
                log.warn("Telegram polling xatosi: {}", e.getMessage());
                if (!sleepAfterError()) {
                    break;
                }
            }
        }
        log.info("Telegram polling to'xtadi");
    }

    /** Ilova o'chayotganda siklni to'xtatadi. */
    @PreDestroy
    public void stop() {
        running.set(false);
        Thread thread = pollThread;
        if (thread != null) {
            // getUpdates uzoq kutishda turgan bo'lishi mumkin — uzmasak
            // o'chish shuncha sekundga cho'zilardi.
            thread.interrupt();
        }
    }

    /** @return sikl davom etsinmi (uzilgan bo'lsa — yo'q) */
    private boolean sleepAfterError() {
        try {
            Thread.sleep(ERROR_BACKOFF_MS);
            return true;
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            return false;
        }
    }
}
