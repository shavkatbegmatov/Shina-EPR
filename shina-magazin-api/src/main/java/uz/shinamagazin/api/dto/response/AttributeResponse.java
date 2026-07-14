package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.Attribute;
import uz.shinamagazin.api.entity.AttributeOption;
import uz.shinamagazin.api.enums.AttributeType;

import java.util.Comparator;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttributeResponse {
    private Long id;
    private String name;
    private String code;
    private AttributeType type;
    private String unit;
    private Boolean filterable;
    private Integer sortOrder;
    private Boolean active;
    private List<OptionResponse> options;
    // Nechta kategoriyaga biriktirilgan (admin ro'yxati uchun)
    private Long categoryCount;
    // Nechta mahsulotda qiymati bor (o'chirish/turini o'zgartirishdan oldin ogohlantirish uchun)
    private Long valueCount;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OptionResponse {
        private Long id;
        private String value;
        private Integer sortOrder;

        public static OptionResponse from(AttributeOption option) {
            return OptionResponse.builder()
                    .id(option.getId())
                    .value(option.getValue())
                    .sortOrder(option.getSortOrder())
                    .build();
        }
    }

    public static AttributeResponse from(Attribute attribute) {
        return from(attribute, null, null);
    }

    public static AttributeResponse from(Attribute attribute, Long categoryCount, Long valueCount) {
        return AttributeResponse.builder()
                .id(attribute.getId())
                .name(attribute.getName())
                .code(attribute.getCode())
                .type(attribute.getType())
                .unit(attribute.getUnit())
                .filterable(attribute.getFilterable())
                .sortOrder(attribute.getSortOrder())
                .active(attribute.getActive())
                .options(attribute.getOptions() == null ? List.of() : attribute.getOptions().stream()
                        .filter(o -> Boolean.TRUE.equals(o.getActive()))
                        .sorted(Comparator.comparing(AttributeOption::getSortOrder)
                                .thenComparing(AttributeOption::getId))
                        .map(OptionResponse::from)
                        .toList())
                .categoryCount(categoryCount)
                .valueCount(valueCount)
                .build();
    }
}
