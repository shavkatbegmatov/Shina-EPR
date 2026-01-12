package uz.shinamagazin.api.entity;

import jakarta.persistence.*;
import lombok.*;
import uz.shinamagazin.api.entity.base.BaseEntity;
import uz.shinamagazin.api.enums.Role;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends BaseEntity {

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
}
