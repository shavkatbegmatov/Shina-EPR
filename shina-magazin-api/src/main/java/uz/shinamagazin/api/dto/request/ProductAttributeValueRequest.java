package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Mahsulotning bitta atributi uchun qiymat. Turi bo'yicha faqat tegishli maydon
 * to'ldiriladi: SELECT/MULTI_SELECT -> optionIds, NUMBER -> valueNumber,
 * BOOLEAN -> valueBool, TEXT -> valueText.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductAttributeValueRequest {

    @NotNull(message = "attributeId kiritilishi shart")
    private Long attributeId;

    @Builder.Default
    private List<Long> optionIds = new ArrayList<>();

    private String valueText;
    private BigDecimal valueNumber;
    private Boolean valueBool;
}
