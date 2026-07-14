package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.CategoryAttribute;

/**
 * Kategoriyaning (o'zining yoki ota kategoriyadan meros) bitta atributi.
 * Mahsulot formasi va filtr paneli shu ro'yxatdan quriladi.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryAttributeResponse {
    private AttributeResponse attribute;
    private Boolean required;
    private Integer sortOrder;
    // Meros bo'lsa — qaysi ota kategoriyadan kelgani
    private boolean inherited;
    private Long sourceCategoryId;
    private String sourceCategoryName;

    public static CategoryAttributeResponse from(CategoryAttribute ca, boolean inherited) {
        return CategoryAttributeResponse.builder()
                .attribute(AttributeResponse.from(ca.getAttribute()))
                .required(ca.getRequired())
                .sortOrder(ca.getSortOrder())
                .inherited(inherited)
                .sourceCategoryId(ca.getCategory().getId())
                .sourceCategoryName(ca.getCategory().getName())
                .build();
    }
}
