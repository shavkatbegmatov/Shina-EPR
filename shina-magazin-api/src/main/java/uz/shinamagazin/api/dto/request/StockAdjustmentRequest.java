package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.enums.MovementType;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockAdjustmentRequest {

    @NotNull(message = "Mahsulot ID kiritilishi shart")
    private Long productId;

    @NotNull(message = "Harakat turi tanlanishi shart")
    private MovementType movementType;

    /**
     * IN/OUT uchun — harakat miqdori (musbat bo'lishi shart).
     * ADJUSTMENT uchun — zaxiraning YANGI absolyut qiymati (0 ham to'g'ri).
     *
     * Manfiy qiymat zaxirani buzadi: `OUT` bilan -100 yuborilsa qorovul
     * (`quantity > previousStock`) o'tib ketardi va zaxira 100 taga OSHARDI.
     * Turga bog'liq aniq qoida StockMovementService'da.
     */
    @NotNull(message = "Miqdor kiritilishi shart")
    @Min(value = 0, message = "Miqdor manfiy bo'lishi mumkin emas")
    private Integer quantity;

    private String referenceType;

    private String notes;

    // Kirim (IN) uchun ixtiyoriy: ta'minotchi va birlik narxi
    private Long supplierId;

    private BigDecimal unitPrice;
}
