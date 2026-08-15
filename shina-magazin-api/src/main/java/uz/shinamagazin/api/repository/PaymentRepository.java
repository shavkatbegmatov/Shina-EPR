package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.Payment;
import uz.shinamagazin.api.enums.PaymentType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findBySaleId(Long saleId);

    Page<Payment> findByCustomerId(Long customerId, Pageable pageable);

    List<Payment> findByCustomerIdAndPaymentType(Long customerId, PaymentType paymentType);

    @Query("SELECT p FROM Payment p WHERE p.paymentDate BETWEEN :start AND :end")
    List<Payment> findByPaymentDateBetween(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.paymentDate >= :start AND p.paymentDate < :end")
    BigDecimal getTodayPaymentsTotal(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * Sotuvlar bo'yicha KEYINCHALIK qilingan qarz to'lovlari.
     *
     * <p>`makePayment` to'lovni `sale.paidAmount` ga qo'shadi, ya'ni sotuv
     * yopilgandan keyin ham u o'sib boradi. Davriy hisobotda ustunlar SHU
     * sotuvlar keltirgan pulni ko'rsatishi kerak, shuning uchun keyingi
     * to'lovlar ayiriladi — ular o'z davrida (Qarzlar hisoboti va
     * "to'landi" statistikasi) allaqachon sanaladi.
     */
    @Query("""
            SELECT p.sale.id, COALESCE(SUM(p.amount), 0) FROM Payment p
            WHERE p.paymentType = uz.shinamagazin.api.enums.PaymentType.DEBT_PAYMENT
              AND p.sale.id IN :saleIds
            GROUP BY p.sale.id""")
    List<Object[]> sumDebtPaymentsBySale(@Param("saleIds") java.util.Collection<Long> saleIds);

    default Map<Long, BigDecimal> debtPaymentsBySale(java.util.Collection<Long> saleIds) {
        if (saleIds.isEmpty()) {
            return Map.of();
        }
        return sumDebtPaymentsBySale(saleIds).stream()
                .collect(java.util.stream.Collectors.toMap(
                        row -> (Long) row[0],
                        row -> (BigDecimal) row[1]));
    }

    /**
     * Davr ichida qabul qilingan qarz to'lovlari yig'indisi — Qarzlar
     * sahifasidagi "bugun/hafta/oy to'landi" statistikasi uchun. Ilgari bu
     * raqamlar to'lovlardan emas, PAID qarzlarning yaratilgan sanasi va asl
     * summasidan hisoblanardi: bugun undirilgan eski qarz 0 ko'rinar, qisman
     * to'lovlar umuman sanalmas edi.
     */
    @Query("""
            SELECT COALESCE(SUM(p.amount), 0) FROM Payment p
            WHERE p.paymentType = uz.shinamagazin.api.enums.PaymentType.DEBT_PAYMENT
              AND p.paymentDate >= :start AND p.paymentDate < :end""")
    BigDecimal sumDebtPaymentsBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * Shu smenada QABUL QILINGAN naqd qarz to'lovlari — kassaga fizik tushgan
     * pul. Z-hisobotda expectedCash'ga QO'SHILADI: busiz qarz puli kassada
     * turib hisobotda ko'rinmas, o'zlashtirilsa aniqlanmas edi.
     */
    @Query("""
            SELECT COALESCE(SUM(p.amount), 0) FROM Payment p
            WHERE p.shift.id = :shiftId
              AND p.method = uz.shinamagazin.api.enums.PaymentMethod.CASH
              AND p.paymentType = uz.shinamagazin.api.enums.PaymentType.DEBT_PAYMENT""")
    BigDecimal sumCashDebtPaymentsReceivedInShift(@Param("shiftId") Long shiftId);

    @Query("""
            SELECT COUNT(p) FROM Payment p
            WHERE p.shift.id = :shiftId
              AND p.method = uz.shinamagazin.api.enums.PaymentMethod.CASH
              AND p.paymentType = uz.shinamagazin.api.enums.PaymentType.DEBT_PAYMENT""")
    long countCashDebtPaymentsReceivedInShift(@Param("shiftId") Long shiftId);

    /**
     * Shu smenadagi NAQD savdolarga keyinchalik qilingan qarz to'lovlari.
     *
     * <p>{@code makePayment} to'lovni {@code sale.paidAmount} ga qo'shadi —
     * summarize esa aynan shu maydonni yig'adi. Pul esa SOTUV smenasining
     * kassasiga emas, to'lov qabul qilingan smenaga tushgan (yoki KARTA
     * orqali umuman kassaga tushmagan). Z-hisobotda bu qism sotuv smenasining
     * naqd tushumidan AYIRILADI, aks holda bir pul ikki smenada sanalardi.
     */
    @Query("""
            SELECT COALESCE(SUM(p.amount), 0) FROM Payment p
            WHERE p.sale.shift.id = :shiftId
              AND p.sale.paymentMethod = uz.shinamagazin.api.enums.PaymentMethod.CASH
              AND p.sale.status <> uz.shinamagazin.api.enums.SaleStatus.CANCELLED
              AND p.paymentType = uz.shinamagazin.api.enums.PaymentType.DEBT_PAYMENT""")
    BigDecimal sumDebtPaymentsAppliedToCashSalesOfShift(@Param("shiftId") Long shiftId);
}
