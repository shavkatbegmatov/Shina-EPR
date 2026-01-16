package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import uz.shinamagazin.api.dto.response.NotificationResponse;
import uz.shinamagazin.api.dto.response.StaffNotificationResponse;
import uz.shinamagazin.api.dto.websocket.PermissionUpdateMessage;
import uz.shinamagazin.api.entity.CustomerNotification;
import uz.shinamagazin.api.entity.StaffNotification;

import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationDispatcher {

    private final SimpMessagingTemplate messagingTemplate;
    private final PermissionService permissionService;
    private final UserService userService;

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

    /**
     * Notify a specific user that their permissions have been updated
     *
     * @param userId The user whose permissions changed
     * @param permissions Updated permission codes
     * @param roles Updated role codes
     * @param reason Optional reason for the change (e.g., "Role updated by admin")
     */
    public void notifyPermissionsUpdated(Long userId, Set<String> permissions, Set<String> roles, String reason) {
        try {
            log.info("Notifying user {} of permission update. Reason: {}", userId, reason);

            PermissionUpdateMessage message = PermissionUpdateMessage.builder()
                    .permissions(permissions)
                    .roles(roles)
                    .reason(reason)
                    .timestamp(System.currentTimeMillis())
                    .build();

            // Send to user's personal queue
            // Destination: /user/{userId}/queue/permissions
            messagingTemplate.convertAndSendToUser(
                    userId.toString(),
                    "/queue/permissions",
                    message
            );

            log.debug("Permission update notification sent to user {}", userId);
        } catch (Exception e) {
            log.error("Failed to send permission update notification to user {}", userId, e);
        }
    }

    /**
     * Notify multiple users of permission updates (for role-wide changes)
     *
     * @param userIds List of affected user IDs
     * @param reason Reason for the change
     */
    public void notifyMultipleUsersPermissionsUpdated(Set<Long> userIds, String reason) {
        log.info("Notifying {} users of permission updates. Reason: {}", userIds.size(), reason);

        userIds.forEach(userId -> {
            // Get fresh permissions for each user
            Set<String> permissions = permissionService.getUserPermissionCodes(userId);
            Set<String> roles = userService.getUserRoles(userId);

            notifyPermissionsUpdated(userId, permissions, roles, reason);
        });
    }
}
