package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.Sale;
import uz.shinamagazin.api.enums.SaleStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SaleRepository extends JpaRepository<Sale, Long> {

    Optional<Sale> findByInvoiceNumber(String invoiceNumber);

    Page<Sale> findByStatus(SaleStatus status, Pageable pageable);

    Page<Sale> findByCustomerId(Long customerId, Pageable pageable);

    @Query("SELECT s FROM Sale s WHERE s.saleDate BETWEEN :start AND :end")
    List<Sale> findBySaleDateBetween(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("SELECT s FROM Sale s WHERE s.saleDate >= :start AND s.saleDate < :end AND s.status = 'COMPLETED'")
    List<Sale> findTodaySales(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(s) FROM Sale s WHERE s.saleDate >= :start AND s.saleDate < :end AND s.status = 'COMPLETED'")
    long countTodaySales(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COALESCE(SUM(s.totalAmount), 0) FROM Sale s WHERE s.saleDate >= :start AND s.saleDate < :end AND s.status = 'COMPLETED'")
    BigDecimal getTodayRevenue(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COALESCE(SUM(s.totalAmount), 0) FROM Sale s WHERE s.status = 'COMPLETED'")
    BigDecimal getTotalRevenue();

    @Query("SELECT s FROM Sale s LEFT JOIN FETCH s.items WHERE s.id = :id")
    Optional<Sale> findByIdWithItems(@Param("id") Long id);

    @Query("SELECT MAX(CAST(SUBSTRING(s.invoiceNumber, 12) AS integer)) FROM Sale s WHERE s.invoiceNumber LIKE :prefix%")
    Integer findMaxInvoiceNumber(@Param("prefix") String prefix);

    // ==================== CHART DATA QUERIES ====================

    // Sotuvlar trendi - kunlik
    @Query(value = """
        SELECT DATE(s.sale_date) as date,
               COUNT(*) as count,
               COALESCE(SUM(s.total_amount), 0) as revenue
        FROM sales s
        WHERE s.sale_date >= :startDate
          AND s.status = 'COMPLETED'
        GROUP BY DATE(s.sale_date)
        ORDER BY DATE(s.sale_date)
        """, nativeQuery = true)
    List<Object[]> getSalesTrend(@Param("startDate") LocalDateTime startDate);

    // To'lov usullari bo'yicha
    @Query(value = """
        SELECT s.payment_method,
               COUNT(*) as count,
               COALESCE(SUM(s.total_amount), 0) as amount
        FROM sales s
        WHERE s.sale_date >= :startDate
          AND s.status = 'COMPLETED'
        GROUP BY s.payment_method
        """, nativeQuery = true)
    List<Object[]> getPaymentMethodStats(@Param("startDate") LocalDateTime startDate);

    // Hafta kunlari bo'yicha
    @Query(value = """
        SELECT EXTRACT(DOW FROM s.sale_date) as day_of_week,
               COUNT(*) as count,
               COALESCE(SUM(s.total_amount), 0) as revenue
        FROM sales s
        WHERE s.sale_date >= :startDate
          AND s.status = 'COMPLETED'
        GROUP BY EXTRACT(DOW FROM s.sale_date)
        ORDER BY day_of_week
        """, nativeQuery = true)
    List<Object[]> getWeekdaySales(@Param("startDate") LocalDateTime startDate);

    // Soatlar bo'yicha (bugungi)
    @Query(value = """
        SELECT EXTRACT(HOUR FROM s.sale_date) as hour,
               COUNT(*) as count,
               COALESCE(SUM(s.total_amount), 0) as revenue
        FROM sales s
        WHERE s.sale_date >= :startDate AND s.sale_date < :endDate
          AND s.status = 'COMPLETED'
        GROUP BY EXTRACT(HOUR FROM s.sale_date)
        ORDER BY hour
        """, nativeQuery = true)
    List<Object[]> getHourlySales(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    // Daromad - ma'lum davr uchun
    @Query("SELECT COALESCE(SUM(s.totalAmount), 0) FROM Sale s WHERE s.saleDate >= :start AND s.saleDate < :end AND s.status = 'COMPLETED'")
    BigDecimal getRevenueForPeriod(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // Sotuvlar soni - ma'lum davr uchun
    @Query("SELECT COUNT(s) FROM Sale s WHERE s.saleDate >= :start AND s.saleDate < :end AND s.status = 'COMPLETED'")
    Long getSalesCountForPeriod(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
