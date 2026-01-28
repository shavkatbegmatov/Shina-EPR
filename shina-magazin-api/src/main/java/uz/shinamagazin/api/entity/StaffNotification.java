package uz.shinamagazin.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.shinamagazin.api.audit.Auditable;
import uz.shinamagazin.api.audit.AuditEntityListener;
import uz.shinamagazin.api.entity.base.BaseEntity;
import uz.shinamagazin.api.enums.StaffNotificationType;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "staff_notifications")
@EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffNotification extends BaseEntity implements Auditable {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user; // NULL = barcha xodimlar uchun

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 1000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(name = "notification_type", nullable = false, length = 30)
    private StaffNotificationType notificationType;

    @Column(name = "is_read")
    @Builder.Default
    private Boolean isRead = false;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "reference_type", length = 30)
    private String referenceType; // SALE, CUSTOMER, PRODUCT, DEBT

    @Column(name = "reference_id")
    private Long referenceId;

    // ============================================
    // Auditable Interface Implementation
    // ============================================

    @Override
    public String getEntityName() {
        return "StaffNotification";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", getId());
        map.put("title", this.title);
        map.put("message", this.message);
        map.put("notificationType", this.notificationType);
        map.put("isRead", this.isRead);
        map.put("readAt", this.readAt);
        map.put("referenceType", this.referenceType);
        map.put("referenceId", this.referenceId);

        // Avoid lazy loading
        if (this.user != null) {
            map.put("userId", this.user.getId());
        }

        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of(); // No sensitive fields
    }
}
