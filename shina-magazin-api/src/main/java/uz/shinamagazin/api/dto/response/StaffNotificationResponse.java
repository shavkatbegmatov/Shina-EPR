package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.StaffNotification;
import uz.shinamagazin.api.enums.StaffNotificationType;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffNotificationResponse {

    private Long id;
    private String title;
    private String message;
    private StaffNotificationType type;
    private Boolean isRead;
    private LocalDateTime readAt;
    private String referenceType;
    private Long referenceId;
    private LocalDateTime createdAt;

    public static StaffNotificationResponse from(StaffNotification notification) {
        return StaffNotificationResponse.builder()
                .id(notification.getId())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .type(notification.getNotificationType())
                .isRead(notification.getIsRead())
                .readAt(notification.getReadAt())
                .referenceType(notification.getReferenceType())
                .referenceId(notification.getReferenceId())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
