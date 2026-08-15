package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Qarzlar sahifasidagi "to'landi" statistikasi — HAQIQIY to'lov
 * yozuvlaridan ({@code payments}, DEBT_PAYMENT) hisoblanadi.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DebtPaymentStatsResponse {

    /** Bugun qabul qilingan qarz to'lovlari. */
    private BigDecimal paidToday;
    /** Shu hafta (dushanbadan) qabul qilingan qarz to'lovlari. */
    private BigDecimal paidThisWeek;
    /** Shu oy (1-sanadan) qabul qilingan qarz to'lovlari. */
    private BigDecimal paidThisMonth;
}
