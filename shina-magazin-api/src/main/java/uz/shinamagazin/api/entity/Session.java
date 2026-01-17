package uz.shinamagazin.api.entity;

import jakarta.persistence.*;
import lombok.*;
import uz.shinamagazin.api.entity.base.BaseEntity;

import java.time.LocalDateTime;

@Entity
@Table(name = "sessions", indexes = {
    @Index(name = "idx_sessions_user", columnList = "user_id"),
    @Index(name = "idx_sessions_token_hash", columnList = "token_hash", unique = true),
    @Index(name = "idx_sessions_expires_at", columnList = "expires_at"),
    @Index(name = "idx_sessions_is_active", columnList = "is_active"),
    @Index(name = "idx_sessions_last_activity", columnList = "last_activity_at"),
    @Index(name = "idx_sessions_user_active", columnList = "user_id, is_active")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false)
public class Session extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash; // SHA-256 hash of JWT token

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(name = "user_agent", length = 1000)
    private String userAgent; // Full User-Agent string

    @Column(name = "device_type", length = 50)
    private String deviceType; // Mobile, Desktop, Tablet

    @Column(name = "browser", length = 50)
    private String browser; // Chrome, Firefox, Safari

    @Column(name = "os", length = 50)
    private String os; // Windows, MacOS, Linux, Android, iOS

    @Column(name = "location", length = 100)
    private String location; // City/Country (optional, can add GeoIP later)

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "last_activity_at")
    private LocalDateTime lastActivityAt;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @Column(name = "revoked_by")
    private Long revokedBy; // User ID who revoked (self or admin)

    @Column(name = "revoke_reason", length = 255)
    private String revokeReason;
}
