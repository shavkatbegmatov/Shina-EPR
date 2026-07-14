package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.ProductAttributeValue;
import uz.shinamagazin.api.enums.AttributeType;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Mahsulotning bitta atributi bo'yicha jamlangan qiymati.
 * MULTI_SELECT variantlari bitta yozuvga yig'iladi (optionIds/values).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductAttributeValueResponse {
    private Long attributeId;
    private String name;
    private String code;
    private AttributeType type;
    private String unit;
    @Builder.Default
    private List<Long> optionIds = new ArrayList<>();
    private String valueText;
    private BigDecimal valueNumber;
    private Boolean valueBool;
    // Ko'rsatish uchun tayyor qiymat(lar): variantlar, son+birlik, matn yoki Ha/Yo'q
    @Builder.Default
    private List<String> values = new ArrayList<>();

    /** Bir mahsulotning barcha qiymat qatorlarini atribut bo'yicha guruhlaydi. */
    public static List<ProductAttributeValueResponse> fromValues(List<ProductAttributeValue> rows) {
        Map<Long, ProductAttributeValueResponse> byAttribute = new LinkedHashMap<>();
        for (ProductAttributeValue row : rows) {
            ProductAttributeValueResponse dto = byAttribute.computeIfAbsent(
                    row.getAttribute().getId(),
                    id -> ProductAttributeValueResponse.builder()
                            .attributeId(id)
                            .name(row.getAttribute().getName())
                            .code(row.getAttribute().getCode())
                            .type(row.getAttribute().getType())
                            .unit(row.getAttribute().getUnit())
                            .build());

            if (row.getOption() != null) {
                dto.getOptionIds().add(row.getOption().getId());
                dto.getValues().add(row.getOption().getValue());
            } else if (row.getValueNumber() != null) {
                dto.setValueNumber(row.getValueNumber());
                dto.getValues().add(formatNumber(row.getValueNumber(), row.getAttribute().getUnit()));
            } else if (row.getValueBool() != null) {
                dto.setValueBool(row.getValueBool());
                dto.getValues().add(Boolean.TRUE.equals(row.getValueBool()) ? "Ha" : "Yo'q");
            } else if (row.getValueText() != null) {
                dto.setValueText(row.getValueText());
                dto.getValues().add(row.getValueText());
            }
        }
        return new ArrayList<>(byAttribute.values());
    }

    private static String formatNumber(BigDecimal number, String unit) {
        String text = number.stripTrailingZeros().toPlainString();
        return unit == null || unit.isBlank() ? text : text + " " + unit;
    }
}
