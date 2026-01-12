package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRequest {

    @NotNull(message = "To'lov summasi kiritilishi shart")
    @DecimalMin(value = "0.01", message = "To'lov summasi 0 dan katta bo'lishi kerak")
    private BigDecimal amount;

    @NotNull(message = "To'lov sanasi kiritilishi shart")
    private LocalDate paymentDate;

    @NotNull(message = "To'lov usuli tanlanishi shart")
    private PaymentMethod paymentMethod;

    private String referenceNumber;

    private String notes;
}
