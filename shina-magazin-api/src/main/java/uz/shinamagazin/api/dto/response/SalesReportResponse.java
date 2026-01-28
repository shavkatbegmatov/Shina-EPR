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
public class SalesReportResponse {
    private BigDecimal totalRevenue;
    private BigDecimal totalProfit;
    private long totalSalesCount;
    private long completedSalesCount;
    private long cancelledSalesCount;
    private BigDecimal averageSaleAmount;
    private BigDecimal cashTotal;
    private BigDecimal cardTotal;
    private BigDecimal transferTotal;
    private BigDecimal debtTotal;
    private List<DailySalesData> dailyData;
    private List<TopSellingProduct> topProducts;
    private List<TopCustomer> topCustomers;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailySalesData {
        private String date;
        private BigDecimal revenue;
        private long salesCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopSellingProduct {
        private Long productId;
        private String productName;
        private String productSku;
        private int quantitySold;
        private BigDecimal totalRevenue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopCustomer {
        private Long customerId;
        private String customerName;
        private String customerPhone;
        private int purchaseCount;
        private BigDecimal totalSpent;
    }
}
