package uz.shinamagazin.api.util;

/**
 * Telegram xabar matni yordamchilari — bitta joyda.
 *
 * <p>Ilgari {@code MAX_MESSAGE_LENGTH}, {@code truncate} va HTML {@code escape}
 * to'rt-besh sinfda nusxa-ko'chirilgan edi (TelegramApiClient, TelegramNotifier,
 * TelegramNotificationListener, DebtReminderScheduler); chegara o'zgarsa yoki
 * qochirish qoidasi tuzatilsa hammasini alohida yodda tutish kerak bo'lardi.
 */
public final class TelegramText {

    /** Telegram chegarasi 4096 belgi; "…" va zaxira uchun 4000. */
    public static final int MAX_MESSAGE_LENGTH = 4000;

    private TelegramText() {
    }

    /** Chegaradan uzun xabarni Telegram butunlay rad etadi — kesib yuboramiz. */
    public static String truncate(String text) {
        if (text == null) {
            return "";
        }
        return text.length() <= MAX_MESSAGE_LENGTH
                ? text
                : text.substring(0, MAX_MESSAGE_LENGTH) + "…";
    }

    /** {@code parse_mode=HTML} uchun foydalanuvchi matnini (ism, izoh) qochirish. */
    public static String escapeHtml(String text) {
        if (text == null) {
            return "";
        }
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
