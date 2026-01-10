package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.response.NotificationResponse;
import uz.shinamagazin.api.entity.Customer;
import uz.shinamagazin.api.entity.CustomerNotification;
import uz.shinamagazin.api.enums.NotificationType;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.CustomerNotificationRepository;
import uz.shinamagazin.api.repository.CustomerRepository;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final CustomerNotificationRepository notificationRepository;
    private final CustomerRepository customerRepository;

    public Page<NotificationResponse> getCustomerNotifications(Long customerId, String lang, Pageable pageable) {
        return notificationRepository.findByCustomerIdOrderByCreatedAtDesc(customerId, pageable)
                .map(notification -> NotificationResponse.from(notification, lang));
    }

    public long getUnreadCount(Long customerId) {
        return notificationRepository.countUnreadByCustomerId(customerId);
    }

    @Transactional
    public void markAsRead(Long notificationId, Long customerId) {
        CustomerNotification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Bildirishnoma", "id", notificationId));

        if (!notification.getCustomer().getId().equals(customerId)) {
            throw new ResourceNotFoundException("Bildirishnoma", "id", notificationId);
        }

        if (!notification.getIsRead()) {
            notification.setIsRead(true);
            notification.setReadAt(LocalDateTime.now());
            notificationRepository.save(notification);
        }
    }

    @Transactional
    public int markAllAsRead(Long customerId) {
        return notificationRepository.markAllAsRead(customerId, LocalDateTime.now());
    }

    /**
     * Qarz eslatmasi yuborish
     */
    @Transactional
    public void sendDebtReminder(Long customerId, String metadata) {
        createNotification(
                customerId,
                "Qarz eslatmasi",
                "Напоминание о задолженности",
                "Sizda to'lanmagan qarz mavjud. Iltimos, vaqtida to'lang.",
                "У вас есть непогашенная задолженность. Пожалуйста, оплатите вовремя.",
                NotificationType.DEBT_REMINDER,
                null,
                metadata
        );
    }

    /**
     * To'lov qabul qilindi xabari
     */
    @Transactional
    public void sendPaymentReceived(Long customerId, String amountInfo, String metadata) {
        createNotification(
                customerId,
                "To'lov qabul qilindi",
                "Платеж принят",
                "Sizning to'lovingiz muvaffaqiyatli qabul qilindi. " + amountInfo,
                "Ваш платеж успешно принят. " + amountInfo,
                NotificationType.PAYMENT_RECEIVED,
                null,
                metadata
        );
    }

    /**
     * Aksiya/chegirma xabari
     */
    @Transactional
    public void sendPromotion(Long customerId, String titleUz, String titleRu,
                              String messageUz, String messageRu,
                              LocalDateTime expiresAt, String metadata) {
        createNotification(customerId, titleUz, titleRu, messageUz, messageRu,
                          NotificationType.PROMOTION, expiresAt, metadata);
    }

    /**
     * Tizim xabari
     */
    @Transactional
    public void sendSystemNotification(Long customerId, String titleUz, String titleRu,
                                       String messageUz, String messageRu, String metadata) {
        createNotification(customerId, titleUz, titleRu, messageUz, messageRu,
                          NotificationType.SYSTEM, null, metadata);
    }

    private void createNotification(Long customerId, String titleUz, String titleRu,
                                    String messageUz, String messageRu,
                                    NotificationType type, LocalDateTime expiresAt,
                                    String metadata) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Mijoz", "id", customerId));

        CustomerNotification notification = CustomerNotification.builder()
                .customer(customer)
                .titleUz(titleUz)
                .titleRu(titleRu)
                .messageUz(messageUz)
                .messageRu(messageRu)
                .notificationType(type)
                .isRead(false)
                .expiresAt(expiresAt)
                .metadata(metadata)
                .build();

        notificationRepository.save(notification);
        log.info("Notification sent to customer {}: {}", customerId, type);
    }

    /**
     * Muddati o'tgan bildirishnomalarni tozalash
     */
    @Transactional
    public int cleanupExpiredNotifications() {
        int deleted = notificationRepository.deleteExpiredNotifications(LocalDateTime.now());
        if (deleted > 0) {
            log.info("Deleted {} expired notifications", deleted);
        }
        return deleted;
    }
}
