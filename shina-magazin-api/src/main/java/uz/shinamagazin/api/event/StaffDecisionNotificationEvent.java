package uz.shinamagazin.api.event;

/**
 * Xodimlik arizasi bo'yicha qaror arizachiga yetkazilishi kerak.
 *
 * <p>Xabar TRANZAKSIYA TASDIQLANGANDAN KEYIN yuboriladi. Ilgari u
 * {@code approve}/{@code reject} ichida, commit'dan oldin ketardi: commit
 * paytidagi xatolik (masalan bir vaqtda ikki tekshiruvchi harakat qilganda
 * {@code @Version} konflikti) yuz bersa, arizachi ROLLBACK bo'lgan qaror
 * haqida — ba'zan mavjud bo'lmagan akkauntning login va vaqtinchalik paroli
 * bilan — xabar olib bo'lgan bo'lardi va uni qaytarib olishning iloji yo'q.
 *
 * @param chatId arizachining Telegram chati
 * @param text   tayyor xabar matni (HTML)
 */
public record StaffDecisionNotificationEvent(long chatId, String text) {}
