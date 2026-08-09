package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Xodimlikka ro'yxatdan o'tish so'rovi — OMMAVIY forma (`/admin/register`).
 *
 * <p>Bu yerda parol yoki rol KODI yo'q: so'rov hech qanday huquq bermaydi,
 * u faqat murojaat. Akkaunt va rolni tasdiqlovchi xodim belgilaydi.
 */
@Data
public class StaffRegistrationSubmitRequest {

    @NotBlank(message = "Ism familiya kiritilishi shart")
    @Size(max = 150, message = "Ism familiya 150 ta belgidan oshmasligi kerak")
    private String fullName;

    @NotBlank(message = "Telefon raqam kiritilishi shart")
    @Pattern(regexp = "^\\+998[0-9]{9}$", message = "Telefon raqam formati: +998XXXXXXXXX")
    private String phone;

    @Size(max = 200, message = "Kompaniya nomi 200 ta belgidan oshmasligi kerak")
    private String companyName;

    /**
     * Taklif qilinayotgan rol. Ro'yxat ATAYLAB cheklangan: ommaviy formadan
     * ixtiyoriy satr kelsa, u xodimlar ro'yxatida chalkashlik yaratardi.
     */
    @NotBlank(message = "Rol tanlanishi shart")
    @Pattern(regexp = "SELLER|MANAGER|ADMIN", message = "Rol: SELLER, MANAGER yoki ADMIN")
    private String requestedRole;

    @Size(max = 500, message = "Izoh 500 ta belgidan oshmasligi kerak")
    private String note;
}
