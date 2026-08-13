package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Ariza yuborilgandan keyingi javob.
 *
 * <p>Asosiy qiymati — {@code telegramLinkUrl}: Telegram botlari
 * foydalanuvchiga birinchi bo'lib yozolmaydi, shuning uchun arizachi
 * javobni Telegramda olishni xohlasa, o'sha havolani ochib START bosishi
 * kerak. Bot bunday sozlanmagan bo'lsa {@code null} — bunda ariza baribir
 * qabul qilinadi, faqat xabar bermaymiz.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffRegistrationSubmitResponse {
    private String telegramLinkUrl;
}
