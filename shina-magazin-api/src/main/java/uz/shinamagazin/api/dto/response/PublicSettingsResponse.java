package uz.shinamagazin.api.dto.response;

import lombok.Builder;
import lombok.Data;

/**
 * Storefront (guest) uchun OMMAVIY sozlamalar — auth talab qilmaydi.
 * Faqat ommaviy ko'rinishga ta'sir qiluvchi sozlamalar (ichki/maxfiy emas).
 */
@Data
@Builder
public class PublicSettingsResponse {
    /** Rasmsiz mahsulot ko'rinishi: "SVG" yoki "PHOTO". */
    private String imageFallback;

    /**
     * Telegram orqali ro'yxatdan o'tish tugmasi ko'rsatilsinmi.
     *
     * <p>Sozlama yoqilgan VA bot username kiritilgan bo'lsagina true —
     * aks holda tugma ishlamaydigan havolaga olib borardi.
     */
    private Boolean telegramRegistrationEnabled;

    /** Bot username ({@code @} belgisisiz) — {@code t.me/<username>} havolasi uchun. */
    private String telegramBotUsername;

    /** Yetkazib berish narxi (so'm) — checkout oldindan ko'rsatadi; yakuniy hisob serverda. */
    private Long deliveryFee;

    /** Shu summadan boshlab yetkazib berish bepul (so'm). */
    private Long freeDeliveryThreshold;
}
