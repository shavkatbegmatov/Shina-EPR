package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.ShopOrder;
import uz.shinamagazin.api.enums.ShopOrderStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ShopOrderRepository extends JpaRepository<ShopOrder, Long>, JpaSpecificationExecutor<ShopOrder> {
    Optional<ShopOrder> findByOrderNo(String orderNo);
    Optional<ShopOrder> findByProviderTransactionId(String providerTransactionId);
    boolean existsByOrderNo(String orderNo);

    Page<ShopOrder> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<ShopOrder> findByStatusOrderByCreatedAtDesc(ShopOrderStatus status, Pageable pageable);
    long countByStatus(ShopOrderStatus status);

    // Mijoz akkaunti: o'z buyurtmalari — customer.id YOKI telefon (login'gacha guest) bo'yicha.
    Page<ShopOrder> findByCustomerIdOrCustomerPhoneOrderByCreatedAtDesc(
            Long customerId, String customerPhone, Pageable pageable);

    /**
     * Onlayn to'lovi boshlanib tugallanmagan (yoki muvaffaqiyatsiz) eskirgan buyurtmalar.
     * Payme tranzaksiyasi yaratilgan (providerTransactionId bor) PROCESSING buyurtma
     * chiqarib tashlanadi — uni Payme o'zi yakunlaydi yoki bekor qiladi.
     */
    @Query("""
            SELECT o FROM ShopOrder o
            WHERE o.status = uz.shinamagazin.api.enums.ShopOrderStatus.NEW
              AND o.createdAt < :cutoff
              AND (o.paymentStatus = uz.shinamagazin.api.enums.ShopPaymentStatus.FAILED
                   OR (o.paymentStatus = uz.shinamagazin.api.enums.ShopPaymentStatus.PROCESSING
                       AND o.providerTransactionId IS NULL))""")
    List<ShopOrder> findExpiredUnpaidOnlineOrders(@Param("cutoff") LocalDateTime cutoff);
}
