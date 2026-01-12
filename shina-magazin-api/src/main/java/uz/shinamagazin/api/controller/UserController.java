package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.CredentialsInfo;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.security.RequiresPermission;
import uz.shinamagazin.api.service.UserService;

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
}
