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
public class ChartDataResponse {

    // Sotuvlar trendi (oxirgi 7 yoki 30 kun)
    private List<SalesTrendItem> salesTrend;

    // Top sotilgan mahsulotlar
    private List<TopProductItem> topProducts;

    // To'lov usullari bo'yicha
    private List<PaymentMethodItem> paymentMethods;

    // Kategoriyalar bo'yicha sotuvlar
    private List<CategorySalesItem> categorySales;

    // Hafta kunlari bo'yicha sotuvlar
    private List<WeekdaySalesItem> weekdaySales;

    // Soatlar bo'yicha sotuvlar (bugungi)
    private List<HourlySalesItem> hourlySales;

    // Umumiy statistika
    private BigDecimal thisWeekRevenue;
    private BigDecimal lastWeekRevenue;
    private BigDecimal thisMonthRevenue;
    private BigDecimal lastMonthRevenue;
    private Double revenueGrowthPercent;
    private Double salesGrowthPercent;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SalesTrendItem {
        private String date;       // "2026-01-12" yoki "12-yan"
        private Long salesCount;
        private BigDecimal revenue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopProductItem {
        private Long productId;
        private String productName;
        private String productSku;
        private Long quantitySold;
        private BigDecimal revenue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentMethodItem {
        private String method;      // CASH, CARD, TRANSFER, MIXED, DEBT
        private String methodLabel; // Naqd, Karta, O'tkazma, Aralash, Qarz
        private Long count;
        private BigDecimal amount;
        private Double percentage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategorySalesItem {
        private Long categoryId;
        private String categoryName;
        private Long quantitySold;
        private BigDecimal revenue;
        private Double percentage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WeekdaySalesItem {
        private String day;         // "Dush", "Sesh", ...
        private Integer dayOfWeek;  // 1-7
        private Long salesCount;
        private BigDecimal revenue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HourlySalesItem {
        private Integer hour;       // 0-23
        private String hourLabel;   // "09:00", "10:00", ...
        private Long salesCount;
        private BigDecimal revenue;
    }
}
