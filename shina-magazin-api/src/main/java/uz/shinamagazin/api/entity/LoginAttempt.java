package uz.shinamagazin.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.shinamagazin.api.audit.Auditable;
import uz.shinamagazin.api.audit.AuditEntityListener;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "login_attempts", indexes = {
    @Index(name = "idx_login_attempts_username", columnList = "username"),
    @Index(name = "idx_login_attempts_ip", columnList = "ip_address"),
    @Index(name = "idx_login_attempts_created", columnList = "created_at"),
    @Index(name = "idx_login_attempts_status", columnList = "status"),
    @Index(name = "idx_login_attempts_user_status", columnList = "user_id, status"),
    @Index(name = "idx_login_attempts_ip_status_time", columnList = "ip_address, status, created_at"),
    @Index(name = "idx_login_attempts_username_status_time", columnList = "username, status, created_at")
})
@EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginAttempt implements Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // User info (nullable - user might not exist)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "username", nullable = false, length = 100)
    private String username; // Store even if user not found

    // Request info
    @Column(name = "ip_address", nullable = false, length = 50)
    private String ipAddress;

    @Column(name = "user_agent", length = 1000)
    private String userAgent;

    @Column(name = "device_type", length = 50)
    private String deviceType; // Mobile, Desktop, Tablet

    @Column(name = "browser", length = 50)
    private String browser;

    @Column(name = "os", length = 50)
    private String os;

    @Column(name = "location", length = 100)
    private String location; // City/Country (optional)

    // Attempt result
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private LoginStatus status; // SUCCESS, FAILED

    @Enumerated(EnumType.STRING)
    @Column(name = "failure_reason", length = 50)
    private FailureReason failureReason; // INVALID_PASSWORD, USER_NOT_FOUND, ACCOUNT_LOCKED, etc.

    @Column(name = "failure_message", length = 255)
    private String failureMessage; // Detailed error message

    // Link to session if successful
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    private Session session;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    // ============================================
    // Auditable Interface Implementation
    // ============================================

    @Override
    public String getEntityName() {
        return "LoginAttempt";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", getId());
        map.put("username", this.username);
        map.put("ipAddress", this.ipAddress);
        map.put("userAgent", this.userAgent);
        map.put("deviceType", this.deviceType);
        map.put("browser", this.browser);
        map.put("os", this.os);
        map.put("location", this.location);
        map.put("status", this.status);
        map.put("failureReason", this.failureReason);
        map.put("failureMessage", this.failureMessage);
        map.put("createdAt", this.createdAt);

        // Avoid lazy loading
        if (this.user != null) {
            map.put("userId", this.user.getId());
        }
        if (this.session != null) {
            map.put("sessionId", this.session.getId());
        }

        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of(); // No sensitive fields
    }

    // ============================================
    // Enums
    // ============================================

    public enum LoginStatus {
        SUCCESS,
        FAILED
    }

    public enum FailureReason {
        INVALID_PASSWORD,
        USER_NOT_FOUND,
        ACCOUNT_LOCKED,
        ACCOUNT_DISABLED,
        INVALID_CREDENTIALS,
        SESSION_LIMIT_EXCEEDED,
        TOO_MANY_ATTEMPTS,
        OTHER
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
