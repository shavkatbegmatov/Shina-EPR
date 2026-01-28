package uz.shinamagazin.api.security;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import uz.shinamagazin.api.entity.RoleEntity;
import uz.shinamagazin.api.entity.User;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Getter
@Slf4j
public class CustomUserDetails implements UserDetails {

    private final User user;
    private final Set<String> permissions;
    private final Set<String> roleCodes;

    public CustomUserDetails(User user) {
        this.user = user;
        this.permissions = new HashSet<>();
        this.roleCodes = new HashSet<>();

        // Extract permissions and role codes from user's roles
        log.debug("Creating CustomUserDetails for user: {}, roles count: {}",
                user.getUsername(), user.getRoles().size());

        for (RoleEntity role : user.getRoles()) {
            log.debug("Processing role: {} (active: {})", role.getCode(), role.getIsActive());
            if (role.getIsActive()) {
                roleCodes.add(role.getCode());
                role.getPermissions().forEach(p -> permissions.add(p.getCode()));
                log.debug("Added role: {}, permissions count: {}",
                        role.getCode(), role.getPermissions().size());
            }
        }

        // Fallback to legacy role if no new roles assigned
        if (roleCodes.isEmpty() && user.getRole() != null) {
            log.warn("No RBAC roles found for user: {}, falling back to legacy role: {}",
                    user.getUsername(), user.getRole().name());
            roleCodes.add(user.getRole().name());
        }

        log.info("CustomUserDetails created for user: {}, roleCodes: {}, permissions count: {}",
                user.getUsername(), roleCodes, permissions.size());
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        Set<GrantedAuthority> authorities = new HashSet<>();

        // Add role authorities (prefixed with ROLE_)
        for (String roleCode : roleCodes) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + roleCode));
            log.debug("Added authority: ROLE_{}", roleCode);
        }

        // Add permission authorities (prefixed with PERM_)
        for (String permission : permissions) {
            authorities.add(new SimpleGrantedAuthority("PERM_" + permission));
        }

        log.debug("Total authorities for user {}: {}", user.getUsername(), authorities.size());
        return authorities;
    }

    @Override
    public String getPassword() {
        return user.getPassword();
    }

    @Override
    public String getUsername() {
        return user.getUsername();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return user.getActive();
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return user.getActive();
    }

    public Long getId() {
        return user.getId();
    }

    public String getFullName() {
        return user.getFullName();
    }

    /**
     * Check if user has a specific permission
     */
    public boolean hasPermission(String permissionCode) {
        return permissions.contains(permissionCode);
    }

    /**
     * Check if user has any of the specified permissions
     */
    public boolean hasAnyPermission(String... permissionCodes) {
        for (String code : permissionCodes) {
            if (permissions.contains(code)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if user has all of the specified permissions
     */
    public boolean hasAllPermissions(String... permissionCodes) {
        for (String code : permissionCodes) {
            if (!permissions.contains(code)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Get primary role code (first one if multiple)
     */
    public String getPrimaryRoleCode() {
        return roleCodes.isEmpty() ? null : roleCodes.iterator().next();
    }
}
