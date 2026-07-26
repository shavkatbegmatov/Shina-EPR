package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SettingsUpdateRequest {

    @NotNull(message = "Qarz muddati kunlarda ko'rsatilishi shart")
    @Min(value = 1, message = "Qarz muddati kamida 1 kun bo'lishi kerak")
    @Max(value = 365, message = "Qarz muddati 365 kundan oshmasligi kerak")
    private Integer debtDueDays;

    /** Storefront rasmsiz mahsulot ko'rinishi: SVG yoki PHOTO (ixtiyoriy). */
    @Pattern(regexp = "SVG|PHOTO", message = "imageFallback SVG yoki PHOTO bo'lishi kerak")
    private String imageFallback;

    // Chek sozlamalari. null = tegilmaydi, bo'sh satr = chekdan olib tashlash.
    // Uzunlik app_settings.setting_value (VARCHAR 255) bilan cheklangan.

    @Size(max = 255, message = "Do'kon nomi 255 belgidan oshmasligi kerak")
    private String receiptShopName;

    @Size(max = 255, message = "Telefon 255 belgidan oshmasligi kerak")
    private String receiptShopPhone;

    @Size(max = 255, message = "Manzil 255 belgidan oshmasligi kerak")
    private String receiptShopAddress;

    @Size(max = 255, message = "Chek matni 255 belgidan oshmasligi kerak")
    private String receiptFooter;
}
