package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.CashShift;
import uz.shinamagazin.api.enums.CashShiftStatus;

import java.util.Optional;

@Repository
public interface CashShiftRepository extends JpaRepository<CashShift, Long> {

    /**
     * Kassirning ochiq smenasi. DB darajasida qisman unikal indeks bir vaqtda
     * bittadan ortiq ochiq smenani to'sadi (V32), shuning uchun bu yerda
     * Optional yetarli.
     */
    @EntityGraph(attributePaths = {"openedBy", "closedBy"})
    Optional<CashShift> findByOpenedByIdAndStatus(Long userId, CashShiftStatus status);

    @Override
    @EntityGraph(attributePaths = {"openedBy", "closedBy"})
    Optional<CashShift> findById(Long id);

    @EntityGraph(attributePaths = {"openedBy", "closedBy"})
    Page<CashShift> findAllByOrderByOpenedAtDesc(Pageable pageable);

    /**
     * Smena bo'yicha savdo jamlanmasi: to'lov usuli -> (soni, jami, to'langan).
     *
     * <p>Bekor qilingan savdolar hisobga OLINMAYDI — ular kassaga pul
     * keltirmagan. Bitta so'rovda guruhlash: Z-hisobot uchun savdolarni
     * xotiraga yuklash shart emas.
     */
    @Query("""
            SELECT s.paymentMethod, COUNT(s), COALESCE(SUM(s.totalAmount), 0), COALESCE(SUM(s.paidAmount), 0)
            FROM Sale s
            WHERE s.shift.id = :shiftId AND s.status <> uz.shinamagazin.api.enums.SaleStatus.CANCELLED
            GROUP BY s.paymentMethod""")
    java.util.List<Object[]> summarizeByPaymentMethod(@Param("shiftId") Long shiftId);

    /** Smenada berilgan qarz (naqd tushmagan qism). */
    @Query("""
            SELECT COALESCE(SUM(s.debtAmount), 0) FROM Sale s
            WHERE s.shift.id = :shiftId AND s.status <> uz.shinamagazin.api.enums.SaleStatus.CANCELLED""")
    java.math.BigDecimal sumDebtIssued(@Param("shiftId") Long shiftId);

    /** Smenada bekor qilingan savdolar soni (Z-hisobotda alohida ko'rsatiladi). */
    @Query("""
            SELECT COUNT(s) FROM Sale s
            WHERE s.shift.id = :shiftId AND s.status = uz.shinamagazin.api.enums.SaleStatus.CANCELLED""")
    long countCancelled(@Param("shiftId") Long shiftId);
}
