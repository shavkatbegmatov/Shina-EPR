package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import uz.shinamagazin.api.dto.response.NotificationResponse;
import uz.shinamagazin.api.dto.response.StaffNotificationResponse;
import uz.shinamagazin.api.entity.CustomerNotification;
import uz.shinamagazin.api.entity.StaffNotification;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationDispatcher {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Barcha staff'ga global bildirishnoma yuborish
     */
    public void notifyAllStaff(StaffNotification notification) {
        try {
            StaffNotificationResponse response = StaffNotificationResponse.from(notification);
            messagingTemplate.convertAndSend("/topic/staff/notifications", response);
            log.debug("Sent notification to all staff: {}", notification.getTitle());
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification to staff", e);
        }
    }

    /**
     * Bitta staff foydalanuvchisiga bildirishnoma yuborish
     */
    public void notifyStaff(Long userId, StaffNotification notification) {
        try {
            StaffNotificationResponse response = StaffNotificationResponse.from(notification);
            messagingTemplate.convertAndSendToUser(
                    userId.toString(),
                    "/queue/notifications",
                    response
            );
            log.debug("Sent notification to staff user {}: {}", userId, notification.getTitle());
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification to staff user {}", userId, e);
        }
    }

    /**
     * Mijozga bildirishnoma yuborish (O'zbek tilida)
     */
    public void notifyCustomer(Long customerId, CustomerNotification notification) {
        notifyCustomer(customerId, notification, "uz");
    }

    /**
     * Mijozga bildirishnoma yuborish (til tanlab)
     */
    public void notifyCustomer(Long customerId, CustomerNotification notification, String lang) {
        try {
            NotificationResponse response = NotificationResponse.from(notification, lang);
            messagingTemplate.convertAndSendToUser(
                    "customer_" + customerId,
                    "/queue/notifications",
                    response
            );
            log.debug("Sent notification to customer {}: {}", customerId, notification.getTitle(lang));
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification to customer {}", customerId, e);
        }
    }
}
