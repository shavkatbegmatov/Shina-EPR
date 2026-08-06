package uz.shinamagazin.api.dto.telegram;

import java.util.Map;

/**
 * Botning mijozga javobi.
 *
 * <p>Xabar yuborish ATAYLAB bu yerda emas: registratsiya xizmati javob
 * MATNINI qaytaradi, uni yuborishni esa {@code TelegramUpdateHandler}
 * bajaradi. Shu sababli registratsiya mantiqini Telegramga umuman
 * chiqmasdan test qilib bo'ladi.
 *
 * @param text        HTML formatidagi xabar
 * @param replyMarkup klaviatura yoki {@code null}
 */
public record BotReply(String text, Map<String, Object> replyMarkup) {

    public static BotReply of(String text) {
        return new BotReply(text, null);
    }

    public static BotReply of(String text, Map<String, Object> replyMarkup) {
        return new BotReply(text, replyMarkup);
    }
}
