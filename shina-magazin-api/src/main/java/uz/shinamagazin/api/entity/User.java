package uz.shinamagazin.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.Hibernate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.shinamagazin.api.audit.Auditable;
import uz.shinamagazin.api.audit.AuditEntityListener;
import uz.shinamagazin.api.entity.base.BaseEntity;
import uz.shinamagazin.api.enums.Role;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "users")
@EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends BaseEntity implements Auditable {

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(length = 100)
    private String email;

    @Column(length = 20)
    private String phone;

    /**
     * @deprecated Use roles field instead. This is kept for backward compatibility.
     */
    @Deprecated
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "must_change_password")
    @Builder.Default
    private Boolean mustChangePassword = false;

    @Column(name = "password_changed_at")
    private LocalDateTime passwordChangedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    @Builder.Default
    private Set<RoleEntity> roles = new HashSet<>();

    /**
     * Get all permission codes from all assigned roles
     */
    public Set<String> getPermissionCodes() {
        Set<String> permissions = new HashSet<>();
        for (RoleEntity roleEntity : roles) {
            for (Permission permission : roleEntity.getPermissions()) {
                permissions.add(permission.getCode());
            }
        }
        return permissions;
    }

    /**
     * Check if user has a specific permission
     */
    public boolean hasPermission(String permissionCode) {
        return getPermissionCodes().contains(permissionCode);
    }

    // ============================================
    // Auditable Interface Implementation
    // ============================================

    @Override
    public String getEntityName() {
        return "User";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", getId());
        map.put("username", this.username);
        map.put("fullName", this.fullName);
        map.put("email", this.email);
        map.put("phone", this.phone);
        map.put("active", this.active);
        map.put("mustChangePassword", this.mustChangePassword);
        map.put("password", this.password); // Will be masked by SensitiveDataMasker

        // Include simple fields only - avoid lazy collections
        if (this.createdBy != null) {
            map.put("createdById", this.createdBy.getId());
        }

        // Include role names for audit trail (with lazy loading safety)
        if (this.roles != null && Hibernate.isInitialized(this.roles) && !this.roles.isEmpty()) {
            map.put("roles", this.roles.stream()
                    .map(RoleEntity::getName)
                    .sorted()
                    .toList());
        } else {
            map.put("roles", Collections.emptyList());
        }

        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of("password");
    }
}
