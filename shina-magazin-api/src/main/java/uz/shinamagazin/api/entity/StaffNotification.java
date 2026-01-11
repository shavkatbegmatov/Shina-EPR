package uz.shinamagazin.api.entity;

import jakarta.persistence.*;
import lombok.*;
import uz.shinamagazin.api.entity.base.BaseEntity;
import uz.shinamagazin.api.enums.StaffNotificationType;

import java.time.LocalDateTime;

@Entity
@Table(name = "staff_notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffNotification extends BaseEntity {

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
}
