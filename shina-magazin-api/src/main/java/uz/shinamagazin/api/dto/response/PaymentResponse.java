package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.annotation.ExportColumn;
import uz.shinamagazin.api.annotation.ExportColumn.ColumnType;
import uz.shinamagazin.api.annotation.ExportEntity;
import uz.shinamagazin.api.entity.Payment;
import uz.shinamagazin.api.enums.PaymentMethod;
import uz.shinamagazin.api.enums.PaymentType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ExportEntity(
    sheetName = "To'lovlar",
    title = "To'lovlar Hisoboti"
)
public class PaymentResponse {
    @ExportColumn(header = "ID", order = 1, type = ColumnType.NUMBER)
    private Long id;

    private Long saleId; // Not exported

    @ExportColumn(header = "Faktura raqami", order = 2)
    private String invoiceNumber;

    private Long customerId; // Not exported

    @ExportColumn(header = "Mijoz", order = 3)
    private String customerName;

    @ExportColumn(header = "Summa", order = 4, type = ColumnType.CURRENCY)
    private BigDecimal amount;

    @ExportColumn(header = "To'lov usuli", order = 5, type = ColumnType.ENUM)
    private PaymentMethod method;

    @ExportColumn(header = "To'lov turi", order = 6, type = ColumnType.ENUM)
    private PaymentType paymentType;

    @ExportColumn(header = "Referens raqam", order = 7)
    private String referenceNumber;

    @ExportColumn(header = "Izoh", order = 8)
    private String notes;

    @ExportColumn(header = "To'lov sanasi", order = 9, type = ColumnType.DATETIME)
    private LocalDateTime paymentDate;

    @ExportColumn(header = "Kim qabul qilgan", order = 10)
    private String receivedByName;

    public static PaymentResponse from(Payment payment) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .saleId(payment.getSale() != null ? payment.getSale().getId() : null)
                .invoiceNumber(payment.getSale() != null ? payment.getSale().getInvoiceNumber() : null)
                .customerId(payment.getCustomer() != null ? payment.getCustomer().getId() : null)
                .customerName(payment.getCustomer() != null ? payment.getCustomer().getFullName() : null)
                .amount(payment.getAmount())
                .method(payment.getMethod())
                .paymentType(payment.getPaymentType())
                .referenceNumber(payment.getReferenceNumber())
                .notes(payment.getNotes())
                .paymentDate(payment.getPaymentDate())
                .receivedByName(payment.getReceivedBy().getFullName())
                .build();
    }
}
