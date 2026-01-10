package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.Debt;
import uz.shinamagazin.api.enums.DebtStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DebtResponse {
    private Long id;
    private Long customerId;
    private String customerName;
    private String customerPhone;
    private Long saleId;
    private String invoiceNumber;
    private BigDecimal originalAmount;
    private BigDecimal remainingAmount;
    private BigDecimal paidAmount;
    private LocalDate dueDate;
    private DebtStatus status;
    private boolean overdue;
    private String notes;
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
