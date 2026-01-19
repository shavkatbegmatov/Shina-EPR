package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.annotation.ExportColumn;
import uz.shinamagazin.api.annotation.ExportColumn.ColumnType;
import uz.shinamagazin.api.annotation.ExportEntity;
import uz.shinamagazin.api.enums.PurchaseReturnStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ExportEntity(sheetName = "Xarid Qaytarishlari", title = "Xarid Qaytarishlari Hisoboti")
public class PurchaseReturnResponse {
    @ExportColumn(header = "ID", order = 1, type = ColumnType.NUMBER)
    private Long id;

    @ExportColumn(header = "Qaytarish raqami", order = 2)
    private String returnNumber;

    private Long purchaseOrderId; // Not exported

    @ExportColumn(header = "Xarid raqami", order = 3)
    private String purchaseOrderNumber;

    private Long supplierId; // Not exported

    @ExportColumn(header = "Ta'minotchi", order = 4)
    private String supplierName;

    @ExportColumn(header = "Qaytarish sanasi", order = 5, type = ColumnType.DATE)
    private LocalDate returnDate;

    @ExportColumn(header = "Sabab", order = 6)
    private String reason;

    @ExportColumn(header = "Holat", order = 7, type = ColumnType.ENUM)
    private PurchaseReturnStatus status;

    @ExportColumn(header = "Qaytarilgan summa", order = 8, type = ColumnType.CURRENCY)
    private BigDecimal refundAmount;

    private List<PurchaseReturnItemResponse> items; // Not exported (complex type)

    @ExportColumn(header = "Kim yaratgan", order = 9)
    private String createdByName;

    @ExportColumn(header = "Kim tasdiqlagan", order = 10)
    private String approvedByName;

    @ExportColumn(header = "Tasdiqlangan sana", order = 11, type = ColumnType.DATE)
    private LocalDate approvedAt;

    @ExportColumn(header = "Yaratilgan", order = 12, type = ColumnType.DATETIME)
    private LocalDateTime createdAt;
}
