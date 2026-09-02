package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.Debt;
import uz.shinamagazin.api.enums.DebtStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface DebtRepository extends JpaRepository<Debt, Long> {

    // `DebtResponse.from` har bir qarz uchun customer va sale'ga tegadi (ikkalasi
    // LAZY) — grafiksiz har qator 2 ta qo'shimcha so'rov qilardi.

    @EntityGraph(attributePaths = {"customer", "sale"})
    List<Debt> findByCustomerId(Long customerId);

    /**
     * Sotuvning hali yopilmagan qarz yozuvlari — qaytarish/bekor qilishda
     * `sale.debtAmount` bilan birga `debts` jadvalini ham sinxron kamaytirish uchun.
     */
    List<Debt> findBySaleIdAndRemainingAmountGreaterThanOrderByIdAsc(Long saleId, BigDecimal amount);

    @Override
    @EntityGraph(attributePaths = {"customer", "sale"})
    Page<Debt> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {"customer", "sale"})
    Page<Debt> findByStatus(DebtStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"customer", "sale"})
    @Query("SELECT d FROM Debt d WHERE d.status = 'ACTIVE' AND d.dueDate < :today")
    List<Debt> findOverdueDebts(@Param("today") LocalDate today);

    @EntityGraph(attributePaths = {"customer", "sale"})
    @Query("SELECT d FROM Debt d WHERE d.status = 'ACTIVE'")
    List<Debt> findActiveDebts();

    @Query("SELECT COALESCE(SUM(d.remainingAmount), 0) FROM Debt d WHERE d.status = 'ACTIVE'")
    BigDecimal getTotalActiveDebt();

    @Query("SELECT COALESCE(SUM(d.remainingAmount), 0) FROM Debt d WHERE d.customer.id = :customerId AND d.status = 'ACTIVE'")
    BigDecimal getCustomerTotalDebt(@Param("customerId") Long customerId);

    /**
     * Muddati yaqinlashgan qarzlar (3 kun ichida)
     */
    // Scheduler ipida open-in-view yo'q: customer shu yerda yuklanmasa, eslatma
    // matnini yig'ishda LazyInitializationException bo'lardi (findOverdueDebts kabi).
    @EntityGraph(attributePaths = "customer")
    @Query("SELECT d FROM Debt d WHERE d.status = 'ACTIVE' AND d.dueDate BETWEEN :today AND :endDate")
    List<Debt> findDebtsWithUpcomingDueDate(@Param("today") LocalDate today, @Param("endDate") LocalDate endDate);
}
