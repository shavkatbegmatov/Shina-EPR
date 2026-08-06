package uz.shinamagazin.api.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Telegram bot sozlamalari ({@code telegram.*}).
 *
 * <p>Token va webhook siri ATAYLAB faqat muhit o'zgaruvchisidan olinadi,
 * {@code app_settings} dan emas: ikkalasi ham botning kalitlari, sozlamalar
 * API'si esa audit jurnaliga tushadi va {@code SETTINGS_VIEW} ruxsati bor har
 * bir xodimga ko'rinadi. Bot USERNAME va yoqish/o'chirish esa maxfiy emas —
 * ular sozlamalarda ({@code SettingsService}).
 */
@Component
@ConfigurationProperties(prefix = "telegram")
@Data
public class TelegramProperties {

    /**
     * Bot yangilanishlarini (kirish xabarlarini) qanday olish.
     *
     * <p>Bu <b>faqat KIRISH</b> kanaliga tegishli. Chiquvchi xabarnomalar
     * ({@code TelegramNotifier}) mode'dan qat'i nazar ishlayveradi — ular
     * uchun token yetarli.
     */
    public enum Mode {
        /** Bot o'chiq: mijoz ro'yxatdan o'ta olmaydi (default). */
        OFF,
        /**
         * {@code getUpdates} bilan so'rab turish. Ommaviy HTTPS manzil
         * TALAB QILINMAYDI — shuning uchun localhost'da ham ishlaydi.
         */
        POLLING,
        /**
         * Telegram o'zi bizga POST qiladi. Prod uchun to'g'ri variant:
         * doimiy so'rov yo'q, kechikish nolga yaqin. Ommaviy HTTPS shart.
         */
        WEBHOOK
    }

    /** Botning to'liq kaliti. Bo'sh bo'lsa bot butunlay ishlamaydi. */
    private String botToken = "";

    private String apiBase = "https://api.telegram.org/bot";

    private Mode mode = Mode.OFF;

    /**
     * Webhook so'rovini tasdiqlash siri (Telegram uni
     * {@code X-Telegram-Bot-Api-Secret-Token} sarlavhasida qaytaradi).
     *
     * <p>Bu bo'lmasa webhook manzilini topgan istalgan odam soxta "kontakt"
     * yuborib, o'zi tanlagan raqamga mijoz akkaunti ochib PIN'ini bilib
     * olardi. Shuning uchun WEBHOOK rejimi sirsiz ishga tushmaydi.
     */
    private String webhookSecret = "";

    /**
     * {@code getUpdates} long-polling kutish vaqti (sekund).
     *
     * <p>Telegram yangilanish bo'lmasa shu muddat davomida ushlab turadi —
     * ya'ni bo'sh so'rovlar soni keskin kamayadi. HTTP read timeout bundan
     * KATTA bo'lishi shart, aks holda har bir so'rov timeout bilan tugardi.
     */
    private int pollTimeoutSeconds = 25;
}
