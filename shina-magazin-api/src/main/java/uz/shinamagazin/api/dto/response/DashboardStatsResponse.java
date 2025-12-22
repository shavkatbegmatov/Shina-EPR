package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsResponse {
    private long todaySalesCount;
    private BigDecimal todayRevenue;
    private BigDecimal totalRevenue;
    private long totalProducts;
    private Long totalStock;
    private long lowStockCount;
    private long totalCustomers;
    private BigDecimal totalDebt;
}
