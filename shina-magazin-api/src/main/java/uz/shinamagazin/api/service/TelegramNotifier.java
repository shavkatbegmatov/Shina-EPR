package uz.shinamagazin.api.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import uz.shinamagazin.api.exception.BadRequestException;

import java.time.Duration;
import java.util.Map;

/**
 * Telegram orqali xabar yuborish.
 *
 * <p>Do'kon egasi tizimga kirmasdan turib muhim voqealardan xabardor bo'lishi
 * uchun: yangi onlayn buyurtma, kam zaxira, muddati o'tgan qarzlar.
 *
 * <p><b>Bot tokeni ATAYLAB muhit o'zgaruvchisidan</b> ({@code TELEGRAM_BOT_TOKEN}),
 * bazadagi {@code app_settings} dan emas. Token — bu botning to'liq kaliti:
 * u bilan barcha yozishmalarni o'qish va nomidan xabar yuborish mumkin.
 * {@code app_settings} esa sozlamalar API'sida ko'rinadi va audit jurnaliga
 * tushadi, ya'ni {@code SETTINGS_VIEW} ruxsati bor har bir xodim tokenni
 * ko'rib qolardi. Chat ID maxfiy emas — u sozlamalarda saqlanadi.
 *
 * <p>Yuborish HECH QACHON chaqiruvchini yiqitmaydi: Telegram ishlamay qolsa
 * savdo rasmiylashtirilishi to'xtab qolmasligi kerak.
 */
@Service
@Slf4j
public class TelegramNotifier {

    /** Telegram xabar chegarasi 4096 belgi. */
    private static final int MAX_MESSAGE_LENGTH = 4000;

    private final String botToken;
    private final String apiBase;
    private final SettingsService settingsService;
    private final RestClient restClient;

    public TelegramNotifier(@Value("${telegram.bot-token:}") String botToken,
                            @Value("${telegram.api-base:https://api.telegram.org/bot}") String apiBase,
                            SettingsService settingsService) {
        this.botToken = botToken == null ? "" : botToken.trim();
        this.apiBase = apiBase;
        this.settingsService = settingsService;

        // Timeout MAJBURIY: javob bermayotgan Telegram async pool'ni band qilib,
        // audit yozuvlari va boshqa fon ishlarini to'xtatib qo'yardi.
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    /** Token o'rnatilganmi — sozlamalar sahifasi buni ko'rsatadi. */
    public boolean isConfigured() {
        return !botToken.isBlank();
    }

    /**
     * Xabarni fon oqimida yuboradi.
     *
     * <p>Chaqiruvchi natijani kutmaydi va xatolikni ko'rmaydi — bu ataylab:
     * xabarnoma yordamchi funksiya, u asosiy amalni to'xtatmasligi kerak.
     */
    @Async
    public void send(String text) {
        // Bo'sh xabar — chaqiruvchida yuboradigan narsa yo'q degani
        // (masalan qarzsiz kun). Har bir chaqiruvda tekshirtirmaymiz.
        if (text == null || text.isBlank()) {
            return;
        }
        if (!isConfigured()) {
            log.debug("Telegram tokeni yo'q — xabar yuborilmadi");
            return;
        }
        if (!settingsService.isTelegramEnabled()) {
            return;
        }
        String chatId = settingsService.getTelegramChatId();
        if (chatId.isBlank()) {
            log.debug("Telegram chat ID kiritilmagan — xabar yuborilmadi");
            return;
        }

        try {
            deliver(chatId, text);
        } catch (Exception e) {
            // Faqat WARN: Telegram ishlamasligi biznes jarayonini buzmaydi
            log.warn("Telegram xabarini yuborib bo'lmadi: {}", e.getMessage());
        }
    }

    /**
     * Sinov xabari — sozlamalar sahifasidagi tugma uchun.
     *
     * <p>{@link #send} dan farqi: bu SINXRON va xatolikni QAYTARADI. Foydalanuvchi
     * "yubor" tugmasini bosganda "hammasi joyida" degan yolg'on javob olmasligi
     * kerak — sozlash to'g'riligini aynan shu tekshiradi.
     */
    public void sendTestMessage(String chatId) {
        if (!isConfigured()) {
            throw new BadRequestException(
                    "Telegram bot tokeni o'rnatilmagan. Serverda TELEGRAM_BOT_TOKEN muhit "
                            + "o'zgaruvchisini kiriting.");
        }
        if (chatId == null || chatId.isBlank()) {
            throw new BadRequestException("Chat ID kiritilmagan");
        }

        try {
            deliver(chatId.trim(), "✅ Protektor: Telegram xabarnomalari ishlayapti.");
        } catch (Exception e) {
            throw new BadRequestException("Telegram javob bermadi: " + e.getMessage());
        }
    }

    private void deliver(String chatId, String text) {
        restClient.post()
                .uri(apiBase + botToken + "/sendMessage")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "chat_id", chatId,
                        "text", truncate(text),
                        "parse_mode", "HTML",
                        "disable_web_page_preview", true))
                .retrieve()
                .toBodilessEntity();
    }

    /** Chegaradan uzun xabarni Telegram butunlay rad etadi — kesib yuboramiz. */
    private static String truncate(String text) {
        return text.length() <= MAX_MESSAGE_LENGTH
                ? text
                : text.substring(0, MAX_MESSAGE_LENGTH) + "…";
    }
}
