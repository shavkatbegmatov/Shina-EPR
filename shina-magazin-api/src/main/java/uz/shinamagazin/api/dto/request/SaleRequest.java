package uz.shinamagazin.api.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.enums.PaymentMethod;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaleRequest {

    private Long customerId;

    @NotEmpty(message = "Mahsulotlar ro'yxati bo'sh bo'lmasligi kerak")
    @Valid
    private List<SaleItemRequest> items;

    @DecimalMin(value = "0", message = "Chegirma manfiy bo'lmasligi kerak")
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @DecimalMin(value = "0", message = "Chegirma foizi manfiy bo'lmasligi kerak")
    @DecimalMax(value = "100", message = "Chegirma foizi 100% dan oshmasligi kerak")
    @Builder.Default
    private BigDecimal discountPercent = BigDecimal.ZERO;

    @NotNull(message = "To'langan summa kiritilishi shart")
    @DecimalMin(value = "0", message = "To'langan summa manfiy bo'lmasligi kerak")
    private BigDecimal paidAmount;

    @NotNull(message = "To'lov usuli kiritilishi shart")
    private PaymentMethod paymentMethod;

    private String notes;
}
