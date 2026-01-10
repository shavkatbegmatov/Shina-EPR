package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.enums.PaymentMethod;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DebtPaymentRequest {

    @NotNull(message = "To'lov summasi kiritilishi shart")
    @Positive(message = "To'lov summasi musbat bo'lishi kerak")
    private BigDecimal amount;

    @NotNull(message = "To'lov usuli tanlanishi shart")
    private PaymentMethod method;

    private String referenceNumber;

    private String notes;
}
