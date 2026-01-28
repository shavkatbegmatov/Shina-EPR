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
public class PurchaseStatsResponse {
    private Long totalPurchases;
    private Long todayPurchases;
    private Long monthPurchases;
    private BigDecimal totalAmount;
    private BigDecimal totalDebt;
    private Long pendingReturns;
}
