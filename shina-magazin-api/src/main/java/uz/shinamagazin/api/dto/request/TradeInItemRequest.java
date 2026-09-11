package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Barter qatori: mijozdan qabul qilinayotgan eski shina.
 *
 * <p>Ikki yo'l: mavjud B/U mahsulotni {@code productId} bilan ko'rsatish,
 * yoki o'lchamni berish — server o'lcham (va brend) bo'yicha B/U mahsulotni
 * topadi yoki yaratadi ({@code BU-205-55-R16}). Kassir SKU o'ylab
 * o'tirmaydi.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TradeInItemRequest {

    /** Mavjud B/U mahsulot (ixtiyoriy). Berilmasa o'lcham majburiy. */
    private Long productId;

    @Min(value = 100, message = "Shina eni 100 dan kichik bo'lmasligi kerak")
    @Max(value = 999, message = "Shina eni 999 dan katta bo'lmasligi kerak")
    private Integer width;

    @Min(value = 20, message = "Profil 20 dan kichik bo'lmasligi kerak")
    @Max(value = 100, message = "Profil 100 dan katta bo'lmasligi kerak")
    private Integer profile;

    @Min(value = 10, message = "Diametr 10 dan kichik bo'lmasligi kerak")
    @Max(value = 30, message = "Diametr 30 dan katta bo'lmasligi kerak")
    private Integer diameter;

    @Size(max = 100, message = "Brend nomi 100 belgidan oshmasligi kerak")
    private String brandName;

    /** Holati — "protektor 60%", "bir mavsum yurgan" va h.k. */
    @Size(max = 200, message = "Holat 200 belgidan oshmasligi kerak")
    private String condition;

    @NotNull(message = "Miqdor kiritilishi shart")
    @Min(value = 1, message = "Miqdor kamida 1 bo'lishi kerak")
    private Integer quantity;

    /** Bir dona uchun mijozga beriladigan kredit (so'm). */
    @NotNull(message = "Eski shina narxi kiritilishi shart")
    @DecimalMin(value = "0", message = "Eski shina narxi manfiy bo'lmasligi kerak")
    private BigDecimal unitValue;

    /**
     * B/U mahsulotning sotish narxi — faqat YANGI mahsulot yaratilganda
     * ishlatiladi (mavjud mahsulot narxi kartochkada tahrirlanadi).
     */
    @DecimalMin(value = "0", message = "Sotish narxi manfiy bo'lmasligi kerak")
    private BigDecimal resalePrice;
}
