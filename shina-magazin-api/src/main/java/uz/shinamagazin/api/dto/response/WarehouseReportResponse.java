package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WarehouseReportResponse {
    private long totalProducts;
    private long totalStock;
    private long lowStockCount;
    private long outOfStockCount;
    private BigDecimal totalStockValue;
    private BigDecimal totalPotentialRevenue;
    private long totalIncoming;
    private long totalOutgoing;
    private long inMovementsCount;
    private long outMovementsCount;
    private List<StockByCategory> stockByCategory;
    private List<StockByBrand> stockByBrand;
    private List<LowStockProduct> lowStockProducts;
    private List<MovementSummary> recentMovements;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StockByCategory {
        private Long categoryId;
        private String categoryName;
        private long productCount;
        private long totalStock;
        private BigDecimal stockValue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StockByBrand {
        private Long brandId;
        private String brandName;
        private long productCount;
        private long totalStock;
        private BigDecimal stockValue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LowStockProduct {
        private Long productId;
        private String productName;
        private String productSku;
        private int currentStock;
        private int minStockLevel;
        private BigDecimal sellingPrice;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MovementSummary {
        private String date;
        private long inCount;
        private long outCount;
        private int inQuantity;
        private int outQuantity;
    }
}
