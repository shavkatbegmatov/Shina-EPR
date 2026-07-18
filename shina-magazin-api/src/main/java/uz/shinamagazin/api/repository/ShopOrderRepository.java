package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.ShopOrder;
import uz.shinamagazin.api.enums.ShopOrderStatus;

import java.util.Optional;

@Repository
public interface ShopOrderRepository extends JpaRepository<ShopOrder, Long> {
    Optional<ShopOrder> findByOrderNo(String orderNo);
    Optional<ShopOrder> findByProviderTransactionId(String providerTransactionId);
    boolean existsByOrderNo(String orderNo);

    Page<ShopOrder> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<ShopOrder> findByStatusOrderByCreatedAtDesc(ShopOrderStatus status, Pageable pageable);
    long countByStatus(ShopOrderStatus status);

    @Query("""
            SELECT o FROM ShopOrder o
            WHERE (:status IS NULL OR o.status = :status)
              AND (:customerId IS NULL OR o.customer.id = :customerId OR o.customerPhone = :customerPhone)
              AND (:search IS NULL
                   OR LOWER(o.orderNo) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(o.customerName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR o.customerPhone LIKE CONCAT('%', :search, '%'))
            ORDER BY o.createdAt DESC
            """)
    Page<ShopOrder> searchOrders(
            @Param("status") ShopOrderStatus status,
            @Param("customerId") Long customerId,
            @Param("customerPhone") String customerPhone,
            @Param("search") String search,
            Pageable pageable);

    // Mijoz akkaunti: o'z buyurtmalari — customer.id YOKI telefon (login'gacha guest) bo'yicha.
    Page<ShopOrder> findByCustomerIdOrCustomerPhoneOrderByCreatedAtDesc(
            Long customerId, String customerPhone, Pageable pageable);
}
