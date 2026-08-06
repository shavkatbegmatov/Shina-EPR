package uz.shinamagazin.api.dto.telegram;

/**
 * Telegram xabarini YUBORGAN foydalanuvchi ({@code message.from}).
 *
 * @param id        Telegram foydalanuvchi ID'si
 * @param firstName ism (Telegramda majburiy)
 * @param lastName  familiya (ixtiyoriy)
 * @param username  @username (ko'p foydalanuvchida yo'q)
 */
public record TelegramSender(long id, String firstName, String lastName, String username) {

    /** Telegram profilidagi to'liq ism. Bo'sh bo'lsa {@code null}. */
    public String fullName() {
        String first = firstName == null ? "" : firstName.trim();
        String last = lastName == null ? "" : lastName.trim();
        String full = (first + " " + last).trim();
        return full.isEmpty() ? null : full;
    }
}
