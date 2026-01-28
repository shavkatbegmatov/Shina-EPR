package uz.shinamagazin.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.shinamagazin.api.audit.Auditable;
import uz.shinamagazin.api.audit.AuditEntityListener;
import uz.shinamagazin.api.entity.base.BaseEntity;
import uz.shinamagazin.api.enums.NotificationType;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "customer_notifications")
@EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerNotification extends BaseEntity implements Auditable {

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

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String metadata;

    // ============================================
    // Auditable Interface Implementation
    // ============================================

    @Override
    public String getEntityName() {
        return "CustomerNotification";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", getId());
        map.put("titleUz", this.titleUz);
        map.put("titleRu", this.titleRu);
        map.put("messageUz", this.messageUz);
        map.put("messageRu", this.messageRu);
        map.put("notificationType", this.notificationType);
        map.put("isRead", this.isRead);
        map.put("readAt", this.readAt);
        map.put("expiresAt", this.expiresAt);
        map.put("metadata", this.metadata);

        // Avoid lazy loading
        if (this.customer != null) {
            map.put("customerId", this.customer.getId());
        }

        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of(); // No sensitive fields
    }

    // ============================================
    // Helper Methods
    // ============================================

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
