package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.Expense;
import uz.shinamagazin.api.enums.ExpenseCategory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    /**
     * Ro'yxat — sana oralig'i va turkum bo'yicha ixtiyoriy filtr.
     *
     * <p>{@code @EntityGraph} faqat ToOne bog'lanishlar uchun: {@code Pageable}
     * bilan kolleksiya JOIN qilinsa Hibernate sahifalashni xotirada bajarardi.
     */
    @EntityGraph(attributePaths = {"createdBy", "shift"})
    @Query("""
            SELECT e FROM Expense e
            WHERE e.expenseDate BETWEEN :startDate AND :endDate
              AND (:category IS NULL OR e.category = :category)
            ORDER BY e.expenseDate DESC, e.id DESC""")
    Page<Expense> search(@Param("startDate") LocalDate startDate,
                         @Param("endDate") LocalDate endDate,
                         @Param("category") ExpenseCategory category,
                         Pageable pageable);

    /** P&L uchun: turkum kesimida jami summa. */
    @Query("""
            SELECT e.category, COALESCE(SUM(e.amount), 0), COUNT(e)
            FROM Expense e
            WHERE e.expenseDate BETWEEN :startDate AND :endDate
            GROUP BY e.category""")
    List<Object[]> sumByCategory(@Param("startDate") LocalDate startDate,
                                 @Param("endDate") LocalDate endDate);

    /** P&L kunlik grafigi uchun. */
    @Query("""
            SELECT e.expenseDate, COALESCE(SUM(e.amount), 0)
            FROM Expense e
            WHERE e.expenseDate BETWEEN :startDate AND :endDate
            GROUP BY e.expenseDate""")
    List<Object[]> sumByDate(@Param("startDate") LocalDate startDate,
                             @Param("endDate") LocalDate endDate);

    @Query("""
            SELECT COALESCE(SUM(e.amount), 0) FROM Expense e
            WHERE e.expenseDate BETWEEN :startDate AND :endDate""")
    BigDecimal sumTotal(@Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

    /**
     * Smenada kassadan chiqqan xarajat.
     *
     * <p>Z-hisobotda kutilgan naqddan AYIRILADI — aks holda kassadan pul olib
     * xarajat qilgan kassirga asossiz kamomad yozilardi.
     */
    @Query("""
            SELECT COALESCE(SUM(e.amount), 0) FROM Expense e
            WHERE e.shift.id = :shiftId AND e.paymentMethod = uz.shinamagazin.api.enums.PaymentMethod.CASH""")
    BigDecimal sumCashByShift(@Param("shiftId") Long shiftId);

    @Query("SELECT COUNT(e) FROM Expense e WHERE e.shift.id = :shiftId")
    long countByShift(@Param("shiftId") Long shiftId);
}
