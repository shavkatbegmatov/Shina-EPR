package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.CustomerNotification;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CustomerNotificationRepository extends JpaRepository<CustomerNotification, Long> {

    Page<CustomerNotification> findByCustomerIdOrderByCreatedAtDesc(Long customerId, Pageable pageable);

    List<CustomerNotification> findByCustomerIdAndIsReadFalseOrderByCreatedAtDesc(Long customerId);

    @Query("SELECT COUNT(n) FROM CustomerNotification n WHERE n.customer.id = :customerId AND n.isRead = false")
    long countUnreadByCustomerId(@Param("customerId") Long customerId);

    @Modifying
    @Query("UPDATE CustomerNotification n SET n.isRead = true, n.readAt = :readAt WHERE n.customer.id = :customerId AND n.isRead = false")
    int markAllAsRead(@Param("customerId") Long customerId, @Param("readAt") LocalDateTime readAt);

    @Modifying
    @Query("DELETE FROM CustomerNotification n WHERE n.expiresAt IS NOT NULL AND n.expiresAt < :now")
    int deleteExpiredNotifications(@Param("now") LocalDateTime now);
}
