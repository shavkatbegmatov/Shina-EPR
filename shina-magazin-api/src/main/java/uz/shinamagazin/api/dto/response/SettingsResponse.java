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
}
