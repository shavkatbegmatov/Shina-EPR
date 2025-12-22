package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.Product;
import uz.shinamagazin.api.enums.Season;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponse {
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
    private BigDecimal purchasePrice;
    private BigDecimal sellingPrice;
    private Integer quantity;
    private Integer minStockLevel;
    private boolean lowStock;
    private String description;
    private String imageUrl;
    private Boolean active;

    public static ProductResponse from(Product product) {
        return ProductResponse.builder()
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
                .purchasePrice(product.getPurchasePrice())
                .sellingPrice(product.getSellingPrice())
                .quantity(product.getQuantity())
                .minStockLevel(product.getMinStockLevel())
                .lowStock(product.getQuantity() <= product.getMinStockLevel())
                .description(product.getDescription())
                .imageUrl(product.getImageUrl())
                .active(product.getActive())
                .build();
    }
}
