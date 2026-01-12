package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.request.RoleRequest;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.RoleResponse;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.security.CustomUserDetails;
import uz.shinamagazin.api.security.RequiresPermission;
import uz.shinamagazin.api.service.RoleService;

import java.util.List;

@RestController
@RequestMapping("/v1/roles")
@RequiredArgsConstructor
@Tag(name = "Roles", description = "Rollar API")
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    @Operation(summary = "Get all roles", description = "Barcha faol rollarni olish")
    @RequiresPermission(PermissionCode.ROLES_VIEW)
    public ResponseEntity<ApiResponse<List<RoleResponse>>> getAllRoles() {
        return ResponseEntity.ok(ApiResponse.success(roleService.getAllRoles()));
    }

    @GetMapping("/search")
    @Operation(summary = "Search roles with pagination", description = "Rollarni qidirish va sahifalash")
    @RequiresPermission(PermissionCode.ROLES_VIEW)
    public ResponseEntity<ApiResponse<Page<RoleResponse>>> searchRoles(
            @RequestParam(required = false) String search,
            @PageableDefault(size = 10) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.success(roleService.searchRoles(search, pageable)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get role by ID", description = "ID bo'yicha rolni olish")
    @RequiresPermission(PermissionCode.ROLES_VIEW)
    public ResponseEntity<ApiResponse<RoleResponse>> getRoleById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(roleService.getRoleById(id)));
    }

    @GetMapping("/code/{code}")
    @Operation(summary = "Get role by code", description = "Kod bo'yicha rolni olish")
    @RequiresPermission(PermissionCode.ROLES_VIEW)
    public ResponseEntity<ApiResponse<RoleResponse>> getRoleByCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.success(roleService.getRoleByCode(code)));
    }

    @PostMapping
    @Operation(summary = "Create role", description = "Yangi rol yaratish")
    @RequiresPermission(PermissionCode.ROLES_CREATE)
    public ResponseEntity<ApiResponse<RoleResponse>> createRole(
            @Valid @RequestBody RoleRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        RoleResponse role = roleService.createRole(request, userDetails.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Rol yaratildi", role));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update role", description = "Rolni yangilash")
    @RequiresPermission(PermissionCode.ROLES_UPDATE)
    public ResponseEntity<ApiResponse<RoleResponse>> updateRole(
            @PathVariable Long id,
            @Valid @RequestBody RoleRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        RoleResponse role = roleService.updateRole(id, request, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Rol yangilandi", role));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete role", description = "Rolni o'chirish")
    @RequiresPermission(PermissionCode.ROLES_DELETE)
    public ResponseEntity<ApiResponse<Void>> deleteRole(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        roleService.deleteRole(id, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Rol o'chirildi"));
    }

    @PostMapping("/{roleId}/users/{userId}")
    @Operation(summary = "Assign role to user", description = "Foydalanuvchiga rol biriktirish")
    @RequiresPermission(PermissionCode.USERS_CHANGE_ROLE)
    public ResponseEntity<ApiResponse<Void>> assignRoleToUser(
            @PathVariable Long roleId,
            @PathVariable Long userId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        roleService.assignRoleToUser(userId, roleId, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Rol biriktirildi"));
    }

    @DeleteMapping("/{roleId}/users/{userId}")
    @Operation(summary = "Remove role from user", description = "Foydalanuvchidan rolni olib tashlash")
    @RequiresPermission(PermissionCode.USERS_CHANGE_ROLE)
    public ResponseEntity<ApiResponse<Void>> removeRoleFromUser(
            @PathVariable Long roleId,
            @PathVariable Long userId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        roleService.removeRoleFromUser(userId, roleId, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Rol olib tashlandi"));
    }

    @GetMapping("/users/{userId}")
    @Operation(summary = "Get user roles", description = "Foydalanuvchining rollarini olish")
    @RequiresPermission(PermissionCode.USERS_VIEW)
    public ResponseEntity<ApiResponse<List<RoleResponse>>> getUserRoles(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.success(roleService.getUserRoles(userId)));
    }
}
