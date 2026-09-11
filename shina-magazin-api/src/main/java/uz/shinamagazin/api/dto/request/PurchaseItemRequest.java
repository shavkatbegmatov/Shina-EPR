package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Kirim hujjati qatori. Narx va bonus HUJJAT VALYUTASIDA (so'rovdagi
 * {@code currency}); so'mga server aylantiradi.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseItemRequest {

    @NotNull(message = "Mahsulot ID kiritilishi shart")
    private Long productId;

    @NotNull(message = "Miqdor kiritilishi shart")
    @Min(value = 1, message = "Miqdor kamida 1 bo'lishi kerak")
    private Integer quantity;

    @NotNull(message = "Birlik narxi kiritilishi shart")
    @DecimalMin(value = "0", message = "Birlik narxi manfiy bo'lmasligi kerak")
    private BigDecimal unitPrice;

    /** Bir dona uchun bonus (shablondagi "Bonus $"), hujjat valyutasida. */
    @DecimalMin(value = "0", message = "Bonus manfiy bo'lmasligi kerak")
    @Builder.Default
    private BigDecimal bonusPerUnit = BigDecimal.ZERO;

    /** Qator bonusi foizda ("Bonus %") — berilsa {@code bonusPerUnit} e'tiborga olinmaydi. */
    @DecimalMin(value = "0", message = "Bonus foizi manfiy bo'lmasligi kerak")
    @DecimalMax(value = "100", message = "Bonus foizi 100% dan oshmasligi kerak")
    @Builder.Default
    private BigDecimal bonusPercent = BigDecimal.ZERO;
}
