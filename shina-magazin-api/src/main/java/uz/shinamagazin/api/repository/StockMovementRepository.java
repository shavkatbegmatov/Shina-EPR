package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.StockMovement;
import uz.shinamagazin.api.enums.MovementType;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    Page<StockMovement> findByProductId(Long productId, Pageable pageable);

    List<StockMovement> findByReferenceTypeAndReferenceId(String referenceType, Long referenceId);

    Page<StockMovement> findByMovementType(MovementType movementType, Pageable pageable);

    @Query("SELECT sm FROM StockMovement sm " +
            "WHERE (:productId IS NULL OR sm.product.id = :productId) " +
            "AND (:movementType IS NULL OR sm.movementType = :movementType) " +
            "AND (:referenceType IS NULL OR sm.referenceType = :referenceType) " +
            "ORDER BY sm.createdAt DESC")
    Page<StockMovement> findWithFilters(
            @Param("productId") Long productId,
            @Param("movementType") MovementType movementType,
            @Param("referenceType") String referenceType,
            Pageable pageable
    );

    @Query("SELECT sm FROM StockMovement sm WHERE sm.createdAt BETWEEN :start AND :end ORDER BY sm.createdAt DESC")
    List<StockMovement> findByDateRange(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("SELECT COUNT(sm) FROM StockMovement sm WHERE sm.movementType = :type AND sm.createdAt >= :start")
    long countByMovementTypeAndDateAfter(
            @Param("type") MovementType type,
            @Param("start") LocalDateTime start
    );

    @Query("SELECT COALESCE(SUM(sm.quantity), 0) FROM StockMovement sm WHERE sm.movementType = 'IN' AND sm.createdAt >= :start")
    Integer getTotalIncomingToday(@Param("start") LocalDateTime start);

    @Query("SELECT COALESCE(SUM(ABS(sm.quantity)), 0) FROM StockMovement sm WHERE sm.movementType = 'OUT' AND sm.createdAt >= :start")
    Integer getTotalOutgoingToday(@Param("start") LocalDateTime start);

    Page<StockMovement> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
