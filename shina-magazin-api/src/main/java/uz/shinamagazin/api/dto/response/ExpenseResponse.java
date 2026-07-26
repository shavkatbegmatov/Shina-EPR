package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.Expense;
import uz.shinamagazin.api.enums.ExpenseCategory;
import uz.shinamagazin.api.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpenseResponse {

    private Long id;
    private LocalDate expenseDate;
    private ExpenseCategory category;
    private BigDecimal amount;
    private String description;
    private PaymentMethod paymentMethod;
    private Long shiftId;
    private String createdByName;
    private LocalDateTime createdAt;

    public static ExpenseResponse from(Expense expense) {
        return ExpenseResponse.builder()
                .id(expense.getId())
                .expenseDate(expense.getExpenseDate())
                .category(expense.getCategory())
                .amount(expense.getAmount())
                .description(expense.getDescription())
                .paymentMethod(expense.getPaymentMethod())
                .shiftId(expense.getShift() != null ? expense.getShift().getId() : null)
                .createdByName(expense.getCreatedBy() != null ? expense.getCreatedBy().getFullName() : null)
                .createdAt(expense.getCreatedAt())
                .build();
    }
}
