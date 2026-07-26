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
    /** Yalpi savdo summasi (bekor qilinganlarsiz, qaytarishlar ayirilmagan). */
    private BigDecimal totalRevenue;
    /** Davrda qaytarilgan summa. */
    private BigDecimal returnsTotal;
    /** totalRevenue − returnsTotal. */
    private BigDecimal netRevenue;
    /** Yalpi foyda: sof tushum − tannarx. */
    private BigDecimal totalProfit;
    /** Bekor qilinganlar bilan birga barcha savdolar. */
    private long totalSalesCount;
    /** Bekor qilinmagan savdolar (qaytarilganlari ham shu yerda). */
    private long completedSalesCount;
    private long cancelledSalesCount;
    /** Davrdagi qaytarishlar soni. */
    private long returnsCount;
    private BigDecimal averageSaleAmount;
    private BigDecimal cashTotal;
    private BigDecimal cardTotal;
    private BigDecimal transferTotal;
    private BigDecimal debtTotal;
    /**
     * Tannarxi noma'lum savdo qatorlari.
     *
     * <p>Ular uchun tannarx nol deb olinadi, ya'ni foyda OSHIB ko'rinadi.
     * Noldan katta bo'lsa UI ogohlantirish ko'rsatadi.
     */
    private long itemsWithoutCost;
    private List<DailySalesData> dailyData;
    private List<TopSellingProduct> topProducts;
    private List<TopCustomer> topCustomers;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailySalesData {
        private String date;
        /** Yalpi tushum. */
        private BigDecimal revenue;
        /** O'sha kunda qaytarilgan summa (boshqa davrdagi savdoga tegishli bo'lishi mumkin). */
        private BigDecimal returns;
        private BigDecimal netRevenue;
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
        /** SOF miqdor: sotilgan − qaytarilgan. */
        private int quantitySold;
        private int quantityReturned;
        /** Sof tushum — savdo darajasidagi chegirma ulushga qarab taqsimlangan. */
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
