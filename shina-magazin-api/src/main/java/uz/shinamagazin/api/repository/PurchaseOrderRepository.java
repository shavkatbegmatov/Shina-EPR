package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.PurchaseOrder;
import uz.shinamagazin.api.enums.PurchaseOrderStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {

    Optional<PurchaseOrder> findByOrderNumber(String orderNumber);

    Page<PurchaseOrder> findByStatus(PurchaseOrderStatus status, Pageable pageable);

    Page<PurchaseOrder> findBySupplierId(Long supplierId, Pageable pageable);

    List<PurchaseOrder> findBySupplierIdOrderByOrderDateDesc(Long supplierId);

    @Query("SELECT MAX(CAST(SUBSTRING(p.orderNumber, 4) AS integer)) FROM PurchaseOrder p WHERE p.orderNumber LIKE :prefix%")
    Integer findMaxOrderNumber(@Param("prefix") String prefix);

    // Statistika uchun
    @Query("SELECT COUNT(p) FROM PurchaseOrder p WHERE p.status != 'CANCELLED'")
    Long countAllActive();

    @Query("SELECT COUNT(p) FROM PurchaseOrder p WHERE p.orderDate = :date AND p.status != 'CANCELLED'")
    Long countByOrderDate(@Param("date") LocalDate date);

    @Query("SELECT COUNT(p) FROM PurchaseOrder p WHERE p.orderDate >= :startDate AND p.orderDate <= :endDate AND p.status != 'CANCELLED'")
    Long countByOrderDateBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT COALESCE(SUM(p.totalAmount), 0) FROM PurchaseOrder p WHERE p.status != 'CANCELLED'")
    BigDecimal sumTotalAmount();

    @Query("SELECT COALESCE(SUM(p.totalAmount - p.paidAmount), 0) FROM PurchaseOrder p WHERE p.status != 'CANCELLED'")
    BigDecimal sumTotalDebt();

    // Filter qidiruv - PostgreSQL uchun CAST bilan
    @Query(value = "SELECT * FROM purchase_orders p WHERE " +
           "(CAST(:supplierId AS BIGINT) IS NULL OR p.supplier_id = :supplierId) AND " +
           "(CAST(:status AS VARCHAR) IS NULL OR p.status = :status) AND " +
           "(CAST(:startDate AS DATE) IS NULL OR p.order_date >= :startDate) AND " +
           "(CAST(:endDate AS DATE) IS NULL OR p.order_date <= :endDate) " +
           "ORDER BY p.order_date DESC, p.id DESC",
           countQuery = "SELECT COUNT(*) FROM purchase_orders p WHERE " +
           "(CAST(:supplierId AS BIGINT) IS NULL OR p.supplier_id = :supplierId) AND " +
           "(CAST(:status AS VARCHAR) IS NULL OR p.status = :status) AND " +
           "(CAST(:startDate AS DATE) IS NULL OR p.order_date >= :startDate) AND " +
           "(CAST(:endDate AS DATE) IS NULL OR p.order_date <= :endDate)",
           nativeQuery = true)
    Page<PurchaseOrder> findAllWithFilters(
            @Param("supplierId") Long supplierId,
            @Param("status") String status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable);
}
