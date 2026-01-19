package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.annotation.ExportColumn;
import uz.shinamagazin.api.annotation.ExportColumn.ColumnType;
import uz.shinamagazin.api.annotation.ExportEntity;
import uz.shinamagazin.api.entity.Sale;
import uz.shinamagazin.api.enums.PaymentMethod;
import uz.shinamagazin.api.enums.PaymentStatus;
import uz.shinamagazin.api.enums.SaleStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ExportEntity(
    sheetName = "Sotuvlar",
    title = "Sotuvlar Hisoboti",
    orientation = ExportEntity.Orientation.LANDSCAPE
)
public class SaleResponse {
    @ExportColumn(header = "ID", order = 1, type = ColumnType.NUMBER)
    private Long id;

    @ExportColumn(header = "Faktura raqami", order = 2)
    private String invoiceNumber;

    private Long customerId; // Not exported

    @ExportColumn(header = "Mijoz", order = 3)
    private String customerName;

    @ExportColumn(header = "Telefon", order = 4)
    private String customerPhone;

    @ExportColumn(header = "Sotuv sanasi", order = 5, type = ColumnType.DATETIME)
    private LocalDateTime saleDate;

    @ExportColumn(header = "Oraliq summa", order = 6, type = ColumnType.CURRENCY)
    private BigDecimal subtotal;

    @ExportColumn(header = "Chegirma summasi", order = 7, type = ColumnType.CURRENCY)
    private BigDecimal discountAmount;

    @ExportColumn(header = "Chegirma %", order = 8, type = ColumnType.NUMBER)
    private BigDecimal discountPercent;

    @ExportColumn(header = "Jami summa", order = 9, type = ColumnType.CURRENCY)
    private BigDecimal totalAmount;

    @ExportColumn(header = "To'langan", order = 10, type = ColumnType.CURRENCY)
    private BigDecimal paidAmount;

    @ExportColumn(header = "Qarz", order = 11, type = ColumnType.CURRENCY)
    private BigDecimal debtAmount;

    @ExportColumn(header = "To'lov usuli", order = 12, type = ColumnType.ENUM)
    private PaymentMethod paymentMethod;

    @ExportColumn(header = "To'lov holati", order = 13, type = ColumnType.ENUM)
    private PaymentStatus paymentStatus;

    @ExportColumn(header = "Holat", order = 14, type = ColumnType.ENUM)
    private SaleStatus status;

    @ExportColumn(header = "Izoh", order = 15)
    private String notes;

    @ExportColumn(header = "Kim yaratgan", order = 16)
    private String createdByName;

    private List<SaleItemResponse> items; // Not exported (complex type)

    public static SaleResponse from(Sale sale) {
        return SaleResponse.builder()
                .id(sale.getId())
                .invoiceNumber(sale.getInvoiceNumber())
                .customerId(sale.getCustomer() != null ? sale.getCustomer().getId() : null)
                .customerName(sale.getCustomer() != null ? sale.getCustomer().getFullName() : "Noma'lum")
                .customerPhone(sale.getCustomer() != null ? sale.getCustomer().getPhone() : null)
                .saleDate(sale.getSaleDate())
                .subtotal(sale.getSubtotal())
                .discountAmount(sale.getDiscountAmount())
                .discountPercent(sale.getDiscountPercent())
                .totalAmount(sale.getTotalAmount())
                .paidAmount(sale.getPaidAmount())
                .debtAmount(sale.getDebtAmount())
                .paymentMethod(sale.getPaymentMethod())
                .paymentStatus(sale.getPaymentStatus())
                .status(sale.getStatus())
                .notes(sale.getNotes())
                .createdByName(sale.getCreatedBy() != null ? sale.getCreatedBy().getFullName() : null)
                .items(sale.getItems() != null ?
                        sale.getItems().stream()
                                .map(SaleItemResponse::from)
                                .collect(Collectors.toList()) : null)
                .build();
    }
}
