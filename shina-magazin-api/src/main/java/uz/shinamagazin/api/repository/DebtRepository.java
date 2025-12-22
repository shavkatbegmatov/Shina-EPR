package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    List<Debt> findByCustomerId(Long customerId);

    Page<Debt> findByStatus(DebtStatus status, Pageable pageable);

    @Query("SELECT d FROM Debt d WHERE d.status = 'ACTIVE' AND d.dueDate < :today")
    List<Debt> findOverdueDebts(@Param("today") LocalDate today);

    @Query("SELECT d FROM Debt d WHERE d.status = 'ACTIVE'")
    List<Debt> findActiveDebts();

    @Query("SELECT COALESCE(SUM(d.remainingAmount), 0) FROM Debt d WHERE d.status = 'ACTIVE'")
    BigDecimal getTotalActiveDebt();

    @Query("SELECT COALESCE(SUM(d.remainingAmount), 0) FROM Debt d WHERE d.customer.id = :customerId AND d.status = 'ACTIVE'")
    BigDecimal getCustomerTotalDebt(@Param("customerId") Long customerId);
}
