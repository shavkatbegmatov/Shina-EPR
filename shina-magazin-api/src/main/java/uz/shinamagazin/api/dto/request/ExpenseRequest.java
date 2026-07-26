package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.enums.ExpenseCategory;
import uz.shinamagazin.api.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpenseRequest {

    @NotNull(message = "Sana majburiy")
    private LocalDate expenseDate;

    @NotNull(message = "Turkum majburiy")
    private ExpenseCategory category;

    // inclusive = false: nol summali xarajatning ma'nosi yo'q, bazadagi
    // CHECK (amount > 0) bilan bir xil qoida.
    @NotNull(message = "Summa majburiy")
    @DecimalMin(value = "0", inclusive = false, message = "Summa noldan katta bo'lishi kerak")
    private BigDecimal amount;

    @Size(max = 500, message = "Izoh 500 belgidan oshmasligi kerak")
    private String description;

    @NotNull(message = "To'lov usuli majburiy")
    private PaymentMethod paymentMethod;
}
