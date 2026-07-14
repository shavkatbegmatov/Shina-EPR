package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.enums.AttributeType;

import java.math.BigDecimal;
import java.util.List;

/**
 * Storefront filtr paneli uchun facetlar: kategoriya daraxti (mahsulot soni bilan),
 * narx diapazoni va tanlangan kategoriya (merosi bilan) atribut filtrlari.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CatalogFacetsResponse {

    private List<CategoryResponse> categories;
    private BigDecimal priceMin;
    private BigDecimal priceMax;
    private List<AttributeFacet> attributes;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttributeFacet {
        private Long id;
        private String name;
        private String code;
        private AttributeType type;
        private String unit;
        private List<OptionFacet> options;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OptionFacet {
        private Long id;
        private String value;
        private long count;
    }
}
