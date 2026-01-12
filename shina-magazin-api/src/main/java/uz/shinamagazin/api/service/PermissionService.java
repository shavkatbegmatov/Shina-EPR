package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.response.PermissionResponse;
import uz.shinamagazin.api.entity.Permission;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.repository.PermissionRepository;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PermissionService {

    private final PermissionRepository permissionRepository;

    /**
     * Get all permissions grouped by module
     */
    public Map<String, List<PermissionResponse>> getAllPermissionsGrouped() {
        return permissionRepository.findAllOrderByModuleAndAction().stream()
                .map(PermissionResponse::from)
                .collect(Collectors.groupingBy(PermissionResponse::getModule));
    }

    /**
     * Get all permissions as flat list
     */
    public List<PermissionResponse> getAllPermissions() {
        return permissionRepository.findAllOrderByModuleAndAction().stream()
                .map(PermissionResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * Get all available modules
     */
    public List<String> getAllModules() {
        return permissionRepository.findAllModules();
    }

    /**
     * Get permissions for a specific user (cached)
     */
    @Cacheable(value = "userPermissions", key = "#userId")
    public Set<String> getUserPermissionCodes(Long userId) {
        log.debug("Loading permissions for user: {}", userId);
        return permissionRepository.findByUserId(userId).stream()
                .map(Permission::getCode)
                .collect(Collectors.toSet());
    }

    /**
     * Check if user has a specific permission (cached)
     */
    @Cacheable(value = "userPermissionCheck", key = "#userId + '_' + #permissionCode.name()")
    public boolean hasPermission(Long userId, PermissionCode permissionCode) {
        Set<String> permissions = getUserPermissionCodes(userId);
        return permissions.contains(permissionCode.getCode());
    }

    /**
     * Check if user has a specific permission by code string
     */
    public boolean hasPermission(Long userId, String permissionCode) {
        Set<String> permissions = getUserPermissionCodes(userId);
        return permissions.contains(permissionCode);
    }

    /**
     * Check if user has any of the given permissions
     */
    public boolean hasAnyPermission(Long userId, PermissionCode... permissionCodes) {
        Set<String> userPermissions = getUserPermissionCodes(userId);
        for (PermissionCode code : permissionCodes) {
            if (userPermissions.contains(code.getCode())) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if user has all of the given permissions
     */
    public boolean hasAllPermissions(Long userId, PermissionCode... permissionCodes) {
        Set<String> userPermissions = getUserPermissionCodes(userId);
        for (PermissionCode code : permissionCodes) {
            if (!userPermissions.contains(code.getCode())) {
                return false;
            }
        }
        return true;
    }

    /**
     * Clear user permissions cache
     */
    @CacheEvict(value = {"userPermissions", "userPermissionCheck"}, allEntries = true)
    public void clearUserPermissionsCache() {
        log.info("Clearing all user permissions cache");
    }

    /**
     * Clear specific user's permissions cache
     */
    @CacheEvict(value = {"userPermissions", "userPermissionCheck"}, key = "#userId")
    public void clearUserPermissionsCache(Long userId) {
        log.info("Clearing permissions cache for user: {}", userId);
    }

    /**
     * Find permissions by codes
     */
    @Transactional(readOnly = true)
    public Set<Permission> findByCodeIn(Set<String> codes) {
        return permissionRepository.findByCodeIn(codes);
    }
}
