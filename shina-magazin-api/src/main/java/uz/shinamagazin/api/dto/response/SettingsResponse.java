package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.annotation.ExportColumn;
import uz.shinamagazin.api.annotation.ExportColumn.ColumnType;
import uz.shinamagazin.api.annotation.ExportEntity;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ExportEntity(sheetName = "Sozlamalar", title = "Sozlamalar Hisoboti")
public class SettingsResponse {
    @ExportColumn(header = "Qarz muddati (kunlar)", order = 1, type = ColumnType.NUMBER)
    private Integer debtDueDays;

    @ExportColumn(header = "Rasmsiz mahsulot ko'rinishi", order = 2)
    private String imageFallback;

    // Chek (kassa qog'ozi) sarlavhasi va oxiri. Bo'sh qiymat = chekda o'sha
    // qator umuman chiqmaydi.
    @ExportColumn(header = "Chek: do'kon nomi", order = 3)
    private String receiptShopName;

    @ExportColumn(header = "Chek: telefon", order = 4)
    private String receiptShopPhone;

    @ExportColumn(header = "Chek: manzil", order = 5)
    private String receiptShopAddress;

    @ExportColumn(header = "Chek: pastki matn", order = 6)
    private String receiptFooter;

    // ─── Telegram xabarnomalari ───

    @ExportColumn(header = "Telegram: yoqilgan", order = 7)
    private Boolean telegramEnabled;

    @ExportColumn(header = "Telegram: chat ID", order = 8)
    private String telegramChatId;

    /** Uzatiladigan voqea turlari, vergul bilan (StaffNotificationType nomlari). */
    @ExportColumn(header = "Telegram: voqealar", order = 9)
    private String telegramEvents;

    /**
     * Server tomonda bot tokeni o'rnatilganmi.
     *
     * <p>Faqat O'QISH uchun — token hech qachon qaytarilmaydi. Bu bayroqsiz
     * foydalanuvchi sozlamalarni to'ldirib, nega xabar kelmayotganini
     * tushunmay qolardi.
     */
    @ExportColumn(header = "Telegram: bot sozlangan", order = 10)
    private Boolean telegramConfigured;

    // ─── Telegram orqali mijoz ro'yxatdan o'tishi ───

    @ExportColumn(header = "Telegram: ro'yxatdan o'tish", order = 11)
    private Boolean telegramRegistrationEnabled;

    /** Bot username, {@code @} belgisisiz. Maxfiy emas — tokendan farqli. */
    @ExportColumn(header = "Telegram: bot username", order = 12)
    private String telegramBotUsername;

    // ─── Vitrina yetkazib berish (so'm) ───

    @ExportColumn(header = "Yetkazib berish narxi", order = 13, type = ColumnType.NUMBER)
    private Long deliveryFee;

    @ExportColumn(header = "Bepul yetkazib berish chegarasi", order = 14, type = ColumnType.NUMBER)
    private Long freeDeliveryThreshold;
}
