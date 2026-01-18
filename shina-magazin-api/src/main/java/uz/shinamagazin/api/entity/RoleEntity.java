package uz.shinamagazin.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.shinamagazin.api.audit.Auditable;
import uz.shinamagazin.api.audit.AuditEntityListener;
import uz.shinamagazin.api.entity.base.BaseEntity;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "roles")
@EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoleEntity extends BaseEntity implements Auditable {

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(length = 500)
    private String description;

    @Column(name = "is_system", nullable = false)
    @Builder.Default
    private Boolean isSystem = false;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "role_permissions",
        joinColumns = @JoinColumn(name = "role_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    @Builder.Default
    private Set<Permission> permissions = new HashSet<>();

    @ManyToMany(mappedBy = "roles", fetch = FetchType.LAZY)
    @Builder.Default
    private Set<User> users = new HashSet<>();

    // ============================================
    // Auditable Interface Implementation
    // ============================================

    @Override
    public String getEntityName() {
        return "Role";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", this.id);
        map.put("name", this.name);
        map.put("code", this.code);
        map.put("description", this.description);
        map.put("isSystem", this.isSystem);
        map.put("isActive", this.isActive);

        // Include permission count but avoid lazy loading full collection
        if (this.permissions != null) {
            map.put("permissionCount", this.permissions.size());
        }

        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of(); // No sensitive fields
    }
}
