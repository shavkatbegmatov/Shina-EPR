package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.response.StaffNotificationResponse;
import uz.shinamagazin.api.entity.StaffNotification;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.StaffNotificationType;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.StaffNotificationRepository;
import uz.shinamagazin.api.repository.UserRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StaffNotificationService {

    private final StaffNotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final NotificationDispatcher notificationDispatcher;

    /**
     * Foydalanuvchi uchun bildirishnomalarni olish
     */
    @Transactional(readOnly = true)
    public Page<StaffNotificationResponse> getNotifications(Long userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrGlobal(userId, pageable)
                .map(StaffNotificationResponse::from);
    }

    /**
     * Tur bo'yicha filtrlangan bildirishnomalar
     */
    @Transactional(readOnly = true)
    public Page<StaffNotificationResponse> getNotificationsByType(
            Long userId, StaffNotificationType type, Pageable pageable) {
        return notificationRepository.findByUserIdOrGlobalAndType(userId, type, pageable)
                .map(StaffNotificationResponse::from);
    }

    /**
     * O'qilmagan bildirishnomalar soni
     */
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countUnreadByUserId(userId);
    }

    /**
     * O'qilmagan bildirishnomalar ro'yxati (dropdown uchun)
     */
    @Transactional(readOnly = true)
    public List<StaffNotificationResponse> getUnreadNotifications(Long userId) {
        return notificationRepository.findUnreadByUserId(userId).stream()
                .map(StaffNotificationResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * Bildirishnomani o'qilgan qilish
     */
    @Transactional
    public void markAsRead(Long notificationId) {
        int updated = notificationRepository.markAsReadById(notificationId);
        if (updated == 0) {
            throw new ResourceNotFoundException("Bildirishnoma topilmadi yoki allaqachon o'qilgan");
        }
    }

    /**
     * Barchasini o'qilgan qilish
     */
    @Transactional
    public int markAllAsRead(Long userId) {
        return notificationRepository.markAllAsReadByUserId(userId);
    }

    /**
     * Bildirishnomani o'chirish
     */
    @Transactional
    public void deleteNotification(Long notificationId) {
        if (!notificationRepository.existsById(notificationId)) {
            throw new ResourceNotFoundException("Bildirishnoma topilmadi");
        }
        notificationRepository.deleteById(notificationId);
    }

    /**
     * Yangi bildirishnoma yaratish (barcha xodimlar uchun)
     */
    @Transactional
    public StaffNotification createGlobalNotification(
            String title,
            String message,
            StaffNotificationType type,
            String referenceType,
            Long referenceId) {

        StaffNotification notification = StaffNotification.builder()
                .user(null) // global
                .title(title)
                .message(message)
                .notificationType(type)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .isRead(false)
                .build();

        StaffNotification saved = notificationRepository.save(notification);

        // WebSocket orqali real-time yuborish
        notificationDispatcher.notifyAllStaff(saved);

        return saved;
    }

    /**
     * Yangi bildirishnoma yaratish (ma'lum foydalanuvchi uchun)
     */
    @Transactional
    public StaffNotification createNotificationForUser(
            Long userId,
            String title,
            String message,
            StaffNotificationType type,
            String referenceType,
            Long referenceId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));

        StaffNotification notification = StaffNotification.builder()
                .user(user)
                .title(title)
                .message(message)
                .notificationType(type)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .isRead(false)
                .build();

        StaffNotification saved = notificationRepository.save(notification);

        // WebSocket orqali real-time yuborish (faqat shu foydalanuvchiga)
        notificationDispatcher.notifyStaff(userId, saved);

        return saved;
    }

    /**
     * Eski bildirishnomalarni tozalash
     */
    @Transactional
    public int cleanupOldNotifications() {
        int deleted = notificationRepository.deleteOldNotifications();
        log.info("Deleted {} old notifications", deleted);
        return deleted;
    }

    // ===== Yordamchi metodlar (boshqa service'lardan chaqirish uchun) =====

    /**
     * Yangi buyurtma bildirishnomasi
     */
    public void notifyNewOrder(String invoiceNumber, String customerName, Long saleId) {
        createGlobalNotification(
                "Yangi buyurtma",
                String.format("%s buyurtmasi yaratildi. Mijoz: %s", invoiceNumber, customerName),
                StaffNotificationType.ORDER,
                "SALE",
                saleId
        );
    }

    /**
     * To'lov bildirishnomasi
     */
    public void notifyPaymentReceived(String customerName, String amount, Long debtId) {
        createGlobalNotification(
                "To'lov qabul qilindi",
                String.format("Mijoz %s %s so'm to'ladi", customerName, amount),
                StaffNotificationType.PAYMENT,
                "DEBT",
                debtId
        );
    }

    /**
     * Kam zaxira ogohlantirishi
     */
    public void notifyLowStock(String productName, int quantity, Long productId) {
        createGlobalNotification(
                "Kam zaxira ogohlantirishi",
                String.format("%s - Zaxirada faqat %d ta qoldi", productName, quantity),
                StaffNotificationType.WARNING,
                "PRODUCT",
                productId
        );
    }

    /**
     * Yangi mijoz bildirishnomasi
     */
    public void notifyNewCustomer(String customerName, String phone, Long customerId) {
        createGlobalNotification(
                "Yangi mijoz",
                String.format("%s ro'yxatdan o'tdi. Telefon: %s", customerName, phone),
                StaffNotificationType.CUSTOMER,
                "CUSTOMER",
                customerId
        );
    }

    /**
     * Qarz eslatmasi
     */
    public void notifyDebtReminder(String customerName, String amount, int daysLeft, Long debtId) {
        createGlobalNotification(
                "Qarz eslatmasi",
                String.format("%s ning qarzi %s so'm. Muddat: %d kun qoldi", customerName, amount, daysLeft),
                StaffNotificationType.WARNING,
                "DEBT",
                debtId
        );
    }
}
