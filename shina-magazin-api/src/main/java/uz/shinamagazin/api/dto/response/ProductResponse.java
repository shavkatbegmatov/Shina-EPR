package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.annotation.ExportColumn;
import uz.shinamagazin.api.annotation.ExportColumn.ColumnType;
import uz.shinamagazin.api.annotation.ExportEntity;
import uz.shinamagazin.api.entity.Product;
import uz.shinamagazin.api.enums.Season;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ExportEntity(
    sheetName = "Mahsulotlar",
    title = "Mahsulotlar Hisoboti",
    orientation = ExportEntity.Orientation.LANDSCAPE
)
public class ProductResponse {
    @ExportColumn(header = "ID", order = 1, type = ColumnType.NUMBER)
    private Long id;

    @ExportColumn(header = "SKU", order = 2)
    private String sku;

    @ExportColumn(header = "Nomi", order = 3)
    private String name;

    @ExportColumn(header = "Brend", order = 4)
    private String brandName;

    private Long brandId; // Not exported

    @ExportColumn(header = "Kategoriya", order = 5)
    private String categoryName;

    private Long categoryId; // Not exported

    @ExportColumn(header = "Kenglik", order = 6, type = ColumnType.NUMBER)
    private Integer width;

    @ExportColumn(header = "Profil", order = 7, type = ColumnType.NUMBER)
    private Integer profile;

    @ExportColumn(header = "Diametr", order = 8, type = ColumnType.NUMBER)
    private Integer diameter;

    @ExportColumn(header = "O'lcham", order = 9)
    private String sizeString;

    @ExportColumn(header = "Yuk indeksi", order = 10)
    private String loadIndex;

    @ExportColumn(header = "Tezlik reytingi", order = 11)
    private String speedRating;

    @ExportColumn(header = "Mavsum", order = 12, type = ColumnType.ENUM)
    private Season season;

    @ExportColumn(header = "Xarid narxi", order = 13, type = ColumnType.CURRENCY)
    private BigDecimal purchasePrice;

    @ExportColumn(header = "Sotuv narxi", order = 14, type = ColumnType.CURRENCY)
    private BigDecimal sellingPrice;

    @ExportColumn(header = "Miqdor", order = 15, type = ColumnType.NUMBER)
    private Integer quantity;

    @ExportColumn(header = "Minimal zaxira", order = 16, type = ColumnType.NUMBER)
    private Integer minStockLevel;

    @ExportColumn(header = "Kam zaxira", order = 17, type = ColumnType.BOOLEAN)
    private boolean lowStock;

    private String description; // Not exported
    private String imageUrl; // Not exported

    @ExportColumn(header = "Faol", order = 18, type = ColumnType.BOOLEAN)
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
