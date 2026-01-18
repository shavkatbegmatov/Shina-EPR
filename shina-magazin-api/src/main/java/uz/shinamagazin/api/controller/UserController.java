package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.CredentialsInfo;
import uz.shinamagazin.api.dto.response.UserActivityResponse;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.security.RequiresPermission;
import uz.shinamagazin.api.service.AuditLogService;
import uz.shinamagazin.api.service.UserService;

import java.time.LocalDateTime;

/**
 * Controller for user management operations.
 * Used by admins to reset passwords and manage user accounts.
 */
@RestController
@RequestMapping("/v1/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "Foydalanuvchilar boshqaruvi API")
public class UserController {

    private final UserService userService;
    private final AuditLogService auditLogService;

    @PutMapping("/{id}/reset-password")
    @Operation(summary = "Reset user password", description = "Foydalanuvchi parolini reset qilish (admin)")
    @RequiresPermission(PermissionCode.USERS_UPDATE)
    public ResponseEntity<ApiResponse<CredentialsInfo>> resetPassword(@PathVariable Long id) {
        CredentialsInfo credentials = userService.resetPassword(id);
        return ResponseEntity.ok(ApiResponse.success("Parol reset qilindi", credentials));
    }

    @PutMapping("/{id}/deactivate")
    @Operation(summary = "Deactivate user", description = "Foydalanuvchini o'chirish")
    @RequiresPermission(PermissionCode.USERS_DELETE)
    public ResponseEntity<ApiResponse<Void>> deactivateUser(@PathVariable Long id) {
        userService.deactivateUser(id);
        return ResponseEntity.ok(ApiResponse.success("Foydalanuvchi o'chirildi"));
    }

    @PutMapping("/{id}/activate")
    @Operation(summary = "Activate user", description = "Foydalanuvchini aktivlashtirish")
    @RequiresPermission(PermissionCode.USERS_UPDATE)
    public ResponseEntity<ApiResponse<Void>> activateUser(@PathVariable Long id) {
        userService.activateUser(id);
        return ResponseEntity.ok(ApiResponse.success("Foydalanuvchi aktivlashtirildi"));
    }

    @GetMapping("/{userId}/activity")
    @Operation(summary = "Get user activity history", description = "Foydalanuvchi faoliyat tarixini olish")
    @RequiresPermission(PermissionCode.USERS_VIEW)
    public ResponseEntity<ApiResponse<Page<UserActivityResponse>>> getUserActivity(
            @PathVariable Long userId,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<UserActivityResponse> activity = auditLogService.getUserActivity(
                userId, entityType, action, startDate, endDate, pageable
        );
        return ResponseEntity.ok(ApiResponse.success(activity));
    }
}
