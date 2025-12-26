package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.enums.Season;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequest {

    @NotBlank(message = "SKU kiritilishi shart")
    @Size(max = 50, message = "SKU 50 ta belgidan oshmasligi kerak")
    private String sku;

    @NotBlank(message = "Nomi kiritilishi shart")
    @Size(max = 200, message = "Nomi 200 ta belgidan oshmasligi kerak")
    private String name;

    private Long brandId;
    private Long categoryId;

    @Min(value = 100, message = "Kenglik kamida 100 mm bo'lishi kerak")
    @Max(value = 400, message = "Kenglik 400 mm dan oshmasligi kerak")
    private Integer width;

    @Min(value = 20, message = "Profil kamida 20% bo'lishi kerak")
    @Max(value = 100, message = "Profil 100% dan oshmasligi kerak")
    private Integer profile;

    @Min(value = 10, message = "Diametr kamida 10 dyuym bo'lishi kerak")
    @Max(value = 30, message = "Diametr 30 dyuymdan oshmasligi kerak")
    private Integer diameter;

    private String loadIndex;
    private String speedRating;
    private Season season;

    @DecimalMin(value = "0", message = "Sotib olish narxi manfiy bo'lmasligi kerak")
    private BigDecimal purchasePrice;

    @NotNull(message = "Sotish narxi kiritilishi shart")
    @DecimalMin(value = "0.01", message = "Sotish narxi musbat bo'lishi kerak")
    private BigDecimal sellingPrice;

    @Min(value = 0, message = "Miqdor manfiy bo'lmasligi kerak")
    @Builder.Default
    private Integer quantity = 0;

    @Min(value = 0, message = "Minimal zaxira manfiy bo'lmasligi kerak")
    @Builder.Default
    private Integer minStockLevel = 5;

    private String description;
    private String imageUrl;
}
