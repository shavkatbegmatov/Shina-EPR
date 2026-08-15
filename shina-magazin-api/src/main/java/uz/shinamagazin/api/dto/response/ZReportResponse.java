package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.enums.PaymentMethod;

import java.math.BigDecimal;
import java.util.List;

/**
 * Z-hisobot — smena yakuni.
 *
 * <p>Asosiy savol: kassir qancha pul topshirishi kerak va sanagan pul unga
 * mos keladimi. Shu sababli naqd oqimi alohida ajratilgan.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZReportResponse {

    private CashShiftResponse shift;

    /** Bekor qilinmagan savdolar soni. */
    private long salesCount;
    /** Bekor qilingan savdolar soni — alohida ko'rsatiladi (kassaga pul kelmagan). */
    private long cancelledCount;
    /** Umumiy savdo summasi (bekor qilinganlarsiz). */
    private BigDecimal grossTotal;
    /** Smenada berilgan qarz — pul kassaga TUSHMAGAN qism. */
    private BigDecimal debtIssued;

    private List<PaymentBreakdown> byPaymentMethod;

    // ─── Naqd solishtiruvi ───
    /** Smena boshidagi mayda pul. */
    private BigDecimal openingFloat;
    /** Naqd savdolardan tushgan pul (faqat CASH, faqat haqiqatan to'langan qism). */
    private BigDecimal cashReceived;
    /** Qaytarishlarda kassadan CHIQQAN pul. */
    private BigDecimal cashRefunded;
    /** Smenadagi qaytarishlar soni. */
    private long returnsCount;
    /** Shu smenada qabul qilingan NAQD qarz to'lovlari — kassaga tushgan pul. */
    private BigDecimal cashDebtPayments;
    /** Shu smenada qabul qilingan naqd qarz to'lovlari soni. */
    private long debtPaymentsCount;
    /** Smenada kassadan chiqqan naqd XARAJAT. */
    private BigDecimal cashExpenses;
    /** Smenadagi xarajatlar soni (naqd bo'lmaganlari ham). */
    private long expensesCount;
    /**
     * openingFloat + cashReceived − (sotuvlarga keyin qilingan qarz to'lovlari)
     * − cashRefunded + (shu smena savdolarining paidAmount'ida allaqachon aks
     * etgan qaytarimlar) + cashDebtPayments − cashExpenses.
     */
    private BigDecimal expectedCash;
    /** Kassir sanagan pul (smena yopilmagan bo'lsa null). */
    private BigDecimal countedCash;
    /** countedCash − expectedCash; manfiy = kamomad. */
    private BigDecimal difference;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentBreakdown {
        private PaymentMethod method;
        private long count;
        /** Savdo summasi. */
        private BigDecimal total;
        /** Haqiqatan to'langan summa (qarzga sotilgan qism bundan tashqarida). */
        private BigDecimal paid;
    }
}
