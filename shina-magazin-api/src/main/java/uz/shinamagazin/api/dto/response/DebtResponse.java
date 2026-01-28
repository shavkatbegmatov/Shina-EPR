package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.annotation.ExportColumn;
import uz.shinamagazin.api.annotation.ExportColumn.ColumnType;
import uz.shinamagazin.api.annotation.ExportEntity;
import uz.shinamagazin.api.entity.Debt;
import uz.shinamagazin.api.enums.DebtStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ExportEntity(
    sheetName = "Qarzlar",
    title = "Qarzlar Hisoboti"
)
public class DebtResponse {
    @ExportColumn(header = "ID", order = 1, type = ColumnType.NUMBER)
    private Long id;

    private Long customerId; // Not exported

    @ExportColumn(header = "Mijoz", order = 2)
    private String customerName;

    @ExportColumn(header = "Telefon", order = 3)
    private String customerPhone;

    private Long saleId; // Not exported

    @ExportColumn(header = "Faktura raqami", order = 4)
    private String invoiceNumber;

    @ExportColumn(header = "Dastlabki summa", order = 5, type = ColumnType.CURRENCY)
    private BigDecimal originalAmount;

    @ExportColumn(header = "Qolgan summa", order = 6, type = ColumnType.CURRENCY)
    private BigDecimal remainingAmount;

    @ExportColumn(header = "To'langan summa", order = 7, type = ColumnType.CURRENCY)
    private BigDecimal paidAmount;

    @ExportColumn(header = "Muddat", order = 8, type = ColumnType.DATE)
    private LocalDate dueDate;

    @ExportColumn(header = "Holat", order = 9, type = ColumnType.ENUM)
    private DebtStatus status;

    @ExportColumn(header = "Muddati o'tgan", order = 10, type = ColumnType.BOOLEAN)
    private boolean overdue;

    @ExportColumn(header = "Izoh", order = 11)
    private String notes;

    @ExportColumn(header = "Yaratilgan", order = 12, type = ColumnType.DATETIME)
    private LocalDateTime createdAt;

    public static DebtResponse from(Debt debt) {
        BigDecimal paid = debt.getOriginalAmount().subtract(debt.getRemainingAmount());
        boolean isOverdue = debt.getDueDate() != null &&
                           debt.getDueDate().isBefore(LocalDate.now()) &&
                           debt.getStatus() == DebtStatus.ACTIVE;

        return DebtResponse.builder()
                .id(debt.getId())
                .customerId(debt.getCustomer().getId())
                .customerName(debt.getCustomer().getFullName())
                .customerPhone(debt.getCustomer().getPhone())
                .saleId(debt.getSale() != null ? debt.getSale().getId() : null)
                .invoiceNumber(debt.getSale() != null ? debt.getSale().getInvoiceNumber() : null)
                .originalAmount(debt.getOriginalAmount())
                .remainingAmount(debt.getRemainingAmount())
                .paidAmount(paid)
                .dueDate(debt.getDueDate())
                .status(debt.getStatus())
                .overdue(isOverdue)
                .notes(debt.getNotes())
                .createdAt(debt.getCreatedAt())
                .build();
    }
}
