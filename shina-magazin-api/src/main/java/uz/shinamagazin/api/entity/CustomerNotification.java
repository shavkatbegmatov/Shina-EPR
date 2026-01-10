package uz.shinamagazin.api.entity;

import jakarta.persistence.*;
import lombok.*;
import uz.shinamagazin.api.entity.base.BaseEntity;
import uz.shinamagazin.api.enums.NotificationType;

import java.time.LocalDateTime;

@Entity
@Table(name = "customer_notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerNotification extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "title_uz", nullable = false, length = 200)
    private String titleUz;

    @Column(name = "title_ru", nullable = false, length = 200)
    private String titleRu;

    @Column(name = "message_uz", nullable = false, length = 1000)
    private String messageUz;

    @Column(name = "message_ru", nullable = false, length = 1000)
    private String messageRu;

    @Enumerated(EnumType.STRING)
    @Column(name = "notification_type", nullable = false, length = 30)
    private NotificationType notificationType;

    @Column(name = "is_read")
    @Builder.Default
    private Boolean isRead = false;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(columnDefinition = "jsonb")
    private String metadata;

    /**
     * Tilga qarab sarlavha qaytaradi
     */
    public String getTitle(String lang) {
        return "ru".equals(lang) ? titleRu : titleUz;
    }

    /**
     * Tilga qarab xabar matnini qaytaradi
     */
    public String getMessage(String lang) {
        return "ru".equals(lang) ? messageRu : messageUz;
    }
}
