package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.annotation.ExportColumn;
import uz.shinamagazin.api.annotation.ExportColumn.ColumnType;
import uz.shinamagazin.api.annotation.ExportEntity;
import uz.shinamagazin.api.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ExportEntity(sheetName = "Xarid To'lovlari", title = "Xarid To'lovlari Hisoboti")
public class PurchasePaymentResponse {
    @ExportColumn(header = "ID", order = 1, type = ColumnType.NUMBER)
    private Long id;

    @ExportColumn(header = "Xarid ID", order = 2, type = ColumnType.NUMBER)
    private Long purchaseOrderId;

    @ExportColumn(header = "Summa", order = 3, type = ColumnType.CURRENCY)
    private BigDecimal amount;

    @ExportColumn(header = "To'lov sanasi", order = 4, type = ColumnType.DATE)
    private LocalDate paymentDate;

    @ExportColumn(header = "To'lov usuli", order = 5, type = ColumnType.ENUM)
    private PaymentMethod paymentMethod;

    @ExportColumn(header = "Referens raqam", order = 6)
    private String referenceNumber;

    @ExportColumn(header = "Izoh", order = 7)
    private String notes;

    @ExportColumn(header = "Kim qabul qilgan", order = 8)
    private String receivedByName;

    @ExportColumn(header = "Yaratilgan", order = 9, type = ColumnType.DATETIME)
    private LocalDateTime createdAt;
}
