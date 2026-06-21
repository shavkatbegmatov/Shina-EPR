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
}
