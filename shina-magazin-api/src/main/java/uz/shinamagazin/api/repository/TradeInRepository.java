package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.shinamagazin.api.entity.TradeIn;
import uz.shinamagazin.api.enums.TradeInStatus;

import java.util.List;
import java.util.Optional;

public interface TradeInRepository extends JpaRepository<TradeIn, Long> {

    @Query("""
            SELECT t FROM TradeIn t
            WHERE (:status IS NULL OR t.status = :status)
              AND (:customerId IS NULL OR t.customer.id = :customerId)
            """)
    Page<TradeIn> findFiltered(@Param("status") TradeInStatus status,
                               @Param("customerId") Long customerId,
                               Pageable pageable);

    @Query("SELECT t FROM TradeIn t LEFT JOIN FETCH t.items WHERE t.id = :id")
    Optional<TradeIn> findByIdWithItems(@Param("id") Long id);

    /**
     * Kassada tanlash uchun tayyor hujjatlar: mijozning hali savdoga
     * bog'lanmagan (NEW) barterlari, eng yangisi birinchi.
     */
    @Query("""
            SELECT t FROM TradeIn t
            WHERE t.status = uz.shinamagazin.api.enums.TradeInStatus.NEW
              AND t.customer.id = :customerId
            ORDER BY t.acceptedAt DESC
            """)
    List<TradeIn> findAvailableForCustomer(@Param("customerId") Long customerId);

    List<TradeIn> findBySaleId(Long saleId);

    long countByStatus(TradeInStatus status);
}
