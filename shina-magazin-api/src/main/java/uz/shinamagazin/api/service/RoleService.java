package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.RoleRequest;
import uz.shinamagazin.api.dto.response.RoleResponse;
import uz.shinamagazin.api.entity.Permission;
import uz.shinamagazin.api.entity.RoleEntity;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.PermissionRepository;
import uz.shinamagazin.api.repository.RoleRepository;
import uz.shinamagazin.api.repository.UserRepository;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoleService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditLogService auditLogService;

    /**
     * Get all active roles
     */
    public List<RoleResponse> getAllRoles() {
        return roleRepository.findByIsActiveTrueOrderByNameAsc().stream()
                .map(RoleResponse::simpleFrom)
                .collect(Collectors.toList());
    }

    /**
     * Get roles with pagination and search
     */
    public Page<RoleResponse> searchRoles(String search, Pageable pageable) {
        Page<RoleEntity> roles = (search != null && !search.isEmpty())
                ? roleRepository.searchRoles(search, pageable)
                : roleRepository.findAllActive(pageable);
        return roles.map(RoleResponse::simpleFrom);
    }

    /**
     * Get role by ID with permissions
     */
    public RoleResponse getRoleById(Long id) {
        RoleEntity role = roleRepository.findByIdWithPermissions(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rol", "id", id));
        return RoleResponse.fromWithoutUsers(role);
    }

    /**
     * Get role by code
     */
    public RoleResponse getRoleByCode(String code) {
        RoleEntity role = roleRepository.findByCodeWithPermissions(code)
                .orElseThrow(() -> new ResourceNotFoundException("Rol", "kod", code));
        return RoleResponse.fromWithoutUsers(role);
    }

    /**
     * Create new role
     */
    @Transactional
    public RoleResponse createRole(RoleRequest request, Long currentUserId) {
        // Check if code already exists
        if (roleRepository.existsByCode(request.getCode())) {
            throw new BadRequestException("Bu rol kodi allaqachon mavjud: " + request.getCode());
        }

        // Check if name already exists
        if (roleRepository.existsByName(request.getName())) {
            throw new BadRequestException("Bu rol nomi allaqachon mavjud: " + request.getName());
        }

        // Get permissions
        Set<Permission> permissions = new HashSet<>();
        if (request.getPermissions() != null && !request.getPermissions().isEmpty()) {
            permissions = permissionRepository.findByCodeIn(request.getPermissions());
            if (permissions.size() != request.getPermissions().size()) {
                throw new BadRequestException("Ba'zi permission kodlari noto'g'ri");
            }
        }

        RoleEntity role = RoleEntity.builder()
                .name(request.getName())
                .code(request.getCode())
                .description(request.getDescription())
                .isSystem(false)
                .isActive(true)
                .permissions(permissions)
                .build();

        role = roleRepository.save(role);

        // Log audit
        auditLogService.log("ROLE", role.getId(), "CREATE", null, role, currentUserId);

        log.info("Role created: {} by user {}", role.getCode(), currentUserId);
        return RoleResponse.fromWithoutUsers(role);
    }

    /**
     * Update existing role.
     * System roles can only have their permissions updated, not name/code/description.
     */
    @Transactional
    public RoleResponse updateRole(Long id, RoleRequest request, Long currentUserId) {
        RoleEntity role = roleRepository.findByIdWithPermissions(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rol", "id", id));

        // Store old state for audit
        RoleEntity oldRole = cloneRole(role);

        // Get new permissions
        Set<Permission> permissions = new HashSet<>();
        if (request.getPermissions() != null && !request.getPermissions().isEmpty()) {
            permissions = permissionRepository.findByCodeIn(request.getPermissions());
            if (permissions.size() != request.getPermissions().size()) {
                throw new BadRequestException("Ba'zi permission kodlari noto'g'ri");
            }
        }

        // System roles: only permissions can be updated
        if (role.getIsSystem()) {
            role.setPermissions(permissions);
            log.info("System role permissions updated: {} by user {}", role.getCode(), currentUserId);
        } else {
            // Non-system roles: all fields can be updated
            // Check code uniqueness
            if (!role.getCode().equals(request.getCode()) && roleRepository.existsByCode(request.getCode())) {
                throw new BadRequestException("Bu rol kodi allaqachon mavjud: " + request.getCode());
            }

            // Check name uniqueness
            if (!role.getName().equals(request.getName()) && roleRepository.existsByName(request.getName())) {
                throw new BadRequestException("Bu rol nomi allaqachon mavjud: " + request.getName());
            }

            role.setName(request.getName());
            role.setCode(request.getCode());
            role.setDescription(request.getDescription());
            role.setPermissions(permissions);
        }

        role = roleRepository.save(role);

        // Clear permissions cache for all users with this role
        permissionService.clearUserPermissionsCache();

        // Log audit
        auditLogService.log("ROLE", role.getId(), "UPDATE", oldRole, role, currentUserId);

        log.info("Role updated: {} by user {}", role.getCode(), currentUserId);
        return RoleResponse.fromWithoutUsers(role);
    }

    /**
     * Delete role (soft delete)
     */
    @Transactional
    public void deleteRole(Long id, Long currentUserId) {
        RoleEntity role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rol", "id", id));

        // System roles cannot be deleted
        if (role.getIsSystem()) {
            throw new BadRequestException("Tizim rollarini o'chirish mumkin emas");
        }

        // Check if role has users
        if (!role.getUsers().isEmpty()) {
            throw new BadRequestException("Bu rol foydalanuvchilarga biriktirilgan. Avval foydalanuvchilardan olib tashlang.");
        }

        RoleEntity oldRole = cloneRole(role);
        role.setIsActive(false);
        roleRepository.save(role);

        // Log audit
        auditLogService.log("ROLE", role.getId(), "DELETE", oldRole, role, currentUserId);

        log.info("Role deleted: {} by user {}", role.getCode(), currentUserId);
    }

    /**
     * Assign role to user
     */
    @Transactional
    public void assignRoleToUser(Long userId, Long roleId, Long currentUserId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi", "id", userId));

        RoleEntity role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Rol", "id", roleId));

        if (!role.getIsActive()) {
            throw new BadRequestException("Bu rol faol emas");
        }

        user.getRoles().add(role);
        userRepository.save(user);

        // Clear user's permissions cache
        permissionService.clearUserPermissionsCache(userId);

        // Log audit
        auditLogService.log("USER_ROLE", userId, "ASSIGN",
                null, "Role assigned: " + role.getCode(), currentUserId);

        log.info("Role {} assigned to user {} by user {}", role.getCode(), userId, currentUserId);
    }

    /**
     * Remove role from user
     */
    @Transactional
    public void removeRoleFromUser(Long userId, Long roleId, Long currentUserId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi", "id", userId));

        RoleEntity role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Rol", "id", roleId));

        user.getRoles().remove(role);
        userRepository.save(user);

        // Clear user's permissions cache
        permissionService.clearUserPermissionsCache(userId);

        // Log audit
        auditLogService.log("USER_ROLE", userId, "REMOVE",
                "Role removed: " + role.getCode(), null, currentUserId);

        log.info("Role {} removed from user {} by user {}", role.getCode(), userId, currentUserId);
    }

    /**
     * Get roles assigned to a user
     */
    public List<RoleResponse> getUserRoles(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi", "id", userId));

        return user.getRoles().stream()
                .filter(RoleEntity::getIsActive)
                .map(RoleResponse::simpleFrom)
                .collect(Collectors.toList());
    }

    private RoleEntity cloneRole(RoleEntity role) {
        RoleEntity clone = RoleEntity.builder()
                .name(role.getName())
                .code(role.getCode())
                .description(role.getDescription())
                .isSystem(role.getIsSystem())
                .isActive(role.getIsActive())
                .build();
        clone.setId(role.getId());
        return clone;
    }
}
