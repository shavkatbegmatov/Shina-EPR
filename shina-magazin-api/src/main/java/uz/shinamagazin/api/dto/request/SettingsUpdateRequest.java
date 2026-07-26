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

    // ─── Telegram xabarnomalari ───
    // Bot TOKENI bu yerda yo'q va ataylab: u muhit o'zgaruvchisidan olinadi,
    // aks holda SETTINGS_VIEW ruxsati bor har bir xodim uni ko'rib qolardi.

    private Boolean telegramEnabled;

    /** Telegram chat/kanal ID: musbat, manfiy (guruh) yoki @username. */
    @Size(max = 64, message = "Chat ID 64 belgidan oshmasligi kerak")
    @Pattern(regexp = "^$|^-?\\d+$|^@[A-Za-z0-9_]{4,32}$",
            message = "Chat ID raqam yoki @username ko'rinishida bo'lishi kerak")
    private String telegramChatId;

    @Size(max = 255, message = "Voqealar ro'yxati 255 belgidan oshmasligi kerak")
    private String telegramEvents;
}
