package uz.shinamagazin.api.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseRequest {

    @NotNull(message = "Ta'minotchi ID kiritilishi shart")
    private Long supplierId;

    @NotNull(message = "Sana kiritilishi shart")
    private LocalDate orderDate;

    @NotEmpty(message = "Mahsulotlar ro'yxati bo'sh bo'lmasligi kerak")
    @Valid
    private List<PurchaseItemRequest> items;

    @NotNull(message = "To'langan summa kiritilishi shart")
    @DecimalMin(value = "0", message = "To'langan summa manfiy bo'lmasligi kerak")
    @Builder.Default
    private BigDecimal paidAmount = BigDecimal.ZERO;

    private String notes;
}
