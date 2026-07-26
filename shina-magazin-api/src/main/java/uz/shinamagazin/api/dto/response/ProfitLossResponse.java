package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.enums.ExpenseCategory;

import java.math.BigDecimal;
import java.util.List;

/**
 * Foyda va zarar hisoboti (P&amp;L).
 *
 * <p>Ilgari tizim faqat yalpi marjani ko'rsatardi. Yalpi marja katta bo'lib,
 * ijara/maosh/kommunaldan keyin sof natija manfiy chiqishi mumkin — do'kon
 * egasi buni ko'rmasdi.
 *
 * <pre>
 *   Tushum
 * − Qaytarishlar
 * = Sof tushum
 * − Tannarx (COGS)
 * = Yalpi foyda
 * − Xarajatlar
 * = SOF FOYDA
 * </pre>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfitLossResponse {

    private String startDate;
    private String endDate;

    // ─── Tushum ───
    /** Yakunlangan savdolar summasi (bekor qilinganlarsiz). */
    private BigDecimal revenue;
    /** Davrda qaytarilgan summa. */
    private BigDecimal returns;
    /** revenue − returns. */
    private BigDecimal netRevenue;

    // ─── Tannarx ───
    /** Sotilgan tovarning tannarxi, qaytarilganlari chegirilgan. */
    private BigDecimal costOfGoodsSold;
    /** netRevenue − costOfGoodsSold. */
    private BigDecimal grossProfit;
    /** Yalpi marja, % (netRevenue nolga teng bo'lsa 0). */
    private BigDecimal grossMarginPercent;

    // ─── Xarajatlar ───
    private BigDecimal totalExpenses;
    private List<ExpenseBreakdown> expensesByCategory;

    // ─── Natija ───
    /** grossProfit − totalExpenses. Manfiy bo'lishi mumkin — bu ZARAR. */
    private BigDecimal netProfit;
    /** Sof marja, %. */
    private BigDecimal netMarginPercent;

    private long salesCount;
    private long returnsCount;
    private long expensesCount;

    /** Kunlik dinamika — grafik uchun. */
    private List<DailyProfitLoss> daily;

    /**
     * Tannarxi noma'lum savdo qatorlari soni.
     *
     * <p>Xarid narxi kiritilmagan mahsulotlar uchun tannarx 0 deb olinadi,
     * ya'ni yalpi foyda OSHIB ko'rinadi. Bu son noldan katta bo'lsa hisobotga
     * ishonch cheklangan — UI buni ogohlantirish sifatida ko'rsatadi.
     */
    private long itemsWithoutCost;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExpenseBreakdown {
        private ExpenseCategory category;
        private BigDecimal amount;
        private long count;
        /** Umumiy xarajatdagi ulushi, %. */
        private BigDecimal percent;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyProfitLoss {
        private String date;
        private BigDecimal revenue;
        private BigDecimal grossProfit;
        private BigDecimal expenses;
        private BigDecimal netProfit;
    }
}
