package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * So'rovni tasdiqlash — yakuniy qaror xodimniki.
 *
 * <p>Ikkala maydon ham ixtiyoriy: berilmasa so'rovdagi taklif ishlatiladi.
 * Lekin rolni bu yerda QAYTA belgilash mumkinligi muhim — so'rovchi o'ziga
 * ADMIN so'ragan bo'lishi mumkin, tasdiqlovchi esa SELLER berishi kerak.
 */
@Data
public class StaffRegistrationApproveRequest {

    /** Yakuniy rol kodi. Bo'sh bo'lsa — so'rovdagi taklif. */
    @Size(max = 30, message = "Rol kodi 30 ta belgidan oshmasligi kerak")
    private String roleCode;

    /** Lavozim (xodimlar ro'yxatida ko'rinadi). Bo'sh bo'lsa rol nomidan olinadi. */
    @Size(max = 100, message = "Lavozim 100 ta belgidan oshmasligi kerak")
    private String position;
}
