package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.Product;
import uz.shinamagazin.api.enums.Season;

import java.math.BigDecimal;

/**
 * Ommaviy storefront katalogi uchun mahsulot DTO'si.
 *
 * MUHIM: ProductResponse'dan farqli — xarid narxi (purchasePrice/tannarx) va
 * ichki maydonlar (minStockLevel) ATAYIN chiqarib tashlangan. Bu auth talab
 * qilmaydigan ommaviy endpoint, shuning uchun faqat mijozga ko'rinadigan
 * maydonlar (storefront ko'rsatadigan) uzatiladi.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CatalogProductResponse {
    private Long id;
    private String sku;
    private String name;
    private String brandName;
    private Long brandId;
    private String categoryName;
    private Long categoryId;
    private Integer width;
    private Integer profile;
    private Integer diameter;
    private String sizeString;
    private String loadIndex;
    private String speedRating;
    private Season season;
    private BigDecimal sellingPrice;
    private Integer quantity;
    private boolean lowStock;
    private String description;
    private String imageUrl;

    // Xususiyatlar — faqat bitta mahsulot so'ralganda to'ldiriladi (ro'yxatda null)
    private java.util.List<ProductAttributeValueResponse> attributes;

    public static CatalogProductResponse from(Product product) {
        return CatalogProductResponse.builder()
                .id(product.getId())
                .sku(product.getSku())
                .name(product.getName())
                .brandName(product.getBrand() != null ? product.getBrand().getName() : null)
                .brandId(product.getBrand() != null ? product.getBrand().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .width(product.getWidth())
                .profile(product.getProfile())
                .diameter(product.getDiameter())
                .sizeString(product.getSizeString())
                .loadIndex(product.getLoadIndex())
                .speedRating(product.getSpeedRating())
                .season(product.getSeason())
                .sellingPrice(product.getSellingPrice())
                .quantity(product.getQuantity())
                .lowStock(product.getQuantity() <= product.getMinStockLevel())
                .description(product.getDescription())
                .imageUrl(product.getImageUrl())
                .build();
    }
}
