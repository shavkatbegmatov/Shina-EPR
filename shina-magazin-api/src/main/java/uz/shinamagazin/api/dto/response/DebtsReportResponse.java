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
public class DebtsReportResponse {
    private BigDecimal totalActiveDebt;
    private BigDecimal totalPaidDebt;
    private BigDecimal totalOverdueDebt;
    private long activeDebtsCount;
    private long paidDebtsCount;
    private long overdueDebtsCount;
    private BigDecimal totalPaymentsReceived;
    private long paymentsCount;
    private BigDecimal averageDebtAmount;
    private List<CustomerDebtSummary> topDebtors;
    private List<DebtAging> debtAging;
    private List<PaymentSummary> recentPayments;
    private List<OverdueDebt> overdueDebts;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerDebtSummary {
        private Long customerId;
        private String customerName;
        private String customerPhone;
        private BigDecimal totalDebt;
        private int debtsCount;
        private int overdueCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DebtAging {
        private String period;
        private long count;
        private BigDecimal amount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentSummary {
        private String date;
        private long count;
        private BigDecimal amount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OverdueDebt {
        private Long debtId;
        private Long customerId;
        private String customerName;
        private String customerPhone;
        private BigDecimal remainingAmount;
        private String dueDate;
        private int daysOverdue;
    }
}
