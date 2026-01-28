package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.enums.MovementType;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockAdjustmentRequest {

    @NotNull(message = "Mahsulot ID kiritilishi shart")
    private Long productId;

    @NotNull(message = "Harakat turi tanlanishi shart")
    private MovementType movementType;

    @NotNull(message = "Miqdor kiritilishi shart")
    private Integer quantity;

    private String referenceType;

    private String notes;
}
