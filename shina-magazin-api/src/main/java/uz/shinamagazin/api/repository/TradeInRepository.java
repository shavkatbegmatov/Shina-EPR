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

    Page<TradeIn> findByStatus(TradeInStatus status, Pageable pageable);

    Optional<TradeIn> findBySaleId(Long saleId);

    /**
     * Kassada ishlatish uchun tayyor barterlar.
     *
     * <p>Mijozi ko'rsatilmagan hujjatlar ham qaytariladi: mijoz kartochkasiz
     * qabul qilingan bo'lsa ham kassir uni raqami bo'yicha topa olishi kerak.
     */
    @Query("""
            SELECT t FROM TradeIn t
            WHERE t.status = uz.shinamagazin.api.enums.TradeInStatus.NEW
              AND (:customerId IS NULL OR t.customer.id = :customerId)
            ORDER BY t.acceptedAt DESC
            """)
    List<TradeIn> findAvailable(@Param("customerId") Long customerId);
}
