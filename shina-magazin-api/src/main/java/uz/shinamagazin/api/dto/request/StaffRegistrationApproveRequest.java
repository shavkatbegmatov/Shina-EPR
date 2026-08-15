package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * So'rovni tasdiqlash — yakuniy qaror xodimniki.
 *
 * <p>Ikkala maydon ham ixtiyoriy, lekin ROL uchun zaxira qiymat arizadagi
 * taklif EMAS: uni istalgan odam ochiq shakldan ADMIN deb yuborishi mumkin.
 * Rol ko'rsatilmasa eng kam huquqli rol beriladi, lavozim esa rol nomidan
 * olinadi.
 */
@Data
public class StaffRegistrationApproveRequest {

    /** Yakuniy rol kodi. Bo'sh bo'lsa — eng kam huquqli rol (SELLER). */
    @Size(max = 30, message = "Rol kodi 30 ta belgidan oshmasligi kerak")
    private String roleCode;

    /** Lavozim (xodimlar ro'yxatida ko'rinadi). Bo'sh bo'lsa rol nomidan olinadi. */
    @Size(max = 100, message = "Lavozim 100 ta belgidan oshmasligi kerak")
    private String position;
}
