package uz.shinamagazin.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.shinamagazin.api.audit.Auditable;
import uz.shinamagazin.api.audit.AuditEntityListener;
import uz.shinamagazin.api.entity.base.BaseEntity;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "sessions", indexes = {
    @Index(name = "idx_sessions_user", columnList = "user_id"),
    @Index(name = "idx_sessions_token_hash", columnList = "token_hash", unique = true),
    @Index(name = "idx_sessions_expires_at", columnList = "expires_at"),
    @Index(name = "idx_sessions_is_active", columnList = "is_active"),
    @Index(name = "idx_sessions_last_activity", columnList = "last_activity_at"),
    @Index(name = "idx_sessions_user_active", columnList = "user_id, is_active")
})
@EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false)
public class Session extends BaseEntity implements Auditable {

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

    // ============================================
    // Auditable Interface Implementation
    // ============================================

    @Override
    public String getEntityName() {
        return "Session";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", getId());
        map.put("tokenHash", this.tokenHash); // Will be masked
        map.put("ipAddress", this.ipAddress);
        map.put("userAgent", this.userAgent);
        map.put("deviceType", this.deviceType);
        map.put("browser", this.browser);
        map.put("os", this.os);
        map.put("location", this.location);
        map.put("expiresAt", this.expiresAt);
        map.put("lastActivityAt", this.lastActivityAt);
        map.put("isActive", this.isActive);
        map.put("revokedAt", this.revokedAt);
        map.put("revokedBy", this.revokedBy);
        map.put("revokeReason", this.revokeReason);

        // Avoid lazy loading
        if (this.user != null) {
            map.put("userId", this.user.getId());
        }

        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of("tokenHash"); // Mask token hash
    }
}
