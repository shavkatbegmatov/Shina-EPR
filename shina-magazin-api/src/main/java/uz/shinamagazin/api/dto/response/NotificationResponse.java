package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.CustomerNotification;
import uz.shinamagazin.api.enums.NotificationType;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private Long id;
    private String title;
    private String message;
    private NotificationType notificationType;
    private Boolean isRead;
    private LocalDateTime readAt;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private String metadata;

    public static NotificationResponse from(CustomerNotification notification, String lang) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .title(notification.getTitle(lang))
                .message(notification.getMessage(lang))
                .notificationType(notification.getNotificationType())
                .isRead(notification.getIsRead())
                .readAt(notification.getReadAt())
                .createdAt(notification.getCreatedAt())
                .expiresAt(notification.getExpiresAt())
                .metadata(notification.getMetadata())
                .build();
    }
}
